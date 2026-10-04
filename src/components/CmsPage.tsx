import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLang } from "@/lib/i18n";
import { Card, Empty, PageTitle } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const pageQuery = (slug: string) => ({
  queryKey: ["page", slug],
  queryFn: async () => {
    const { data, error } = await supabase.from("pages").select("slug, title, content, updated_at").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

/** Renders an admin-edited page (rich text per language, English fallback). */
export function CmsPage({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const { lang } = useI18n();
  const { data, isLoading } = useQuery(pageQuery(slug));
  if (isLoading) return <div className="mx-auto max-w-2xl"><Skeleton className="h-64 rounded-3xl" /></div>;
  if (!data) return <div className="mx-auto max-w-2xl"><PageTitle>{fallbackTitle}</PageTitle><Empty text="This page is not available." /></div>;
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>{pickLang(data.title, lang, fallbackTitle)}</PageTitle>
      <Card><div className="md-content text-muted-foreground"><ReactMarkdown>{pickLang(data.content, lang)}</ReactMarkdown></div></Card>
    </div>
  );
}
