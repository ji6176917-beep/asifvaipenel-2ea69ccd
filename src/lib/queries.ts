import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// blocked_email_domains is server-only (column grant revoked); signup trigger enforces it.
const SETTINGS_COLUMNS = "id, site_name, hero_title, hero_text, whatsapp, telegram, email, bdt_rate, allow_orders, require_verified_email, announcement_on, announcement_text, api_policy, api_rate_per_min, music_enabled, deposit_min, deposit_max, require_screenshot, api_global_enabled, api_url, api_min_balance, api_allow_new_keys, api_docs, api_instructions, api_examples, music_version, content_version, tagline, logo_url, favicon_url, share_image_url, footer_copyright, announcement_color, announcement_link, announcement_start, announcement_end, popup_on, popup_image, popup_link, popup_mode, home_config, theme_config, languages_config, support_hours, whatsapp_float, maintenance_on, maintenance_text, allow_signups, cookie_notice, seo_title, seo_description, session_timeout_min, last_backup_at, header_name, social_facebook, social_youtube, social_tiktok";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
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
