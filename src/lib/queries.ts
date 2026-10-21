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
    const { data, error } = await supabase.from("platforms").select("*").eq("active", true).is("deleted_at", null).order("sort");
    if (error) throw error;
    return data;
  },
  staleTime: 0,
  refetchInterval: 10_000,
  refetchOnMount: "always",
});

export const catalogQuery = (platform: string) => queryOptions({
  queryKey: ["catalog", platform],
  queryFn: async () => {
    const { data: p, error } = await supabase.from("platforms").select("id,name,slug,logo_url").eq("slug", platform).eq("active", true).is("deleted_at", null).maybeSingle();
    if (error) throw error;
    if (!p) return null;
    const { data: cats, error: categoryError } = await supabase.from("categories").select("id,name").eq("platform_id", p.id).eq("active", true).is("deleted_at", null).order("sort");
    if (categoryError) throw categoryError;
    const ids = (cats ?? []).map((c) => c.id);
    const fetchPage = (offset: number) => supabase.from("services").select("*").in("category_id", ids).eq("active", true).eq("provider_available", true).is("deleted_at", null).order("service_no").range(offset, offset + 999);
    const svcs: NonNullable<Awaited<ReturnType<typeof fetchPage>>['data']> = [];
    if (ids.length) for (let offset = 0; ; offset += 1000) {
      const page = await fetchPage(offset);
      if (page.error) throw page.error;
      svcs.push(...(page.data ?? []));
      if ((page.data?.length ?? 0) < 1000) break;
    }
    const used = new Set(svcs.map((s) => s.category_id));
    return { platform: p, cats: (cats ?? []).filter((c) => used.has(c.id)), svcs };
  },
  staleTime: 0,
  refetchInterval: 10_000,
  refetchOnMount: "always",
});
