import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

/** Active platforms with their pending-order counts. */
export const adminOrderPlatforms = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const [{ data: plats }, { data: pend }] = await Promise.all([
    db.from("platforms").select("id, slug, name, sort").is("deleted_at", null).order("sort"),
    db.from("orders").select("platform_slug").eq("status", "pending").is("deleted_at", null).limit(10000),
  ]);
  const counts: Record<string, number> = {};
  for (const o of pend ?? []) counts[o.platform_slug] = (counts[o.platform_slug] ?? 0) + 1;
  return (plats ?? []).map((p) => ({ slug: p.slug, name: p.name, pending: counts[p.slug] ?? 0 }));
});

const listInput = z.object({
  platform: z.string().max(60).optional(),
  source: z.enum(["web", "api"]).optional(),
  tab: z.enum(["pending", "processing", "completed", "partial", "rejected", "all"]),
  q: z.string().max(100).optional(),
  from: z.string().max(10).optional(),
  to: z.string().max(10).optional(),
});

async function fetchOrders(db: Awaited<ReturnType<typeof ctx>>["db"], data: z.infer<typeof listInput>, limit: number) {
  let q = db.from("orders").select("*").is("deleted_at", null)
    .order("created_at", { ascending: false }).limit(limit);
  if (data.platform) q = q.eq("platform_slug", data.platform);
  if (data.source) q = q.eq("source", data.source);
  if (data.tab === "rejected") q = q.in("status", ["rejected", "canceled"]);
  else if (data.tab !== "all") q = q.eq("status", data.tab);
  if (data.from) q = q.gte("created_at", `${data.from}T00:00:00Z`);
  if (data.to) q = q.lte("created_at", `${data.to}T23:59:59Z`);
  const term = data.q?.trim().replace(/[%,()*]/g, "");
  if (term) {
    const { data: users } = await db.from("profiles").select("id")
      .or(`public_id.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(200);
    const ids = (users ?? []).map((u) => u.id);
    q = q.or([`order_code.ilike.%${term}%`, ids.length ? `user_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
  }
  const { data: orders, error } = await q;
  if (error) throw new Error(error.message);
  const list = orders ?? [];
  const uids = [...new Set(list.map((o) => o.user_id))];
  const oids = list.map((o) => o.id);
  const [{ data: profs }, { data: hist }] = await Promise.all([
    uids.length ? db.from("profiles").select("id, full_name, username, public_id").in("id", uids) : Promise.resolve({ data: [] as { id: string; full_name: string | null; username: string; public_id: string }[] }),
    oids.length ? db.from("order_status_history").select("*").in("order_id", oids).order("created_at") : Promise.resolve({ data: [] as never[] }),
  ]);
  const pm = new Map((profs ?? []).map((p) => [p.id, p]));
  return list.map((o) => ({
    ...o,
    user: pm.get(o.user_id) ?? null,
    history: (hist ?? []).filter((h: { order_id: string }) => h.order_id === o.id),
  }));
}

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    return fetchOrders(db, data, 300);
  });

export const adminExportOrdersCsv = createServerFn({ method: "POST" })
  .inputValidator((d) => listInput.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const rows = await fetchOrders(db, data, 5000);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Order ID", "Source", "User", "User ID", "Platform", "Category", "Service", "Quantity", "Delivered", "Charge", "Refunded", "Status", "Link", "Created"];
    const lines = rows.map((o) => [o.order_code, o.source, o.user?.full_name ?? o.user?.username, o.user?.public_id, o.platform_name, o.category_name, o.service_name,
      o.quantity, o.delivered_qty, o.charge, o.refunded, o.status, o.link, o.created_at].map(esc).join(","));
    await s.logAdmin("orders_exported", { platform: data.platform, tab: data.tab, count: rows.length });
    return [head.join(","), ...lines].join("\n");
  });

const actionStatus = z.enum(["processing", "completed", "partial", "rejected"]);

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid(), status: actionStatus,
    delivered: z.number().int().min(1).optional(), note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("orders").select("order_code, user_id, status, refunded, delivered_qty, provider_id, dispatch_state").eq("id", data.id).maybeSingle();
    if (before?.provider_id && before.dispatch_state === "manual") {
      // Manual-approval provider orders: Accept dispatches to the provider API, Reject refunds in full.
      if (data.status === "processing") {
        const { dispatchProviderOrder } = await import("./providers.server");
        await dispatchProviderOrder(before.order_code, before.user_id, { fromStates: ["manual"] });
        const { data: after } = await db.from("orders").select("status, dispatch_state, provider_error").eq("id", data.id).single();
        await s.logAdmin("order_manual_dispatch", { order: before.order_code, note: data.note }, before, after);
        if (after?.dispatch_state !== "sent") throw new Error(after?.provider_error ?? "প্রোভাইডারে পাঠানো যায়নি");
        return { refund: 0, status: after.status };
      }
      if (data.status !== "rejected") throw new Error("এই অর্ডার প্রোভাইডার পরিচালনা করছে; শুধু Accept বা Reject করা যাবে");
    } else if (before?.provider_id) {
      throw new Error("এই অর্ডার প্রোভাইডার পরিচালনা করছে; এপিআই সার্ভিস থেকে অর্ডার আপডেট করুন");
    }
    const { data: r, error } = await db.rpc("admin_update_order_status", {
      _order_id: data.id, _status: data.status, _delivered: data.delivered ?? null as never, _note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    await s.logAdmin("order_status_changed", { order: before?.order_code, note: data.note }, before, r);
    return r as { refund: number; status: string };
  });

export const adminBulkUpdateOrders = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(200), status: z.enum(["processing", "rejected"]), note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    let ok = 0, failed = 0, refunded = 0;
    for (const id of data.ids) {
      const { data: order } = await db.from("orders").select("provider_id").eq("id", id).single();
      if (order?.provider_id) { failed++; continue; }
      const { data: r, error } = await db.rpc("admin_update_order_status", { _order_id: id, _status: data.status, _delivered: null as never, _note: data.note ?? "" });
      if (error) failed++; else { ok++; refunded += Number((r as { refund: number }).refund ?? 0); }
    }
    await s.logAdmin("orders_bulk_status", { status: data.status, ok, failed, refunded });
    return { ok, failed, refunded: Math.round(refunded * 100) / 100 };
  });
