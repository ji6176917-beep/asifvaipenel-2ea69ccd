import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Rocket } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogQuery, platformsQuery } from "@/lib/queries";
import { PlatformIcon } from "@/lib/brand";
import { Empty, ErrorState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTr } from "@/lib/i18n";
import { DesktopDashboard } from "@/components/DesktopDashboard";
import orderBanner from "@/assets/order-banner.jpg";
import orderGrowth from "@/assets/order-growth.jpg";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "Order Now — Pick a Platform | Premium Apex SMM World" },
      { name: "description", content: "Choose Facebook, Instagram, YouTube, TikTok or Telegram to start your order." },
      { property: "og:title", content: "Order Now — Premium Apex SMM World" },
      { property: "og:description", content: "Choose a platform and start growing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const tr = useTr();
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useQuery(platformsQuery);
  const qc = useQueryClient();
  // Warm every platform's order form so the first tap opens it fully populated.
  useEffect(() => { (data ?? []).forEach((p) => { qc.prefetchQuery(catalogQuery(p.slug)); }); }, [data, qc]);
  const sequence = ["tiktok", "instagram", "facebook", "youtube", "telegram"];
  const query = search.trim().toLowerCase();
  const platforms = [...(data ?? [])].sort((a, b) => {
    const rank = (slug: string) => sequence.includes(slug) ? sequence.indexOf(slug) : sequence.length;
    return rank(a.slug) - rank(b.slug);
  }).filter((p) => p.name.toLowerCase().includes(query));
  return (
    <div className="order-reference-page">
      <DesktopDashboard />
      <div className="lg:hidden">
      <section className="order-welcome">
        <img className="order-banner-art" src={orderBanner} alt="" width={1280} height={560} />
        <div className="order-welcome-copy">
          <span className="order-title-rocket" aria-hidden><Rocket /></span>
          <h1>{tr("Order Now")}.</h1>
          <p>{tr("Tap a platform to open its order form.")}</p>
        </div>
      </section>
      <form className="order-search" role="search" onSubmit={(e) => e.preventDefault()}>
        <Search aria-hidden />
        <input aria-label={tr("Search for a service...")} placeholder={tr("Search for a service...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" size="icon" aria-label={tr("Search")} className="order-search-submit"><Search /></Button>
      </form>
      {isError && <ErrorState />}
      {data && data.length === 0 && <Empty text={tr("No platforms available right now.")} />}
      {data && data.length > 0 && platforms.length === 0 && <Empty text={tr("No services found.")} />}
      <div className="order-platform-grid">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        {platforms.map((p) => (
          <Link key={p.id} to="/service/$platform" params={{ platform: p.slug }} title={p.name} className={`order-platform-card order-platform-${p.slug}`}>
            <span className="order-platform-logo"><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-full w-full" /></span>
            <span className="order-platform-copy"><strong>{p.name}</strong></span>
          </Link>
        ))}
      </div>
      <img className="order-growth-art" src={orderGrowth} alt="" width={1280} height={800} loading="lazy" />
      <div className="order-growth-caption" aria-hidden>{tr("Boost Your Social Media")} <span>↗</span></div>
      </div>
    </div>
  );
}
