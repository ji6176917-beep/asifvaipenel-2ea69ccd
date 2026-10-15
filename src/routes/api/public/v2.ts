import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
// Standard SMM API (PerfectPanel v2): every response is HTTP 200 JSON; errors are {"error": "..."}
const json = (body: unknown, _status = 200) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const ERR: Record<string, [string, number]> = {
  INSUFFICIENT_BALANCE: ["Insufficient balance. Add funds to your account first.", 402],
  QUANTITY_OUT_OF_RANGE: ["Quantity is outside the allowed min/max for this service.", 400],
  SERVICE_UNAVAILABLE: ["Service is inactive or does not exist.", 400],
  INVALID_LINK: ["Invalid link. Use a full https:// URL.", 400],
  API_DISABLED: ["API access is disabled for this account.", 403],
  ACCOUNT_SUSPENDED: ["Account is suspended.", 403],
  API_OFF: ["The API is currently turned off.", 503],
  BELOW_MIN_BALANCE: ["Your balance is below the minimum required for API orders. Add funds first.", 402],
  ORDERS_PAUSED: ["New orders are temporarily paused.", 503],
};

async function readParams(request: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((v, k) => (out[k] = v));
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") ?? "";
    try {
      if (ct.includes("application/json")) Object.assign(out, await request.json());
      else (await request.formData()).forEach((v, k) => (out[k] = String(v)));
    } catch { /* ignore malformed body */ }
  }
  return out;
}

async function handle(request: Request) {
  const p = await readParams(request);
  const key = z.string().min(10).max(200).safeParse(p["key"]);
  if (!key.success) return json({ error: "Invalid API key" }, 401);
  const action = String(p["action"] ?? "").toLowerCase();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { sha256, clientIp } = await import("@/lib/admin.server");

  const { data: prof } = await db.from("profiles").select("id,balance,api_enabled,banned,deleted_at")
    .eq("api_key_hash", await sha256(key.data)).maybeSingle();
  if (!prof) return json({ error: "Invalid API key" }, 401);
  if (!prof.api_enabled) return json({ error: "API access is disabled for this account." }, 403);
  if (prof.banned || prof.deleted_at) return json({ error: "Account is suspended." }, 403);

  const { data: set } = await db.from("site_settings").select("api_rate_per_min, api_global_enabled").eq("id", 1).maybeSingle();
  if (set && !set.api_global_enabled) return json({ error: "The API is currently turned off." }, 503);
  const limit = set?.api_rate_per_min ?? 60;
  const { count } = await db.from("api_requests").select("id", { count: "exact", head: true })
    .eq("user_id", prof.id).gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count ?? 0) >= limit) return json({ error: `Rate limit exceeded (${limit} requests per minute)` }, 429);
  await db.from("api_requests").insert({ user_id: prof.id, action: action || "unknown", ip: clientIp() });

  switch (action) {
    case "balance":
      return json({ balance: Number(prof.balance).toFixed(2), currency: "USD" });
    case "services": {
      const { data } = await db.from("services")
        .select("service_no,name,description,rate,rate_per,min_qty,max_qty,avg_time,refill_info,categories!inner(name,active,deleted_at,platforms!inner(name,active,deleted_at))")
        .eq("active", true).is("deleted_at", null).eq("categories.active", true).is("categories.deleted_at", null)
        .eq("categories.platforms.active", true).is("categories.platforms.deleted_at", null).order("sort");
      // Only live services: hidden/deleted services, categories or platforms never reach reseller panels.
      const live = (data ?? []).filter((s) => s.categories && s.categories.active && !s.categories.deleted_at
        && s.categories.platforms && s.categories.platforms.active && !s.categories.platforms.deleted_at);
      return json(live.map((s) => ({
        service: s.service_no, name: s.name, type: "Default",
        category: `${s.categories.platforms.name} - ${s.categories.name}`,
        rate: Number(s.rate).toString(), min: String(s.min_qty), max: String(s.max_qty),
        refill: !!s.refill_info, cancel: false,
      })));
    }
    case "add": {
      const v = z.object({ service: z.coerce.number().int().positive(), link: z.string().min(1).max(500), quantity: z.coerce.number().int().positive() }).safeParse(p);
      if (!v.success) {
        const miss = ["service", "link", "quantity"].find((k) => !p[k]);
        return json({ error: miss ? `Missing parameter: ${miss}` : "Incorrect request" });
      }
      const { data: svc } = await db.from("services").select("id").eq("service_no", v.data.service).is("deleted_at", null).maybeSingle();
      if (!svc) return json({ error: "Service is inactive or does not exist." }, 400);
      const { data, error } = await db.rpc("api_place_order", { _uid: prof.id, _service_id: svc.id, _link: v.data.link.trim(), _quantity: v.data.quantity });
      if (error) {
        const code = Object.keys(ERR).find((k) => error.message.includes(k));
        const e = code ? ERR[code] : undefined; if (e) return json({ error: e[0] }, e[1]);
        console.error("api add failed", error.message);
        return json({ error: "Could not place order" }, 500);
      }
      const r = data as { order: string; charge: number; balance: number };
      const { sendAdminActivityAlert } = await import("@/lib/admin-alerts.server");
      await sendAdminActivityAlert("order", r.order, prof.id);
      return json({ order: /^\d+$/.test(String(r.order)) ? Number(r.order) : r.order });
    }
    case "status": {
      const ids = String(p["orders"] ?? p["order"] ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 100);
      if (!ids.length) return json({ error: "Missing parameter: order" });
      const { data } = await db.from("orders").select("order_code,status,quantity,delivered_qty,charge,refunded,created_at")
        .eq("user_id", prof.id).in("order_code", ids);
      const STATUS: Record<string, string> = { pending: "Pending", processing: "In progress", completed: "Completed", partial: "Partial", rejected: "Canceled", canceled: "Canceled" };
      const fmt = (o: NonNullable<typeof data>[number]) => {
        const delivered = o.delivered_qty ?? (o.status === "completed" ? o.quantity : 0);
        return { charge: Number(o.charge).toFixed(5), start_count: "0", status: STATUS[o.status] ?? "Pending",
          remains: String(Math.max(0, o.quantity - delivered)), currency: "USD" };
      };
      if (ids.length === 1 && !p["orders"]) {
        const o = data?.[0];
        return o ? json(fmt(o)) : json({ error: "Incorrect order ID" });
      }
      const map: Record<string, unknown> = {};
      ids.forEach((id) => { const o = data?.find((x) => x.order_code === id); map[id] = o ? fmt(o) : { error: "Incorrect order ID" }; });
      return json(map);
    }
    case "refill":
    case "refill_status":
    case "cancel":
      return json({ error: "Not supported" });
    default:
      return json({ error: "Incorrect request" });
  }
}

export const Route = createFileRoute("/api/public/v2")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
