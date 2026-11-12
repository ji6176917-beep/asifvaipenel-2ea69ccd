import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, Layers, ShoppingCart, UserRound, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { money } from "@/lib/format";
import { platformsQuery } from "@/lib/queries";
import { PlatformIcon } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { grownValue } from "@/components/LiveStats";

/** Desktop-only dashboard header for the New Order page (hidden below lg). */
export function DesktopDashboard() {
  const tr = useTr();
  const { user, profile } = useAuth();
  const { data: platforms } = useQuery(platformsQuery);
  const { data: serviceCount } = useQuery({
    queryKey: ["service-count"], staleTime: 60_000,
    queryFn: async () => (await supabase.from("services").select("id", { count: "exact", head: true }).eq("active", true).is("deleted_at", null)).count ?? 0,
  });
  const [orders, setOrders] = useState(0);
  useEffect(() => { setOrders(grownValue(100_000, 2000, 4000)); }, []);
  const name = profile?.username || profile?.full_name || tr("Guest");
  const guestTo = { to: "/sign-in" as const };
  const stats = [
    { icon: UserRound, label: tr("User Name"), value: user ? name : tr("Sign In"), to: user ? "/profile" : "/sign-in" },
    { icon: ShoppingCart, label: tr("Panel Order"), value: orders.toLocaleString(), to: user ? "/orders" : "/sign-in" },
    { icon: Layers, label: tr("All Services"), value: (serviceCount ?? 0).toLocaleString(), to: "/order" },
    { icon: Wallet, label: tr("My Balance"), value: user ? money(profile?.balance ?? 0) : tr("Sign In"), to: user ? "/balance" : "/sign-in" },
  ];
  return (
    <section className="mb-8 hidden space-y-5 text-left lg:block">
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-2xl bg-gradient-to-br from-primary to-primary/75 p-7 text-primary-foreground shadow-lg">
          <h2 className="text-3xl font-bold">{tr("Hello")}, {name} 👋</h2>
          <p className="mt-3 max-w-md opacity-90">{tr("Welcome, We are ready to provide you with the best social media services on the market.")}</p>
          {!user && <div className="mt-5 flex gap-2"><Link {...guestTo} className="rounded-lg bg-background px-4 py-2 text-sm font-semibold text-primary">{tr("Sign In")}</Link><Link to="/sign-up" className="rounded-lg border border-primary-foreground/50 px-4 py-2 text-sm font-semibold">{tr("Sign Up")}</Link></div>}
        </div>
        <Link to={user ? "/add-funds" : "/sign-in"} className="relative col-span-2 rounded-2xl bg-gradient-to-br from-primary/90 to-primary/60 p-7 text-primary-foreground shadow-lg">
          <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary"><ArrowUpRight className="h-5 w-5" /></span>
          <Gift className="h-10 w-10" />
          <h3 className="mt-3 text-2xl font-bold">{tr("Giveaway")}</h3>
          <p className="mt-2 text-sm opacity-90">{tr("Add funds, place orders and watch for special bonus offers from Apex SMM World.")}</p>
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-7 w-7" /></span>
            <span className="min-w-0"><span className="block text-sm text-muted-foreground">{s.label}</span><strong className="block truncate text-2xl text-primary">{s.value}</strong></span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3">
        {(platforms ?? []).map((p) => (
          <Link key={p.id} to="/service/$platform" params={{ platform: p.slug }} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 font-semibold shadow-sm transition hover:border-primary">
            <span className="h-6 w-6 shrink-0"><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-full w-full" /></span>
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
