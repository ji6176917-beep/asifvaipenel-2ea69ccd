import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin as any };
}

/** Bump content_version so every visitor's realtime listener refetches the catalog. */
async function touch(db: any) {
  const { data } = await db.from("site_settings").select("content_version").eq("id", 1).single();
  await db.from("site_settings").update({ content_version: (data?.content_version ?? 0) + 1 }).eq("id", 1);
}

const level = z.enum(["platforms", "categories", "services"]);
const parentCol = { platforms: null, categories: "platform_id", services: "category_id" } as const;

export const adminCatalogList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ level, parentId: z.string().uuid().nullable(), trash: z.boolean().default(false), ownOnly: z.boolean().default(false) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    // source_provider is a panel preference, not ownership. Exclude categories
    // with provider-backed services even when those services are in Trash.
    const ownCategories = data.level === "categories" && data.ownOnly;
    let q = db.from(data.level).select(ownCategories ? "*, api_services:services(id)" : "*").order("sort").order("name").limit(2000);
    if (ownCategories) q = q.not("api_services.provider_id", "is", null).is("api_services", null);
    if (data.level === "services" && data.ownOnly) q = q.is("provider_id", null);
    const pc = parentCol[data.level];
    if (pc && data.parentId) q = q.eq(pc, data.parentId);
    q = data.trash ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let parent: { name: string; slug?: string; logo_url?: string | null } | null = null;
    if (data.parentId) {
      const t = data.level === "categories" ? "platforms" : "categories";
      const { data: p } = await db.from(t).select("*").eq("id", data.parentId).maybeSingle();
      parent = p;
    }
    return { rows: (rows ?? []).map(({ api_services: _apiServices, ...row }: any) => row) as any[], parent };
  });

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const platformInput = z.object({ name: z.string().trim().min(1).max(60), logo_url: z.string().max(300).nullable().optional() });
const categoryInput = z.object({ name: z.string().trim().min(1).max(120) });
const serviceInput = z.object({
  name: z.string().trim().min(1).max(200),
  rate_per: z.number().int().positive().max(1_000_000),
  rate: z.number().positive().max(1_000_000),
  min_qty: z.number().int().positive(),
  max_qty: z.number().int().positive(),
  avg_time: z.string().trim().min(1).max(60),
  active: z.boolean(),
}).refine((v) => v.min_qty < v.max_qty, { message: "Minimum must be less than maximum" });

export const adminCatalogSave = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ level, id: z.string().uuid().nullable(), parentId: z.string().uuid().nullable(), values: z.record(z.string(), z.unknown()) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    let values: Record<string, unknown>;
    if (data.level === "platforms") values = platformInput.parse(data.values);
    else if (data.level === "categories") values = categoryInput.parse(data.values);
    else {
      const r = serviceInput.safeParse(data.values);
      if (!r.success) throw new Error(r.error.issues[0]?.message ?? "Invalid service");
      values = { ...r.data, rate: Math.round(r.data.rate * 10000) / 10000 };
    }
    const pc = parentCol[data.level];
    if (data.id) {
      const { data: before } = await db.from(data.level).select("*").eq("id", data.id).single();
      if (data.level === "services" && before?.provider_id) { values["custom_name"] = true; values["custom_rate"] = true; }
      const { error } = await db.from(data.level).update(values).eq("id", data.id);
      if (error) throw new Error(error.message);
      await s.logAdmin(`${data.level}_edit`, { id: data.id }, before, values);
    } else {
      if (pc && !data.parentId) throw new Error("Missing parent");
      let sq = db.from(data.level).select("sort").order("sort", { ascending: false }).limit(1);
      if (pc) sq = sq.eq(pc, data.parentId);
      const { data: last } = await sq;
      const row: Record<string, unknown> = { ...values, sort: (last?.[0]?.sort ?? 0) + 1 };
      if (pc) row[pc] = data.parentId;
      if (data.level === "platforms") {
        let slug = slugify(String(values["name"])) || "platform";
        const { data: ex } = await db.from("platforms").select("id").eq("slug", slug).maybeSingle();
        if (ex) slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;
        row["slug"] = slug; row["active"] = true;
      }
      if (data.level === "categories") row["active"] = true;
      const { data: ins, error } = await db.from(data.level).insert(row).select("id").single();
      if (error) throw new Error(error.message);
      await s.logAdmin(`${data.level}_add`, { id: ins.id }, null, row);
    }
    await touch(db);
    return { ok: true };
  });

export const adminCatalogAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ level, id: z.string().uuid(), action: z.enum(["on", "off", "delete", "restore", "up", "down"]) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: row } = await db.from(data.level).select("*").eq("id", data.id).single();
    if (!row) throw new Error("Not found");
    if (data.action === "on" || data.action === "off") {
      await db.from(data.level).update({ active: data.action === "on" }).eq("id", data.id);
    } else if (data.action === "delete") {
      await db.from(data.level).update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    } else if (data.action === "restore") {
      await db.from(data.level).update({ deleted_at: null }).eq("id", data.id);
    } else {
      // Normalise sort order among siblings, then swap with the neighbour.
      const pc = parentCol[data.level];
      let q = db.from(data.level).select("id, sort").is("deleted_at", null).order("sort").order("name");
      if (pc) q = q.eq(pc, row[pc]);
      const { data: sibs } = await q;
      const list = (sibs ?? []) as { id: string }[];
      const i = list.findIndex((x) => x.id === data.id);
      const j = data.action === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return { ok: true };
      [list[i], list[j]] = [list[j]!, list[i]!];
      await Promise.all(list.map((x, k) => db.from(data.level).update({ sort: k + 1 }).eq("id", x.id)));
    }
    await s.logAdmin(`${data.level}_${data.action}`, { id: data.id, name: row.name });
    await touch(db);
    return { ok: true };
  });
