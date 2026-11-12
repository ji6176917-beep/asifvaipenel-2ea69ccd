import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, Star, Layers, ShoppingCart, UserRound, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { money } from "@/lib/format";
import { platformsQuery } from "@/lib/queries";
import { PlatformIcon } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { grownValue } from "@/components/LiveStats";
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/OrderForm";
import welcomeArt from "@/assets/welcome-social.png";

export function DesktopDashboard({ orderPage = false }: { orderPage?: boolean }) {
  const tr = useTr();
  const { user, profile } = useAuth();
  const { data: platforms } = useQuery(platformsQuery);
  const { data: serviceCount } = useQuery({
    queryKey: ["service-count"], staleTime: 60_000,
    queryFn: async () => (await supabase.from("services").select("id", { count: "exact", head: true }).eq("active", true).eq("provider_available", true).is("deleted_at", null)).count ?? 0,
  });
  const [orders, setOrders] = useState(0);
  const [selected, setSelected] = useState("");
  useEffect(() => { setOrders(grownValue(1_000, 2000, 4000)); }, []);
  const name = profile?.username || profile?.full_name || tr("Guest");
  const sequence = ["youtube", "facebook", "instagram", "tiktok", "telegram", "twitter", "linkedin", "discord", "spotify", "twitch", "soundcloud", "web-traffic"];
  const sorted = [...(platforms ?? [])].sort((a, b) => {
    const rank = (s: string) => sequence.includes(s) ? sequence.indexOf(s) : sequence.length;
    return rank(a.slug) - rank(b.slug);
  });
  const platform = sorted.some((p) => p.slug === selected) ? selected : sorted[0]?.slug;
  const stats = [
    { icon: UserRound, label: tr("User Name"), value: user ? name : tr("Guest"), to: user ? "/profile" : "/sign-in" },
    { icon: ShoppingCart, label: tr("Panel Order"), value: orders.toLocaleString(), to: user ? "/orders" : "/sign-in" },
    { icon: Layers, label: tr("All Services"), value: (serviceCount ?? 0).toLocaleString(), to: user ? "/order" : "/sign-in" },
    { icon: Wallet, label: tr("My Balance"), value: user ? money(profile?.balance ?? 0) : tr("Sign In"), to: user ? "/balance" : "/sign-in" },
  ];
  const mobileOnlyOrder = orderPage ? "dd-order-desktop-only" : "";
  return <div className="desktop-dashboard">
    {orderPage && <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-lg lg:hidden">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/15" aria-hidden />
      <div className="absolute -bottom-10 right-10 h-24 w-24 rounded-full bg-primary-foreground/10" aria-hidden />
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-2.5 py-1 text-[11px] font-bold">🚀 {tr("Fast delivery")}</span>
      <h1 className="mt-2 font-display text-2xl font-bold">{tr("New Order")}</h1>
      <p className="mt-1 max-w-[16rem] text-sm opacity-90">{tr("Choose a platform below and grow your social media in minutes.")}</p>
    </section>}
    <section className={`desktop-welcome-grid ${mobileOnlyOrder}`}>
      <div className="desktop-welcome-copy">
        <img src={welcomeArt} alt="" width={816} height={816} className="welcome-art" />
        <h1>{tr("Hello")}, {name} 👋</h1>
        <p>{tr("Welcome, We are ready to provide you with the best social media services on the market.")}</p>
        <a href="https://www.trustpilot.com/review/apexsmmworld.com" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-3 py-1.5 text-sm font-bold text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/30">
          <span className="flex">{[0, 1, 2, 3].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}<Star className="h-4 w-4 fill-current opacity-50" /></span>
          4.5 <span className="font-medium opacity-90">{tr("Rating")}</span>
        </a>
        {!user && <div className="mt-4 flex gap-2"><Button asChild variant="secondary"><Link to="/sign-in">{tr("Sign In")}</Link></Button><Button asChild variant="outline" className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/sign-up">{tr("Sign Up")}</Link></Button></div>}
      </div>
      <Link to="/giveaway" className="desktop-giveaway">
        <div className="flex items-center justify-between"><Gift className="h-9 w-9" /><ArrowUpRight className="h-6 w-6" /></div>
        <h2>{tr("Giveaway")}</h2>
        <p>{tr("Complete social tasks and submit your proof for a balance reward.")}</p>
      </Link>
    </section>
    <section className={`desktop-stat-grid ${mobileOnlyOrder}`}>
      {stats.map((s) => <Link key={s.label} to={s.to} className="desktop-stat"><span className="desktop-stat-icon"><s.icon /></span><span className="desktop-stat-label">{s.label}</span><strong title={s.value}>{s.value}</strong></Link>)}
    </section>
    <div className="desktop-platform-grid" aria-label={tr("All Services")}>
      {sorted.map((p) => <Button key={p.id} variant="outline" aria-pressed={platform === p.slug} onClick={() => { setSelected(p.slug); setTimeout(() => document.getElementById("dash-order-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }} className="desktop-platform"><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-5 w-5 shrink-0" /><span>{p.name}</span></Button>)}
    </div>
    <div id="dash-order-form" className="scroll-mt-20">{platform && <OrderForm key={platform} platform={platform} desktop />}</div>
  </div>;
}
