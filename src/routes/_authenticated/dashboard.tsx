import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ShoppingCart, Clock, CheckCircle2, PlusCircle, Code2, XCircle, PiggyBank, History, Ticket, Gift, MessageCircleQuestion, UserRound, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useTr } from "@/lib/i18n";
import welcomeArt from "@/assets/welcome-social.png";
import growthArt from "@/assets/social-growth.webp";
import { FeatureBanners } from "@/components/FeatureBanners";
import boxArt from "@/assets/orders-box.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Premium Apex SMM World" },
      { name: "description", content: "Your balance, orders and quick actions at a glance." },
      { property: "og:title", content: "Dashboard | Premium Apex SMM World" },
      { property: "og:description", content: "Your account overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const tr = useTr();
  const { profile, user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: o }, { data: d }] = await Promise.all([
        supabase.from("orders").select("status,charge").eq("user_id", user!.id),
        supabase.from("deposits").select("status,amount").eq("user_id", user!.id),
      ]);
      const rows = o ?? [];
      return {
        total: rows.length,
        active: rows.filter((r) => r.status === "pending" || r.status === "processing").length,
        done: rows.filter((r) => r.status === "completed").length,
        canceled: rows.filter((r) => r.status === "canceled" || r.status === "rejected").length,
        spent: rows.filter((r) => r.status !== "canceled" && r.status !== "rejected").reduce((a, r) => a + Number(r.charge), 0),
        deposited: (d ?? []).filter((r) => r.status === "approved").reduce((a, r) => a + Number(r.amount), 0),
      };
    },
  });
  const stats = [
    { label: tr("Balance"), value: money(profile?.balance ?? 0), icon: Wallet },
    { label: tr("Total deposited"), value: money(data?.deposited ?? 0), icon: PiggyBank },
    { label: tr("Total spent"), value: money(data?.spent ?? 0), icon: Receipt },
    { label: tr("Total orders"), value: data?.total ?? "—", icon: ShoppingCart },
    { label: tr("In progress"), value: data?.active ?? "—", icon: Clock },
    { label: tr("Completed"), value: data?.done ?? "—", icon: CheckCircle2 },
    { label: tr("Canceled/Rejected"), value: data?.canceled ?? "—", icon: XCircle },
  ];
  const shortcuts = [
    { to: "/order", icon: ShoppingCart, l: tr("New Order") }, { to: "/add-funds", icon: PlusCircle, l: tr("Add Funds") },
    { to: "/orders", icon: History, l: tr("Order History") }, { to: "/add-funds/history", icon: Wallet, l: tr("Add Funds History") },
    { to: "/tickets", icon: Ticket, l: tr("My Tickets") }, { to: "/giveaway", icon: Gift, l: tr("Giveaway") },
    { to: "/reseller-api", icon: Code2, l: tr("Reseller API") }, { to: "/qna", icon: MessageCircleQuestion, l: tr("QnA") },
    { to: "/profile", icon: UserRound, l: tr("My Account") },
  ] as const;
  return (
    <div className="space-y-5">
      <section className="page-banner page-banner--multi"><div className="relative z-10"><h1>{tr("Dashboard")}</h1><p>{tr("Welcome back")}{profile?.full_name ? ", " + profile.full_name : ""}. {tr("Your balance, orders and quick actions at a glance.")}</p><div className="page-banner-stats"><span>{tr("Live status")}</span><span>{tr("Auto refund")}</span><span>{tr("24/7 support")}</span></div></div><div className="banner-art-stack"><img src={boxArt} alt="" /><img src={welcomeArt} alt="" /><img src={growthArt} alt="" /></div></section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
        {stats.map((s) => <div key={s.label} className="desktop-stat !min-h-0 !p-4"><span className="desktop-stat-icon"><s.icon /></span><span className="desktop-stat-label">{s.label}</span><strong>{s.value}</strong></div>)}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 xl:grid-cols-9">
        {shortcuts.map((s) => <Link key={s.to} to={s.to} className="profile-shortcut"><s.icon className="h-6 w-6 text-primary" /><span>{s.l}</span></Link>)}
      </div>
      <FeatureBanners items={["giveaway", "tracking"]} />
    </div>
  );
}
