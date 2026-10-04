import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

const SETTING_COLS = "api_global_enabled, api_url, api_rate_per_min, api_min_balance, api_allow_new_keys, api_docs, api_instructions, api_examples, api_policy";

export const adminGetApiSettings = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.from("site_settings").select(SETTING_COLS).eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

export const adminSaveApiSettings = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    api_global_enabled: z.boolean(),
    api_url: z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Invalid URL"),
    api_rate_per_min: z.number().int().min(1).max(10000),
    api_min_balance: z.number().min(0).max(1_000_000),
    api_allow_new_keys: z.boolean(),
    api_docs: z.string().max(20000),
    api_instructions: z.string().max(20000),
    api_examples: z.string().max(20000),
    api_policy: z.string().max(20000),
  }).partial().parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("site_settings").select(SETTING_COLS).eq("id", 1).single();
    const { error } = await db.from("site_settings").update(data as never).eq("id", 1);
    if (error) throw new Error(error.message);
    await s.logAdmin("api_settings_updated", { fields: Object.keys(data) }, before, data);
    return { ok: true };
  });

/** Users who have (or had) an API key, with usage and order stats. */
export const adminListApiUsers = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ q: z.string().max(100).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    let q = db.from("profiles").select("id, public_id, username, full_name, email, balance, api_enabled, api_key, api_key_created_at")
      .not("api_key_created_at", "is", null).order("api_key_created_at", { ascending: false }).limit(300);
    const t = data.q?.trim().replace(/[%,()*]/g, "");
    if (t) q = q.or(`public_id.ilike.%${t}%,username.ilike.%${t}%,full_name.ilike.%${t}%,email.ilike.%${t}%`);
    const { data: users, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (users ?? []).map((u) => u.id);
    if (!ids.length) return [];
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const [{ data: reqs }, { data: orders }] = await Promise.all([
      db.from("api_requests").select("user_id, created_at").in("user_id", ids).order("created_at", { ascending: false }).limit(20000),
      db.from("orders").select("user_id, charge, refunded").eq("source", "api").in("user_id", ids).is("deleted_at", null).limit(20000),
    ]);
    return (users ?? []).map(({ api_key, ...u }) => {
      const r = (reqs ?? []).filter((x) => x.user_id === u.id);
      const o = (orders ?? []).filter((x) => x.user_id === u.id);
      return {
        ...u,
        has_key: !!api_key,
        key_preview: api_key ? `${api_key.slice(0, 6)}…${api_key.slice(-4)}` : null,
        requests_total: r.length,
        requests_24h: r.filter((x) => x.created_at >= since).length,
        last_used: r[0]?.created_at ?? null,
        api_orders: o.length,
        api_spend: Math.round(o.reduce((a, x) => a + Number(x.charge) - Number(x.refunded), 0) * 100) / 100,
      };
    });
  });

export const adminApiUserAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["enable", "disable", "revoke", "regenerate"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("profiles").select("api_enabled, api_key_created_at").eq("id", data.id).single();
    let patch: Record<string, unknown>;
    if (data.action === "enable") patch = { api_enabled: true };
    else if (data.action === "disable") patch = { api_enabled: false };
    else if (data.action === "revoke") patch = { api_key: null, api_key_hash: null, api_enabled: false };
    else {
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const k = "sk_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
      patch = { api_key: k, api_key_hash: await s.sha256(k), api_key_created_at: new Date().toISOString(), api_enabled: true };
    }
    const { error } = await db.from("profiles").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    await s.logAdmin(`api_key_${data.action}`, { user: data.id }, before, { api_enabled: patch["api_enabled"] ?? before?.api_enabled });
    return { ok: true };
  });
