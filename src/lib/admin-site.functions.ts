import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

const langMap = z.record(z.string().max(10), z.string().max(20000));

/* ---------------- Site settings (whitelisted fields) ---------------- */

const settingsPatch = z.object({
  home_config: z.record(z.string(), z.unknown()).optional(),
  theme_config: z.record(z.string(), z.unknown()).optional(),
  languages_config: z.record(z.string(), z.unknown()).optional(),
  telegram: z.string().trim().max(64).regex(/^@?[A-Za-z0-9_]*$/, "Telegram username: letters, numbers and _ only").optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(200).optional(),
  support_hours: z.string().max(300).optional(),
  whatsapp_float: z.boolean().optional(),
  maintenance_on: z.boolean().optional(),
  maintenance_text: z.string().max(1000).optional(),
  allow_signups: z.boolean().optional(),
  allow_orders: z.boolean().optional(),
  api_global_enabled: z.boolean().optional(),
  require_verified_email: z.boolean().optional(),
  require_screenshot: z.boolean().optional(),
  cookie_notice: z.boolean().optional(),
  blocked_email_domains: z.string().max(5000).optional(),
  seo_title: z.string().max(120).optional(),
  seo_description: z.string().max(300).optional(),
  share_image_url: z.string().max(500).nullable().optional(),
  session_timeout_min: z.number().int().min(0).max(100000).optional(),
  bdt_rate: z.number().positive().max(100000).optional(),
  deposit_min: z.number().min(0).max(1000000).optional(),
  deposit_max: z.number().positive().max(10000000).optional(),
});

export const adminGetSite = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data } = await db.from("site_settings").select("*").eq("id", 1).single();
  return data!;
});

export const adminSaveSite = createServerFn({ method: "POST" })
  .inputValidator((d) => settingsPatch.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const patch: Record<string, unknown> = { ...data };
    if (typeof data.telegram === "string") patch["telegram"] = data.telegram.replace(/^@/, "");
    if (typeof data.whatsapp === "string") patch["whatsapp"] = data.whatsapp.replace(/\D/g, "");
    if (data.deposit_min !== undefined && data.deposit_max !== undefined && data.deposit_min > data.deposit_max) throw new Error("Minimum is larger than maximum");
    const keys = Object.keys(patch);
    const { data: old } = await db.from("site_settings").select(keys.join(",")).eq("id", 1).single();
    const { error } = await db.from("site_settings").update(patch as never).eq("id", 1);
    if (error) throw new Error("Could not save");
    await s.logAdmin("settings_saved", { keys }, old, patch);
    return { ok: true };
  });

/* ---------------- QnA ---------------- */

export const adminListQna = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data } = await db.from("qna").select("*").is("deleted_at", null).order("sort").order("created_at");
  return data ?? [];
});

export const adminSaveQna = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid().optional(), question: langMap, answer: langMap, active: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    if (!data.question["en"]?.trim()) throw new Error("English question is required");
    const { id, ...row } = data;
    if (id) {
      const { data: old } = await db.from("qna").select("*").eq("id", id).single();
      await db.from("qna").update(row).eq("id", id);
      await s.logAdmin("qna_updated", { id }, old, row);
    } else {
      const { data: last } = await db.from("qna").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
      await db.from("qna").insert({ ...row, sort: (last?.sort ?? 0) + 1 });
      await s.logAdmin("qna_added", {}, null, row);
    }
    return { ok: true };
  });

export const adminQnaAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["delete", "on", "off"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const patch = data.action === "delete" ? { deleted_at: new Date().toISOString() } : { active: data.action === "on" };
    await db.from("qna").update(patch).eq("id", data.id);
    await s.logAdmin("qna_" + data.action, { id: data.id });
    return { ok: true };
  });

export const adminReorderQna = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    await Promise.all(data.ids.map((id, i) => db.from("qna").update({ sort: i + 1 }).eq("id", id)));
    return { ok: true };
  });

/** Which questions appear on the home page, and in what order. */
export const adminQnaHome = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), show: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    await db.from("qna").update({ show_on_home: data.show }).eq("id", data.id);
    await s.logAdmin("qna_home_" + (data.show ? "on" : "off"), { id: data.id }, { show_on_home: !data.show }, { show_on_home: data.show });
    return { ok: true };
  });

export const adminReorderQnaHome = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    await Promise.all(data.ids.map((id, i) => db.from("qna").update({ home_sort: i + 1 }).eq("id", id)));
    return { ok: true };
  });



/* ---------------- Pages ---------------- */

export const adminListPages = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data } = await db.from("pages").select("*").is("deleted_at", null).order("is_custom").order("slug");
  return data ?? [];
});

export const adminPageVersions = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: v } = await db.from("page_versions").select("*").eq("slug", data.slug).order("id", { ascending: false }).limit(10);
    return v ?? [];
  });

export const adminSavePage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    slug: z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers and dashes"),
    title: langMap, content: langMap, show_in_footer: z.boolean(), is_new: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    if (!data.title["en"]?.trim()) throw new Error("English title is required");
    const { data: old } = await db.from("pages").select("*").eq("slug", data.slug).maybeSingle();
    if (data.is_new && old && !old.deleted_at) throw new Error("That slug is already used");
    if (old) {
      await db.from("page_versions").insert({ slug: old.slug, title: old.title, content: old.content });
      const { data: vs } = await db.from("page_versions").select("id").eq("slug", old.slug).order("id", { ascending: false }).range(10, 1000);
      if (vs?.length) await db.from("page_versions").delete().in("id", vs.map((v) => v.id));
    }
    await db.from("pages").upsert({
      slug: data.slug, title: data.title, content: data.content, show_in_footer: data.show_in_footer,
      is_custom: old ? old.is_custom : true, deleted_at: null, updated_at: new Date().toISOString(),
    });
    await s.logAdmin("page_saved", { slug: data.slug }, old, data);
    return { ok: true };
  });

export const adminRestorePageVersion = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: v } = await db.from("page_versions").select("*").eq("id", data.id).single();
    if (!v) throw new Error("Not found");
    const { data: cur } = await db.from("pages").select("*").eq("slug", v.slug).single();
    if (cur) await db.from("page_versions").insert({ slug: cur.slug, title: cur.title, content: cur.content });
    await db.from("pages").update({ title: v.title, content: v.content, updated_at: new Date().toISOString() }).eq("slug", v.slug);
    await s.logAdmin("page_restored", { slug: v.slug, version: v.id });
    return { ok: true };
  });

export const adminDeletePage = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string().max(80) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: p } = await db.from("pages").select("is_custom").eq("slug", data.slug).single();
    if (!p?.is_custom) throw new Error("Built-in pages cannot be deleted");
    await db.from("pages").update({ deleted_at: new Date().toISOString() }).eq("slug", data.slug);
    await s.logAdmin("page_deleted", { slug: data.slug });
    return { ok: true };
  });

/* ---------------- Languages: missing translation counts ---------------- */

export const adminTranslationStats = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const [{ data: labels }, { data: qna }, { data: pages }] = await Promise.all([
    db.from("ui_labels").select("translations"),
    db.from("qna").select("question, answer").is("deleted_at", null),
    db.from("pages").select("title, content").is("deleted_at", null),
  ]);
  const fields: Record<string, string>[] = [
    ...(labels ?? []).map((l) => (l.translations ?? {}) as Record<string, string>),
    ...(qna ?? []).flatMap((q) => [q.question, q.answer] as Record<string, string>[]),
    ...(pages ?? []).flatMap((p) => [p.title, p.content] as Record<string, string>[]),
  ];
  const langs = ["en", "bn", "hi", "pt-BR", "id", "tr", "ar", "fa"];
  const total = fields.length;
  const missing = Object.fromEntries(langs.map((l) => [l, fields.filter((f) => !f?.[l]?.trim()).length]));
  return { total, missing };
});

/* ---------------- Notifications & popups ---------------- */

const broadcastInput = z.object({
  kind: z.enum(["popup", "notification"]),
  title: z.string().trim().min(1).max(150),
  body: z.string().max(3000),
  image: z.string().max(500).nullable(),
  link: z.string().trim().max(500).nullable(),
  button: z.string().trim().max(40).nullable(),
  expires_at: z.string().datetime().nullable(),
  show_once: z.boolean(),
  target: z.string().max(100), // "all" or user public ID / email / username
});

export const adminSendBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d) => broadcastInput.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    if (data.link && !/^(https?:\/\/|\/)/.test(data.link)) throw new Error("Link must start with https:// or /");
    let userIds: string[] = [];
    let target = "all";
    if (data.target.trim().toLowerCase() === "all") {
      const { data: all } = await db.from("profiles").select("id").is("deleted_at", null).limit(50000);
      userIds = (all ?? []).map((u) => u.id);
    } else {
      const q = data.target.trim();
      const col = q.includes("@") ? "email" : /^\d{8}$/.test(q) ? "public_id" : "username";
      const { data: u } = await db.from("profiles").select("id").eq(col, q).maybeSingle();
      if (!u) throw new Error("User not found");
      userIds = [u.id]; target = u.id;
    }
    const { data: b, error } = await db.from("broadcasts").insert({ ...data, target }).select("id").single();
    if (error || !b) throw new Error("Could not save");
    for (let i = 0; i < userIds.length; i += 500) {
      await db.from("notifications").insert(userIds.slice(i, i + 500).map((user_id) => ({
        user_id, kind: data.kind, title: data.title, body: data.body, image: data.image, link: data.link,
        button: data.button, expires_at: data.expires_at, show_once: data.show_once, broadcast_id: b.id,
      })));
    }
    await s.logAdmin("broadcast_sent", { id: b.id, recipients: userIds.length }, null, data);
    return { ok: true, recipients: userIds.length };
  });

export const adminListBroadcasts = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data: list } = await db.from("broadcasts").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(100);
  const rows = await Promise.all((list ?? []).map(async (b) => {
    const [{ count: sent }, { count: seen }] = await Promise.all([
      db.from("notifications").select("id", { count: "exact", head: true }).eq("broadcast_id", b.id),
      db.from("notifications").select("id", { count: "exact", head: true }).eq("broadcast_id", b.id).not("read_at", "is", null),
    ]);
    return { ...b, sent: sent ?? 0, seen: seen ?? 0 };
  }));
  return rows;
});

export const adminEditBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(150), body: z.string().max(3000), expires_at: z.string().datetime().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { id, ...row } = data;
    await db.from("broadcasts").update(row).eq("id", id);
    await db.from("notifications").update(row).eq("broadcast_id", id);
    await s.logAdmin("broadcast_edited", { id }, null, row);
    return { ok: true };
  });

export const adminDeleteBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    await db.from("broadcasts").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    await db.from("notifications").delete().eq("broadcast_id", data.id);
    await s.logAdmin("broadcast_deleted", { id: data.id });
    return { ok: true };
  });

/* ---------------- Telegram alerts ---------------- */

export const adminGetTelegram = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const [{ data: c }, { data: log }] = await Promise.all([
    db.from("telegram_config").select("*").eq("id", 1).single(),
    db.rpc("tg_recent_results"),
  ]);
  // Never send the bot token back to the browser.
  return {
    has_token: !!c?.bot_token, chat_id: c?.chat_id ?? "",
    on_order: c?.on_order ?? true, on_deposit: c?.on_deposit ?? true, on_user: c?.on_user ?? false,
    log: log ?? [],
  };
});

export const adminSaveTelegram = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    bot_token: z.string().trim().max(100).regex(/^(\d+:[A-Za-z0-9_-]+)?$/, "Bot token looks wrong").optional(),
    chat_id: z.string().trim().max(40).regex(/^-?\d*$|^@[A-Za-z0-9_]+$/, "Chat ID looks wrong"),
    on_order: z.boolean(), on_deposit: z.boolean(), on_user: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const patch: Record<string, unknown> = { chat_id: data.chat_id, on_order: data.on_order, on_deposit: data.on_deposit, on_user: data.on_user };
    if (data.bot_token) patch["bot_token"] = data.bot_token;
    await db.from("telegram_config").update(patch as never).eq("id", 1);
    await s.logAdmin("telegram_saved", { token_changed: !!data.bot_token }, null, { ...patch, bot_token: data.bot_token ? "••••" : undefined });
    return { ok: true };
  });

export const adminTestTelegram = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.rpc("tg_send", { _event: "test", _text: "✅ Test message from your store admin panel", _force: true });
  if (error) throw new Error("Could not send");
  if (data === null) throw new Error("Add the bot token and chat ID first");
  return { ok: true };
});
