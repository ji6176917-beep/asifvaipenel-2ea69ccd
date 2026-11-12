import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wallet, PlusCircle, ShoppingCart, History, Receipt, TrendingUp, TrendingDown, RotateCcw, Clock, ShieldCheck, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { money } from "@/lib/format";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Wallet | Apex SMM World" },
      { name: "description", content: "Your Apex SMM World wallet balance, spending summary and recent deposits." },
      { property: "og:title", content: "Wallet | Apex SMM World" },
      { property: "og:description", content: "Wallet balance, totals and recent deposits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Balance,
});

const DONE = ["completed", "partial", "canceled", "rejected"];

function Balance() {
  const tr = useTr();
  const router = useRouter();
  const { profile, user } = useAuth();
  const { data } = useQuery({
    queryKey: ["wallet-overview", user?.id, profile?.balance],
    enabled: !!user,
    queryFn: async () => {
      const [l, o, d] = await Promise.all([
        supabase.from("wallet_ledger").select("amount,kind"),
        supabase.from("orders").select("charge,status").is("deleted_at", null),
        supabase.from("deposits").select("code,amount,method_name,status,created_at,txn_id").is("deleted_at", null).order("created_at", { ascending: false }).limit(6),
      ]);
      let added = 0, spent = 0, refunded = 0;
      (l.data ?? []).forEach((r) => {
        const a = Number(r.amount);
        if (r.kind === "deposit") added += a;
        if (r.kind === "order") spent += -a;
        if (r.kind === "refund") refunded += a;
      });
      const active = (o.data ?? []).filter((x) => !DONE.includes(String(x.status)));
      return { added, spent, refunded, activeValue: active.reduce((s, x) => s + Number(x.charge), 0), activeCount: active.length, orders: o.data?.length ?? 0, deposits: d.data ?? [] };
    },
  });

  const stats = [
    { label: "Total Deposited", value: money(data?.added), icon: TrendingUp },
    { label: "Total Spent", value: money(data?.spent), icon: TrendingDown },
    { label: "Total Refunded", value: money(data?.refunded), icon: RotateCcw },
    { label: "In-Progress Value", value: money(data?.activeValue), icon: Clock },
  ];
  const actions = [
    { to: "/add-funds", label: "Add Funds", icon: PlusCircle, main: true },
    { to: "/order", label: "New Order", icon: ShoppingCart },
    { to: "/orders", label: "Order History", icon: History },
    { to: "/add-funds/history", label: "Deposit History", icon: Receipt },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground shadow-lg sm:p-7">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-16 right-20 h-44 w-44 rounded-full bg-primary-foreground/10" />
        <button onClick={() => router.history.back()} className="relative inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1.5 text-sm font-semibold hover:bg-primary-foreground/25">
          <ArrowLeft className="h-4 w-4" />{tr("Back")}
        </button>
        <div className="relative mt-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm opacity-90">{tr("Apex Wallet — your balance and full transaction summary")}</div>
            <div className="mt-1 text-xs uppercase tracking-wider opacity-80">{tr("Available balance (USD)")}</div>
            <div className="font-display text-4xl font-extrabold sm:text-6xl">{money(profile?.balance)}</div>
            <div className="mt-2 text-xs opacity-85">{data?.orders ?? 0} {tr("orders")} · {data?.activeCount ?? 0} {tr("in progress")}</div>
          </div>
          <Wallet className="hidden h-24 w-24 opacity-30 sm:block" />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
            <div className="text-xs text-muted-foreground">{tr(s.label)}</div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-semibold transition hover:-translate-y-0.5 ${"main" in a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
            <a.icon className="h-5 w-5" />{tr(a.label)}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <ShieldCheck className="mb-2 h-7 w-7 text-primary" />
            <b>{tr("Secure wallet")}</b>
            <p className="text-sm text-muted-foreground">{tr("Every balance change is recorded and verified on our server.")}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Zap className="mb-2 h-7 w-7 text-primary" />
            <b>{tr("Instant top-up")}</b>
            <p className="text-sm text-muted-foreground">{tr("bKash, Nagad, Binance and USDT deposits are added to your balance quickly.")}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between"><b>{tr("Recent Deposits")}</b><Link to="/add-funds/history" className="text-sm font-semibold text-primary">{tr("View all")}</Link></div>
          {data?.deposits.length ? (
            <ul className="divide-y divide-border">
              {data.deposits.map((d) => (
                <li key={d.code} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold">{d.method_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()} · {d.txn_id}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{money(d.amount)}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.status === "approved" ? "bg-primary/10 text-primary" : d.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{tr(String(d.status))}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="py-6 text-center text-sm text-muted-foreground">{tr("No deposits yet")}</p>}
        </div>
      </div>
    </div>
  );
}
