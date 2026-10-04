import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sign(db: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"], bucket: string, path?: string | null) {
  if (!path) return null;
  if (/^https?:/.test(path)) return path;
  const { data } = await db.storage.from(bucket).createSignedUrl(path, 6 * 3600);
  return data?.signedUrl ?? null;
}

/** Public: the admin-selected welcome song with short-lived playable URLs and playback settings. */
export const getWelcomeSong = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: set } = await db.from("site_settings").select("music_enabled, music_version").eq("id", 1).maybeSingle();
  if (set && !set.music_enabled) return null;
  const { data: s } = await db.from("songs").select("*").eq("is_welcome", true).eq("active", true).is("deleted_at", null).maybeSingle();
  if (!s) return null;
  return {
    id: s.id, title: s.title, artist: s.artist, version: set?.music_version ?? 1,
    url: s.source_url || await sign(db, "music", s.file_path), cover: await sign(db, "music", s.cover_path),
    volume: s.volume, loop: s.loop, autoplay: s.autoplay, show_for: s.show_for as "all" | "first",
  };
});

async function adm() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  return { s, db };
}

/** Bump the version so every visitor's cached song info refetches. */
async function bump(db: Awaited<ReturnType<typeof adm>>["db"]) {
  const { data } = await db.from("site_settings").select("music_version").eq("id", 1).single();
  await db.from("site_settings").update({ music_version: (data?.music_version ?? 1) + 1 }).eq("id", 1);
}

export const adminListSongs = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await adm();
  const [{ data: songs }, { data: set }] = await Promise.all([
    db.from("songs").select("*").order("sort").order("created_at"),
    db.from("site_settings").select("music_enabled").eq("id", 1).maybeSingle(),
  ]);
  const rows = await Promise.all((songs ?? []).map(async (x) => ({
    ...x, url: x.source_url || await sign(db, "music", x.file_path), cover: await sign(db, "music", x.cover_path),
  })));
  return { songs: rows, enabled: set?.music_enabled ?? true };
});

const AUDIO_EXT = ["mp3", "m4a", "wav"];
const IMG_EXT = ["png", "jpg", "jpeg", "webp"];

export const adminSongUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ name: z.string().min(1).max(200), kind: z.enum(["audio", "cover"]) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await adm();
    const ext = (data.name.split(".").pop() ?? "").toLowerCase();
    if (!(data.kind === "audio" ? AUDIO_EXT : IMG_EXT).includes(ext)) throw new Error(data.kind === "audio" ? "Use mp3, m4a or wav" : "Use PNG, JPG or WebP");
    const path = `${data.kind === "audio" ? "songs" : "covers"}/${crypto.randomUUID()}.${ext}`;
    const { data: u, error } = await db.storage.from("music").createSignedUploadUrl(path);
    if (error || !u) throw new Error("Could not prepare upload");
    return { path, token: u.token };
  });

const songInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().max(120),
  file_path: z.string().max(500),
  source_url: z.string().trim().max(1000).nullable(),
  cover_path: z.string().max(500).nullable(),
  active: z.boolean(),
  sort: z.number().int().min(0).max(9999),
  volume: z.number().int().min(0).max(100),
  loop: z.boolean(),
  autoplay: z.boolean(),
  show_for: z.enum(["all", "first"]),
}).refine((s) => s.file_path || s.source_url, "Upload audio or paste a URL")
  .refine((s) => !s.source_url || /^https:\/\/\S+$/i.test(s.source_url), "Audio URL must start with https://");

export const adminSaveSong = createServerFn({ method: "POST" })
  .inputValidator((d) => songInput.parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    const { id, ...row } = data;
    if (id) {
      const { data: old } = await db.from("songs").select("*").eq("id", id).maybeSingle();
      await db.from("songs").update(row).eq("id", id);
      await s.logAdmin("song_updated", { id }, old, row);
    } else {
      const { data: n } = await db.from("songs").insert(row).select("id").single();
      await s.logAdmin("song_added", { id: n?.id }, null, row);
    }
    await bump(db);
    return { ok: true };
  });

export const adminSongAction = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ id: z.string().uuid(), action: z.enum(["welcome", "unwelcome", "delete", "restore", "on", "off"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    const { data: old } = await db.from("songs").select("*").eq("id", data.id).maybeSingle();
    if (!old) throw new Error("Not found");
    if (data.action === "welcome") {
      await db.from("songs").update({ is_welcome: false }).eq("is_welcome", true);
      await db.from("songs").update({ is_welcome: true, active: true }).eq("id", data.id);
    } else if (data.action === "unwelcome") await db.from("songs").update({ is_welcome: false }).eq("id", data.id);
    else if (data.action === "delete") await db.from("songs").update({ deleted_at: new Date().toISOString(), is_welcome: false }).eq("id", data.id);
    else if (data.action === "restore") await db.from("songs").update({ deleted_at: null }).eq("id", data.id);
    else await db.from("songs").update({ active: data.action === "on" }).eq("id", data.id);
    await s.logAdmin("song_" + data.action, { id: data.id, title: old.title });
    await bump(db);
    return { ok: true };
  });

export const adminSetMusicEnabled = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await adm();
    await db.from("site_settings").update({ music_enabled: data.enabled }).eq("id", 1);
    await bump(db);
    await s.logAdmin("music_enabled_changed", {}, null, { enabled: data.enabled });
    return { ok: true };
  });
