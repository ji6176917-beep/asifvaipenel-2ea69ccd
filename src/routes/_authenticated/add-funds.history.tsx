import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { Wallet, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HistoryCard, HistoryPaymentLogo } from "@/components/HistoryCard";
import { money } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import fundsArt from "@/assets/funds-social-banner.jpg";
import growthArt from "@/assets/social-growth.webp";

export const Route = createFileRoute("/_authenticated/add-funds/history")({
  head: () => ({
    meta: [
      { title: "Add Funds History | Premium Apex SMM World" },
      { name: "description", content: "Track all your Add Funds requests and their status." },
      { property: "og:title", content: "Add Funds History | Premium Apex SMM World" },
      { property: "og:description", content: "Your Add Funds requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string } => typeof search["q"] === "string" ? { q: search["q"] } : {},
  component: History,
});

const TABS = ["all", "pending", "approved", "rejected", "cancelled"] as const;

function History() {
  const { user } = useAuth();
  const tr = useTr();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("all");
  const reference = Route.useSearch().q ?? "";
  const [q, setQ] = useState(reference);
  useEffect(() => { setQ(reference); setTab("all"); }, [reference]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["deposits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("deposits").select("*, payment_methods(logo_url)").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`deps-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["deposits"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const all = data ?? [];
  const term = q.trim().toLowerCase();
  const list = all.filter((d) => (tab === "all" || d.status === tab) && (!term || d.code.toLowerCase().includes(term) || d.txn_id.toLowerCase().includes(term)));
  const stats = [
    { l: tr("Total requests"), v: all.length },
    { l: tr("Approved"), v: all.filter((d) => d.status === "approved").length },
    { l: tr("Pending"), v: all.filter((d) => d.status === "pending").length },
    { l: tr("Rejected"), v: all.filter((d) => d.status === "rejected" || d.status === "cancelled").length },
    { l: tr("Approved amount"), v: money(all.filter((d) => d.status === "approved").reduce((a, d) => a + Number(d.amount), 0)) },
  ];

  return (
    <div className="space-y-4">
      <section className="page-banner page-banner--multi"><div className="relative z-10"><h1>{tr("Add Funds History")}</h1><p>{tr("Track all your Add Funds requests and their status.")}</p><div className="page-banner-stats"><span>{tr("Instant top-up")}</span><span>bKash · Nagad · USDT</span><span>{tr("24/7 support")}</span></div></div><div className="banner-art-stack"><img src={fundsArt} alt="" /><img src={growthArt} alt="" /></div></section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
        {stats.map((s) => <Card key={s.l} className="!p-4 text-center"><div className="text-xs text-muted-foreground">{s.l}</div><div className="font-display text-xl font-bold">{s.v}</div></Card>)}
      </div>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" /><input className={`${inputCls} pl-12`} aria-label={tr("Search by Add Fund ID or transaction ID")} placeholder={tr("Search by Add Fund ID or transaction ID")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="tab-pills">
        {TABS.map((t) => <Button variant="ghost" key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className="tab-pill">{tr(t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1))}</Button>)}
      </div>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-32 rounded-3xl" />}
      {data && list.length === 0 && <Empty text={tr("No Add Funds requests yet.")} />}
      <div className="grid gap-3">
        {list.map((d) => (
          <HistoryCard key={d.id} type="deposit" logo={<div className="notification-logo notification-logo--wallet"><Wallet /></div>} title={tr("Add Fund")} reference={d.code} status={d.status} amount={money(d.amount)} createdAt={d.created_at} note={d.admin_note}>
            <div className="history-chips">
              <span className="history-payment"><HistoryPaymentLogo name={d.method_name} kind={d.method_kind} logo={d.payment_methods?.logo_url} />{d.method_name}</span>
              <span className="notification-chip">{tr("Transaction ID")}: <Copyable value={d.txn_id} /></span>
              {d.bdt_amount != null && <span className="notification-chip">৳{Number(d.bdt_amount).toFixed(2)}</span>}
            </div>
          </HistoryCard>
        ))}
      </div>
      <div className="action-duo"><Link to="/add-funds" className="action-duo-btn action-duo-btn--primary"><Wallet className="h-5 w-5" />{tr("Add Funds")}</Link><Link to="/order" className="action-duo-btn"><ShoppingCart className="h-5 w-5" />{tr("Buy Service")}</Link></div>
    </div>
  );
}
