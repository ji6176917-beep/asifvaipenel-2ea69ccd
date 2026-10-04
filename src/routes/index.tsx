import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";
import { useMenu, MenuIcon } from "@/lib/menu";
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
  const tiles = useMenu("home_shortcuts").filter((m) => !m.requires_login || !!user);
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
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)
            : shown.map(({ c, p }) => (
                <Link key={p!.id} to="/service/$platform" params={{ platform: p!.slug }} className={`glass ${tilt} group flex flex-col items-center gap-3 rounded-3xl p-5`}>
                  {c.logo ? <PlatformLogo path={c.logo} className={`h-14 w-14 transition ${spin} sm:h-16 sm:w-16`} />
                    : <PlatformIcon slug={p!.slug} className={`h-14 w-14 transition ${spin} sm:h-16 sm:w-16`} />}
                  <span className="text-xs font-semibold text-muted-foreground">{c.name?.trim() || p!.name}</span>
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
    tiles: (
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((m) => {
          const label = (m.label as Record<string, string>)[lang] || m.label["en"] || "";
          const inner = (<>
            <span className="bg-brand shadow-glow flex h-11 w-11 items-center justify-center rounded-2xl text-primary-foreground"><MenuIcon item={m} className="h-5 w-5" /></span>
            <span className="label-premium text-sm">{label}</span>
          </>);
          const cls = "glass tilt flex flex-col items-center gap-2 rounded-3xl p-5 text-center";
          return m.target_type === "internal_route"
            ? <Link key={m.id} to={m.target_value as never} className={cls}>{inner}</Link>
            : m.target_type === "external_url" ? <a key={m.id} href={m.target_value} target="_blank" rel="noreferrer" className={cls}>{inner}</a> : null;
        })}
      </section>
    ),
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
