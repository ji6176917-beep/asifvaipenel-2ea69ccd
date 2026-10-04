import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useI18n, pickLang } from "@/lib/i18n";
import { useStorageUrl } from "@/lib/storage-url";
import { useAuth } from "@/lib/auth";
import { platformsQuery, settingsQuery } from "@/lib/queries";
import { homeConfig, type HomeSectionId } from "@/lib/site-config";
import { PlatformIcon } from "@/lib/brand";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Premium SMM Store — Followers, Likes & Views" },
      { name: "description", content: "Order Facebook, Instagram, YouTube, TikTok and Telegram growth services, hand-delivered by our team." },
      { property: "og:title", content: "Premium SMM Store — Followers, Likes & Views" },
      { property: "og:description", content: "Hand-delivered social growth for Facebook, Instagram, YouTube, TikTok and Telegram." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function UiIcon({ k, fallback }: { k: string; fallback: React.ReactNode }) {
  const { icon } = useI18n();
  const url = useStorageUrl("logos", icon(k));
  return url ? <img src={url} alt="" className="h-5 w-5 object-contain" /> : <>{fallback}</>;
}

function Home() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
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
  const shown = cfg.platforms.filter((c) => c.on).map((c) => ({ c, p: platforms?.find((p) => p.slug === c.slug) })).filter((x) => x.p);
  const spin = cfg.anim === "high" ? "group-hover:animate-spin3d" : "";
  const tilt = cfg.anim === "off" ? "" : "tilt";

  const blocks: Record<HomeSectionId, React.ReactNode> = {
    hero: (
      <section className="pt-6 text-center">
        <p className="label-premium mb-3 inline-block rounded-full border border-primary/40 px-3 py-1 text-xs text-primary">{t("home.badge")}</p>
        <h1 className="text-gradient mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          {t("home.hero_title").replace(/[*_#`]/g, "")}
        </h1>
        <div className="md-content mx-auto mt-4 max-w-2xl text-muted-foreground sm:text-lg"><ReactMarkdown>{t("home.hero_text")}</ReactMarkdown></div>
        {t("home.hero_article", "") && t("home.hero_article", "") !== "home.hero_article" && (
          <div className="md-content glass mx-auto mt-6 max-w-2xl rounded-3xl p-5 text-left"><ReactMarkdown>{t("home.hero_article", "")}</ReactMarkdown></div>
        )}
      </section>
    ),
    auth: !user ? (
      <section className="text-center">
        {!user && (
          <div className="flex justify-center gap-3">
            <Link to="/sign-in" className="btn-ghost-glow">{t("home.sign_in")}</Link>
            <Link to="/sign-up" className="btn-glow">{t("home.sign_up")}</Link>
          </div>
        )}
      </section>
    ) : null,
    services: (
      <section>
        <h2 className="label-premium mb-5 text-center text-2xl">{t("home.services_title")}</h2>
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-2 sm:gap-4">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[76px] w-[62px] rounded-2xl sm:h-28 sm:w-[120px]" />)
            : shown.map(({ c, p }) => (
                <Link key={p!.id} to="/service/$platform" params={{ platform: p!.slug }} className={`glass ${tilt} group flex w-[62px] flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 sm:w-[120px] sm:gap-2.5 sm:rounded-3xl sm:p-4`}>
                  {c.logo ? <PlatformLogo path={c.logo} className={`h-10 w-10 transition ${spin} sm:h-14 sm:w-14`} />
                    : <PlatformIcon slug={p!.slug} logo={p!.logo_url} name={p!.name} className={`h-10 w-10 transition ${spin} sm:h-14 sm:w-14`} />}
                  <span className="w-full truncate text-center text-[11px] font-semibold text-muted-foreground sm:text-xs">{c.name?.trim() || p!.name}</span>
                </Link>
              ))}
        </div>
      </section>
    ),
    order: (
      <div className="flex justify-center">
        <Link to="/order" className="btn-glow !px-10 !py-4 text-lg"><UiIcon k="home.order_now" fallback={<Rocket className="h-5 w-5" />} /> {t("home.order_now")}</Link>
      </div>
    ),
    qna: homeQna.length ? (
      <section className="mx-auto max-w-2xl">
        <h2 className="label-premium mb-4 text-center text-2xl">{t("home.qna_title")}</h2>
        <div className="space-y-2">
          {homeQna.map((q) => {
            const isOpen = openQ === q.id;
            return (
              <div key={q.id} className="glass rounded-2xl">
                <button aria-expanded={isOpen} onClick={() => setOpenQ(isOpen ? null : q.id)} className="flex w-full items-center justify-between gap-3 p-4 text-start">
                  <span className="label-premium">{pickLang(q.question, lang)}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
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
    <div className="space-y-10">
      {cfg.sections.filter((x) => x.on).map((x) => <div key={x.id}>{blocks[x.id]}</div>)}
    </div>
  );
}

function PlatformLogo({ path, className }: { path: string; className: string }) {
  const url = useStorageUrl("logos", path);
  return url ? <img src={url} alt="" className={`${className} object-contain`} /> : <span className={className} />;
}
