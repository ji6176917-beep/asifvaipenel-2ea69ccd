import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin };
}

/** Inactive seeded services awaiting review, with their category and platform. */
export const adminListDraftServices = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.from("services")
    .select("id, name, rate, rate_per, min_qty, max_qty, avg_time, categories!inner(id, name, platforms!inner(name, slug, sort))")
    .eq("is_seed", true).eq("active", false).is("deleted_at", null).order("sort").limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: s.id, name: s.name, rate: Number(s.rate), rate_per: s.rate_per, min_qty: s.min_qty, max_qty: s.max_qty, avg_time: s.avg_time,
    category: s.categories.name, category_id: s.categories.id, platform: s.categories.platforms.name, slug: s.categories.platforms.slug,
  }));
});

/** Activate selected draft services and make sure their categories are visible too. */
export const adminActivateServices = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ ids: z.array(z.string().uuid()).min(1).max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: rows, error } = await db.from("services").update({ active: true }).in("id", data.ids).is("deleted_at", null).select("category_id");
    if (error) throw new Error(error.message);
    const cats = [...new Set((rows ?? []).map((r) => r.category_id))];
    if (cats.length) await db.from("categories").update({ active: true }).in("id", cats).is("deleted_at", null);
    await s.logAdmin("services_activated", { count: rows?.length ?? 0 }, null, { ids: data.ids });
    return { count: rows?.length ?? 0 };
  });
