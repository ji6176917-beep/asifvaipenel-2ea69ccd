import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export const platformsQuery = queryOptions({
  queryKey: ["platforms"],
  queryFn: async () => {
    const { data, error } = await supabase.from("platforms").select("*").order("sort");
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export const catalogQuery = (platform: string) => queryOptions({
  queryKey: ["catalog", platform],
  queryFn: async () => {
    const { data: p, error } = await supabase.from("platforms").select("id,name,slug,logo_url").eq("slug", platform).maybeSingle();
    if (error) throw error;
    if (!p) return null;
    const { data: cats } = await supabase.from("categories").select("id,name").eq("platform_id", p.id).eq("active", true).is("deleted_at", null).order("sort");
    const ids = (cats ?? []).map((c) => c.id);
    const { data: svcs } = ids.length
      ? await supabase.from("services").select("*").in("category_id", ids).eq("active", true).is("deleted_at", null).order("sort")
      : { data: [] };
    return { platform: p, cats: cats ?? [], svcs: svcs ?? [] };
  },
  staleTime: 60_000,
});
