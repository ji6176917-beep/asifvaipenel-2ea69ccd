import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useI18n, pickLang } from "@/lib/i18n";
import { useStorageUrl } from "@/lib/storage-url";
import { platformsQuery, settingsQuery } from "@/lib/queries";
import { homeConfig, type HomeSectionId } from "@/lib/site-config";
import { PlatformIcon } from "@/lib/brand";
import { Skeleton } from "@/components/ui/skeleton";
import { HomeShowcase } from "@/components/HomeShowcase";
import { LiveStats } from "@/components/LiveStats";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "Apex SMM World | #1 Global SMM Panel for Instagram, TikTok, YouTube & Social Growth";
    const desc = "The world's top-rated and cheapest SMM panel. Buy genuine Instagram followers & likes, TikTok views & followers, YouTube subscribers & watch hours, Telegram members, and Facebook marketing services. Instant delivery & 24/7 support.";
    const ogTitle = "Apex SMM World - #1 Social Media Marketing Panel";
    const ogDesc = "Boost your social media profiles worldwide with real followers, likes, views, and subscribers. Instant delivery and 24/7 customer support.";
    const logo = "https://apexsmmworld.com/favicon-192.png";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "keywords", content: "apex smm world, best smm panel in the world, #1 global smm panel, cheapest smm provider worldwide, buy instagram followers, buy real instagram likes, buy tiktok followers, tiktok likes and views panel, buy youtube subscribers, youtube watch time provider, buy telegram members, buy facebook page followers, global smm panel, smm reseller panel" },
        { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDesc },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Apex SMM World" },
        { property: "og:url", content: "https://apexsmmworld.com/" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: ogDesc },
      ],
      links: [{ rel: "canonical", href: "https://apexsmmworld.com/" }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "@id": "https://apexsmmworld.com/#organization", name: "Apex SMM World", url: "https://apexsmmworld.com/", logo },
            { "@type": "WebSite", "@id": "https://apexsmmworld.com/#website", url: "https://apexsmmworld.com/", name: "Apex SMM World", alternateName: "ApexSMMWorld", inLanguage: "en", publisher: { "@id": "https://apexsmmworld.com/#organization" } },
          ],
        }),
      }],
    };
  },
  component: Home,
});

function Home() {
  const { t, tr, lang } = useI18n();
  const [openQ, setOpenQ] = useState<string | null>(null);
  const { data: homeQna = [] } = useQuery({
    queryKey: ["qna", "home"], staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("qna").select("id, question, answer").eq("show_on_home", true).eq("active", true).is("deleted_at", null).order("home_sort").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const { data: platforms, isLoading } = useQuery(platformsQuery);
  const { data: settings } = useQuery(settingsQuery);
  const cfg = homeConfig(settings?.home_config, (platforms ?? []).map((p) => p.slug));
  const shown = cfg.platforms.filter((c) => c.on).flatMap((c) => {
    const p = platforms?.find((p) => p.slug === c.slug);
    return p ? [{ c, p }] : [];
  });

  const blocks: Record<HomeSectionId, React.ReactNode> = {
    hero: <HomeShowcase />,
    auth: null,
    services: (
      <section id="popular-services" className="home-services">
        <p className="home-section-eyebrow">{tr("OUR SERVICES")}</p>
        <h2>{tr("Popular Services")}</h2>
        <p className="home-services-description">{tr("Choose from our most popular social media services and take your online presence to the next level. Quality, speed, and affordability—all in one place.")}</p>
        <div className="home-service-grid">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-lg" />)
            : shown.map(({ c, p }) => (
                <Link key={p.id} to="/service/$platform" params={{ platform: p.slug }} className={`home-service-tile home-service-${p.slug}`}>
                  <span className={`home-platform-icon home-platform-${p.slug}`}>
                  {c.logo ? <PlatformLogo path={c.logo} className="h-full w-full" />
                    : <PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-full w-full" />}
                  </span>
                  <span className="home-service-copy"><strong>{c.name?.trim() || p.name}</strong></span>
                </Link>
              ))}
        </div>
      </section>
    ),
    order: null,
    qna: homeQna.length ? (
      <section className="home-qna mx-auto max-w-2xl">
        <h2 className="label-premium mb-4 text-center text-2xl">{t("home.qna_title")}</h2>
        <div className="space-y-2">
          {homeQna.map((q) => {
            const isOpen = openQ === q.id;
            return (
              <div key={q.id} className="glass rounded-2xl">
                <Button variant="ghost" aria-expanded={isOpen} onClick={() => setOpenQ(isOpen ? null : q.id)} className="h-auto w-full justify-between gap-3 whitespace-normal p-4 text-start">
                  <span className="label-premium">{pickLang(q.question, lang)}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${isOpen ? "rotate-180" : ""}`} />
                </Button>
                {isOpen && <div className="md-content px-4 pb-4 text-sm text-muted-foreground"><ReactMarkdown>{pickLang(q.answer, lang)}</ReactMarkdown></div>}
              </div>
            );
          })}
        </div>
      </section>
    ) : null,
    footer: null,
  };

  return (
    <div className="home-reference-content">
      {cfg.sections.filter((x) => x.on && blocks[x.id]).map((x) => <div key={x.id}>{blocks[x.id]}</div>)}
      <div className="home-mobile-only"><LiveStats /></div>
    </div>
  );
}

function PlatformLogo({ path, className }: { path: string; className: string }) {
  const url = useStorageUrl("logos", path);
  return url ? <img src={url} alt="" className={`${className} object-contain`} /> : <span className={className} />;
}
