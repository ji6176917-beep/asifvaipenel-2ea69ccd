import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

const LANGS = ["en", "bn", "hi", "pt-BR", "id", "tr", "ar", "fa"] as const;

/* ---------------- Labels & icons ---------------- */

export const adminListLabels = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const [{ data: labels }, { data: icons }] = await Promise.all([
    db.from("ui_labels").select("*").order("page_group").order("key"),
    db.from("ui_icons").select("*").order("page_group").order("key"),
  ]);
  return { labels: labels ?? [], icons: icons ?? [] };
});

export const adminSaveLabel = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    key: z.string().min(1).max(100),
    translations: z.record(z.enum(LANGS), z.string().max(20000)),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const clean = Object.fromEntries(Object.entries(data.translations).filter(([, v]) => v.trim() !== ""));
    const { data: before } = await db.from("ui_labels").select("translations").eq("key", data.key).single();
    const { error } = await db.from("ui_labels").update({ translations: clean, updated_at: new Date().toISOString() }).eq("key", data.key);
    if (error) throw new Error(error.message);
    await s.logAdmin("label_updated", { key: data.key }, before, clean);
    return { ok: true };
  });

export const adminResetLabel = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("ui_labels").select("translations").eq("key", data.key).single();
    await db.from("ui_labels").update({ translations: {}, updated_at: new Date().toISOString() }).eq("key", data.key);
    await s.logAdmin("label_reset", { key: data.key }, before, {});
    return { ok: true };
  });

const imgInput = z.object({ base64: z.string().max(1_500_000), type: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon"]) });

async function uploadImage(db: Awaited<ReturnType<typeof ctx>>["db"], folder: string, d: z.infer<typeof imgInput>) {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/x-icon": "ico" }[d.type];
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const bytes = Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0));
  if (bytes.length > 1024 * 1024) throw new Error("Max 1 MB");
  const { error } = await db.storage.from("logos").upload(path, bytes, { contentType: d.type });
  if (error) throw new Error(error.message);
  return path;
}

/** Upload an image into the logos bucket (icons, branding, popup). Returns the stored path. */
export const adminUploadImage = createServerFn({ method: "POST" })
  .inputValidator((d) => imgInput.extend({ folder: z.enum(["icons", "branding", "menu", "popup"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    return { path: await uploadImage(db, data.folder, data) };
  });

export const adminSetIcon = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ key: z.string().min(1).max(100), icon_url: z.string().max(300).nullable() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { error } = await db.from("ui_icons").update({ icon_url: data.icon_url, updated_at: new Date().toISOString() }).eq("key", data.key);
    if (error) throw new Error(error.message);
    await s.logAdmin("icon_updated", data);
    return { ok: true };
  });

/* ---------------- Branding, announcement, popup ---------------- */

const BRAND_COLS = "site_name, tagline, logo_url, favicon_url, share_image_url, footer_copyright, announcement_on, announcement_text, announcement_color, announcement_link, announcement_start, announcement_end, popup_on, popup_image, popup_link, popup_mode";

export const adminGetBranding = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.from("site_settings").select(BRAND_COLS).eq("id", 1).single();
  if (error) throw new Error(error.message);
  return data;
});

const url = z.string().trim().max(500).refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with https://");
export const adminSaveBranding = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    site_name: z.string().trim().min(1).max(80), tagline: z.string().max(200), logo_url: z.string().max(500).nullable(),
    favicon_url: z.string().max(500).nullable(), share_image_url: z.string().max(500).nullable(), footer_copyright: z.string().max(300),
    announcement_on: z.boolean(), announcement_text: z.string().max(500), announcement_color: z.string().max(30).regex(/^(#[0-9a-fA-F]{3,8})?$/),
    announcement_link: url, announcement_start: z.string().max(40).nullable(), announcement_end: z.string().max(40).nullable(),
    popup_on: z.boolean(), popup_image: z.string().max(500).nullable(), popup_link: url, popup_mode: z.enum(["once", "every"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("site_settings").select(BRAND_COLS).eq("id", 1).single();
    const { error } = await db.from("site_settings").update(data).eq("id", 1);
    if (error) throw new Error(error.message);
    await s.logAdmin("branding_updated", {}, before, data);
    return { ok: true };
  });

/* ---------------- Menu items ---------------- */

export const adminListMenu = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.from("menu_items").select("*").is("deleted_at", null).order("sort");
  if (error) throw new Error(error.message);
  return data ?? [];
});

const LOCS = ["three_dot_menu", "bottom_bar", "footer_links", "footer_info", "home_shortcuts"] as const;
const TARGETS = ["internal_route", "external_url", "telegram", "whatsapp", "email", "action"] as const;

export const adminSaveMenuItem = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    location: z.enum(LOCS),
    label: z.record(z.enum(LANGS), z.string().max(80)),
    icon_key: z.string().max(40).nullable(),
    icon_url: z.string().max(500).nullable(),
    target_type: z.enum(TARGETS),
    target_value: z.string().trim().max(500),
    is_active: z.boolean(),
    requires_login: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { id, ...row } = data;
    const label = Object.fromEntries(Object.entries(row.label).filter(([, v]) => v.trim()));
    if (!label["en"]) throw new Error("English label is required");
    if (row.target_type === "internal_route" && !row.target_value.startsWith("/")) throw new Error("Internal routes start with /");
    if (row.target_type === "external_url" && !/^https?:\/\//i.test(row.target_value)) throw new Error("URL must start with https://");
    if (id) {
      const { data: before } = await db.from("menu_items").select("*").eq("id", id).single();
      // System items keep their target and location; only label/icon/visibility/order change.
      const patch = before?.is_system
        ? { label, icon_key: row.icon_key, icon_url: row.icon_url, is_active: row.is_active }
        : { ...row, label };
      const { error } = await db.from("menu_items").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
      await s.logAdmin("menu_item_updated", { id }, before, patch);
    } else {
      if (row.target_type === "action") throw new Error("Custom items cannot use system actions");
      const { data: last } = await db.from("menu_items").select("sort").eq("location", row.location).order("sort", { ascending: false }).limit(1).maybeSingle();
      const { error } = await db.from("menu_items").insert({ ...row, label, sort: (last?.sort ?? 0) + 1 });
      if (error) throw new Error(error.message);
      await s.logAdmin("menu_item_added", { location: row.location }, null, row);
    }
    return { ok: true };
  });

export const adminDeleteMenuItem = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: before } = await db.from("menu_items").select("*").eq("id", data.id).single();
    if (!before) throw new Error("Not found");
    if (before.is_system) throw new Error("System items cannot be deleted — hide them instead");
    await db.from("menu_items").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    await s.logAdmin("menu_item_deleted", { id: data.id }, before, null);
    return { ok: true };
  });

export const adminReorderMenu = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    await Promise.all(data.ids.map((id, i) => db.from("menu_items").update({ sort: i }).eq("id", id)));
    await s.logAdmin("menu_reordered", { count: data.ids.length });
    return { ok: true };
  });
