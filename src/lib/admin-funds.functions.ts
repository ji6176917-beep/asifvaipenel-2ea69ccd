import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

const TABS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

export const adminListDeposits = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ tab: z.enum(TABS), q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    let q = db.from("deposits").select("*, payment_methods(logo_url)").is("deleted_at", null)
      .order("created_at", { ascending: false }).limit(300);
    if (data.tab !== "all") q = q.eq("status", data.tab);
    const term = data.q?.trim().replace(/[%,()*]/g, "");
    if (term) {
      const { data: users } = await db.from("profiles").select("id")
        .or(`public_id.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%,email.ilike.%${term}%`).limit(200);
      const ids = (users ?? []).map((u) => u.id);
      q = q.or([`code.ilike.%${term}%`, `txn_id.ilike.%${term}%`, ids.length ? `user_id.in.(${ids.join(",")})` : null].filter(Boolean).join(","));
    }
    const [{ data: rows, error }, counts] = await Promise.all([
      q,
      Promise.all(["pending", "approved", "rejected", "cancelled"].map((st) =>
        db.from("deposits").select("id", { count: "exact", head: true }).eq("status", st as never).is("deleted_at", null).then((r) => [st, r.count ?? 0] as const))),
    ]);
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const uids = [...new Set(list.map((d) => d.user_id))];
    const { data: profs } = uids.length
      ? await db.from("profiles").select("id, full_name, username, email, public_id").in("id", uids)
      : { data: [] as { id: string; full_name: string; username: string; email: string | null; public_id: string }[] };
    const pm = new Map((profs ?? []).map((p) => [p.id, p]));
    const paths = list.map((d) => d.screenshot_path).filter(Boolean) as string[];
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await db.storage.from("payment-proofs").createSignedUrls(paths, 3600);
      for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
    return {
      counts: Object.fromEntries(counts) as Record<string, number>,
      rows: list.map((d) => ({
        ...d,
        logo_url: (d as { payment_methods?: { logo_url: string | null } | null }).payment_methods?.logo_url ?? null,
        user: pm.get(d.user_id) ?? null,
        screenshot_url: d.screenshot_path ? signed.get(d.screenshot_path) ?? null : null,
      })),
    };
  });

export const adminReviewDeposit = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid(), action: z.enum(["approve", "reject", "reverse"]), note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("deposits").select("code, status, amount, user_id").eq("id", data.id).maybeSingle();
    const { data: r, error } = await db.rpc("admin_review_deposit", { _deposit_id: data.id, _action: data.action, _note: data.note ?? "" });
    if (error) {
      const m = error.message;
      throw new Error(m.includes("INVALID_TRANSITION") ? "This request was already handled — refresh."
        : m.includes("INSUFFICIENT_BALANCE") ? "User balance too low to reverse this credit." : "Action failed");
    }
    await s.logAdmin(`deposit_${data.action}`, { code: before?.code, note: data.note }, before, r);
    return r as { status: string; delta: number };
  });

/* ---------------- Payment methods & settings ---------------- */

export const adminListMethods = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const [{ data: methods, error }, { data: set }] = await Promise.all([
    db.from("payment_methods").select("*").is("deleted_at", null).order("sort"),
    db.from("site_settings").select("bdt_rate, deposit_min, deposit_max, require_screenshot").eq("id", 1).single(),
  ]);
  if (error) throw new Error(error.message);
  return { methods: methods ?? [], settings: set! };
});

const methodInput = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(["binance", "usdt", "p2p"]),
  name: z.string().trim().min(1).max(60),
  account: z.string().trim().min(1).max(200),
  network: z.string().trim().max(40).nullable().default(null),
  account_type: z.string().trim().max(40).nullable().default(null),
  min_amount: z.number().min(0).max(1_000_000),
  max_amount: z.number().min(0).max(1_000_000),
  instructions: z.string().max(2000).nullable().default(null),
  sort: z.number().int().min(0).max(10000),
  active: z.boolean(),
  logo_url: z.string().max(300).nullable().default(null),
}).refine((m) => m.max_amount >= m.min_amount, { message: "Max must be ≥ min" });

export const adminSaveMethod = createServerFn({ method: "POST" })
  .inputValidator((d) => methodInput.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { id, ...row } = data;
    if (id) {
      const { data: before } = await db.from("payment_methods").select("*").eq("id", id).single();
      const { error } = await db.from("payment_methods").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      await s.logAdmin("payment_method_updated", { name: row.name }, before, row);
    } else {
      const { error } = await db.from("payment_methods").insert(row);
      if (error) throw new Error(error.message);
      await s.logAdmin("payment_method_added", { name: row.name }, null, row);
    }
    return { ok: true };
  });

export const adminToggleMethod = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { error } = await db.from("payment_methods").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await s.logAdmin("payment_method_toggled", data, { active: !data.active }, { active: data.active });
    return { ok: true };
  });

export const adminDeleteMethod = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("payment_methods").select("*").eq("id", data.id).single();
    const { error } = await db.from("payment_methods").update({ deleted_at: new Date().toISOString(), active: false }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await s.logAdmin("payment_method_deleted", { name: before?.name }, before, null);
    return { ok: true };
  });

export const adminUploadLogo = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ base64: z.string().max(1_500_000), type: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const ext = data.type === "image/svg+xml" ? "svg" : data.type.split("/")[1];
    const path = `methods/${crypto.randomUUID()}.${ext}`;
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const { error } = await db.storage.from("logos").upload(path, bytes, { contentType: data.type });
    if (error) throw new Error(error.message);
    return { path };
  });

export const adminSaveFundSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    bdt_rate: z.number().min(1).max(10000), deposit_min: z.number().min(0).max(1_000_000),
    deposit_max: z.number().min(0).max(1_000_000), require_screenshot: z.boolean(),
  }).refine((v) => v.deposit_max >= v.deposit_min, { message: "Max must be ≥ min" }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("site_settings").select("bdt_rate, deposit_min, deposit_max, require_screenshot").eq("id", 1).single();
    const { error } = await db.from("site_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    await s.logAdmin("fund_settings_updated", {}, before, data);
    return { ok: true };
  });
