import { ListOrdered, Loader, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { requestRefill, refreshMyRefills } from "@/lib/refill.functions";
import { FeatureBanners } from "@/components/FeatureBanners";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Users, ShoppingCart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PlatformIcon } from "@/lib/brand";
import { friendlyError, money } from "@/lib/format";
import { Empty, ErrorState, inputCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { HistoryCard } from "@/components/HistoryCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useTr } from "@/lib/i18n";
import ordersArt from "@/assets/orders-box.png";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "Order History | Premium Apex SMM World" },
      { name: "description", content: "Track every order and its delivery status in real time." },
      { property: "og:title", content: "Order History | Premium Apex SMM World" },
      { property: "og:description", content: "Your orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { q?: string } => typeof search["q"] === "string" ? { q: search["q"] } : {},
  component: Orders,
});

const TABS = [
  { k: "all", l: "All" }, { k: "pending", l: "Pending" }, { k: "processing", l: "Processing" },
  { k: "completed", l: "Completed" }, { k: "partial", l: "Partial" }, { k: "rejected", l: "Rejected/Canceled" },
] as const;
const PAGE = 20;
const FLOW = ["pending", "processing", "completed"];

function Orders() {
  const tr = useTr();
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>("all");
  const reference = Route.useSearch().q ?? "";
  const [q, setQ] = useState(reference);
  const [term, setTerm] = useState(reference);
  useEffect(() => { setQ(reference); setTerm(reference); setTab("all"); }, [reference]);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  const query = useInfiniteQuery({
    queryKey: ["orders", user?.id, tab, term],
    enabled: !!user,
    refetchInterval: 30000,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!user) return [];
      let r = supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).range(pageParam, pageParam + PAGE - 1);
      if (tab === "rejected") r = r.in("status", ["rejected", "canceled"]);
      else if (tab !== "all") r = r.eq("status", tab as "pending");
      if (term) {
        const safe = term.replace(/[%,()]/g, "");
        r = r.or(`order_code.ilike.%${safe}%,service_name.ilike.%${safe}%,link.ilike.%${safe}%`);
      }
      const { data, error } = await r;
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`orders-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["orders"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const cancel = async (id: string) => {
    if (!confirm(tr("Cancel this order? The full amount will be refunded."))) return;
    const { error } = await supabase.rpc("cancel_my_order", { _order_id: id });
    if (error) { toast.error(friendlyError(error.message)); return; }
    toast.success(tr("Order canceled and refunded"));
    refreshProfile();
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  const list = query.data?.pages.flat() ?? [];
  const refillFn = useServerFn(requestRefill);
  const refreshRefillsFn = useServerFn(refreshMyRefills);
  const [refilling, setRefilling] = useState<string | null>(null);
  const activeRefills = list.some((o) => o.refill_id && ["pending", "in progress", "processing"].includes(o.refill_status ?? ""));
  useEffect(() => {
    if (!user || !activeRefills) return;
    const run = () => { void refreshRefillsFn().then(() => qc.invalidateQueries({ queryKey: ["orders"] })).catch(() => {}); };
    run(); const t = setInterval(run, 60000); return () => clearInterval(t);
  }, [user, activeRefills, refreshRefillsFn, qc]);
  const refill = async (id: string) => {
    setRefilling(id);
    try {
      const r = await refillFn({ data: { orderId: id } });
      if (r.ok) toast.success(tr("Refill request sent to provider")); else toast.error(tr(r.error));
    } catch { toast.error(tr("Refill failed")); }
    setRefilling(null);
    qc.invalidateQueries({ queryKey: ["orders"] });
  };

  return (
    <div className="space-y-4">
      <section className="page-banner"><div className="relative z-10"><h1>{tr("Order History")}</h1><p>{tr("Track every order and its delivery status in real time.")}</p><div className="page-banner-stats"><span>{tr("Live status")}</span><span>{tr("Auto refund")}</span><span>{tr("24/7 support")}</span></div></div><img src={ordersArt} alt="" width={816} height={816} /></section>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" /><input className={`${inputCls} pl-12`} aria-label={tr("Search by Order ID, service or link")} placeholder={tr("Search by Order ID, service or link")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="tab-pills">
        {TABS.map((t) => <Button variant="ghost" key={t.k} onClick={() => setTab(t.k)} aria-pressed={tab === t.k} className="tab-pill">{tr(t.l)}</Button>)}
      </div>
      {query.isError && <ErrorState />}
      {query.isLoading && <Skeleton className="h-40 rounded-3xl" />}
      {query.isSuccess && list.length === 0 && <Empty text={tr("No orders found.")} />}
      {query.isSuccess && list.length > 0 && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{([["Total", list.length, ListOrdered, "text-primary bg-primary/10"], ["In progress", list.filter((o) => o.status === "pending" || o.status === "processing").length, Loader, "text-amber-600 bg-amber-500/10"], ["Completed", list.filter((o) => o.status === "completed").length, CheckCircle2, "text-emerald-600 bg-emerald-500/10"], ["Canceled/Rejected", list.filter((o) => o.status === "canceled" || o.status === "rejected").length, XCircle, "text-destructive bg-destructive/10"]] as const).map(([l, v, Icon, c]) => <div key={l} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c}`}><Icon className="h-5 w-5" /></span><div className="flex min-w-0 flex-col gap-1"><span className="truncate text-xs font-semibold leading-tight text-muted-foreground">{tr(l)}</span><strong className="font-display text-2xl font-extrabold leading-none text-foreground">{v}</strong></div></div>)}</div>}
      <div className="grid gap-3">
        {list.map((o) => {
          const step = FLOW.indexOf(o.status);
          return (
            <HistoryCard key={o.id} type="order" logo={<PlatformIcon slug={o.platform_slug} className="history-platform-logo" />} title={o.platform_name || tr("Order")} reference={o.order_code} status={o.dispatch_state === "canceling" && ["pending", "processing"].includes(o.status) ? "Canceling" : o.status} amount={money(o.charge)} createdAt={o.created_at} note={o.admin_note}>
              <div className="history-service">{o.service_name}</div>
              <div className="history-chips"><span className="notification-chip"><Users />{tr("Quantity")}: {o.quantity}</span><span className="notification-chip">{o.category_name}</span>
                {o.delivered_qty != null && <span className="notification-chip">{tr("Delivered")}: {o.delivered_qty}</span>}
                {Number(o.refunded) > 0 && <span className="notification-chip">{tr("Refunded")}: {money(o.refunded)}</span>}
              </div>
              <a href={o.link} target="_blank" rel="noreferrer" className="history-link">{o.link}</a>
              {step >= 0 && <div className="flex items-center gap-1 pt-1">{FLOW.map((f, i) => <div key={f} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} title={tr(f)} />)}</div>}
              {o.refill_status && o.refill_status !== "sending" && <div className="history-chips"><span className={`notification-chip ${o.refill_status === "completed" ? "text-emerald-600" : o.refill_status === "rejected" || o.refill_status === "failed" || o.refill_status === "canceled" ? "text-destructive" : "text-amber-600"}`}><RefreshCw />{tr("Refill")}: {tr(o.refill_status.replace(/^./, (c) => c.toUpperCase()))}{o.refill_id ? ` #${o.refill_id}` : ""}</span>{o.refill_error && <span className="notification-chip text-destructive">{tr(o.refill_error)}</span>}</div>}
              {["completed", "partial"].includes(o.status) && o.provider_order_id && !["pending", "in progress", "processing", "sending"].includes(o.refill_status ?? "") && <Button variant="outline" size="sm" disabled={refilling === o.id} onClick={() => void refill(o.id)} className="h-8 w-fit gap-1.5 text-xs"><RefreshCw className={`h-3.5 w-3.5 ${refilling === o.id ? "animate-spin" : ""}`} />{tr("Refill")}</Button>}
              {o.status === "pending" && !o.provider_id && <Button variant="ghost" size="sm" onClick={() => void cancel(o.id)} className="h-7 px-0 text-xs text-destructive">{tr("Cancel order")}</Button>}
            </HistoryCard>
          );
        })}
      </div>
      {query.hasNextPage && <Button variant="ghost" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} className="btn-ghost-glow w-full">{tr("Load more")}</Button>}
      <div className="action-duo"><Link to="/order" className="action-duo-btn action-duo-btn--primary"><ShoppingCart className="h-5 w-5" />{tr("Buy Service")}</Link><Link to="/add-funds" className="action-duo-btn"><Wallet className="h-5 w-5" />{tr("Add Funds")}</Link></div>
      <FeatureBanners items={["tracking", "giveaway"]} />
    </div>
  );
}
