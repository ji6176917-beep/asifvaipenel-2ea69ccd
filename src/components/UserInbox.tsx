import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Wallet, Package, ShieldCheck, Info, Hash, Clock, StickyNote, CircleDot, X, Search, Users, Banknote, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStorageUrl } from "@/lib/storage-url";
import { fmtDate, money } from "@/lib/format";
import { parseNotification, matchesNotification, type NotificationDetails, type NoteTone } from "@/lib/notification-format";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Empty, ErrorState, Spinner } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/lib/brand";
import { Link } from "@tanstack/react-router";
import { useTr } from "@/lib/i18n";

const LOGO = "/favicon-192.png";
const TONE: Record<NoteTone, string> = {
  success: "bg-success/15 text-success border-success/40",
  danger: "bg-destructive/15 text-destructive border-destructive/40",
  info: "bg-info/15 text-info border-info/40",
  warning: "bg-warning/15 text-warning border-warning/40",
  neutral: "bg-muted text-muted-foreground border-border",
};
const ICON = { deposit: Wallet, order: Package, balance: Wallet, security: ShieldCheck, info: Info };

async function showSystemNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const opts: NotificationOptions = { body, icon: LOGO, badge: "/favicon-48.png", data: { url: "/" } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/notify-sw.js") ?? await navigator.serviceWorker?.register("/notify-sw.js");
    if (reg) return reg.showNotification(title, opts);
  } catch { /* fall back below */ }
  try { new Notification(title, opts); } catch { /* unsupported */ }
}

type Note = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; kind: string; details?: NotificationDetails | null | undefined };

function NotificationCard({ n }: { n: Note }) {
  const tr = useTr();
  const p = parseNotification(n.title, n.body);
  const Icon = ICON[p.type];
  const d = n.details;
  const status = p.status ? tr(p.status.charAt(0).toUpperCase() + p.status.slice(1)) : null;
  const rows: { icon: typeof Hash; label: string; value: React.ReactNode }[] = [];
  if (d?.amount !== undefined || p.amount) rows.push({ icon: Banknote, label: tr("Amount"), value: <span className="text-lg font-bold text-foreground">{p.amount ?? money(d?.amount)}{d?.bdt_amount != null && <span className="ml-2 text-xs font-normal text-muted-foreground">৳{d.bdt_amount.toLocaleString()}</span>}</span> });
  if (p.ref) rows.push({ icon: Hash, label: tr(p.type === "deposit" ? "Add Fund ID" : "Order ID"), value: <span className="font-mono text-xs">#{p.ref}</span> });
  if (d?.quantity !== undefined) rows.push({ icon: Users, label: tr("Quantity"), value: d.quantity.toLocaleString() });
  if (d?.charge !== undefined) rows.push({ icon: Banknote, label: tr("Charge"), value: <span className="font-bold">{money(d.charge)}</span> });
  if (p.refund) rows.push({ icon: Wallet, label: tr("Refund"), value: <span className="font-semibold text-success">{p.refund}</span> });
  if (d?.method_name) rows.push({ icon: Wallet, label: tr("Payment Method"), value: d.method_name });
  if (status) rows.push({ icon: CircleDot, label: tr("Status"), value: <span className="font-medium">{status}</span> });
  rows.push({ icon: StickyNote, label: tr("Note"), value: <span className="whitespace-pre-wrap">{p.note || tr("No note")}</span> });
  rows.push({ icon: Clock, label: tr("Time"), value: <time dateTime={n.created_at} className="text-xs">{fmtDate(n.created_at)}</time> });
  return (
    <article className={`overflow-hidden rounded-lg border bg-card shadow-sm ${n.read_at ? "border-border" : "border-primary/40"}`}>
      <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-2 text-[10px] text-muted-foreground">
        <img src={LOGO} alt="" className="h-4 w-4 shrink-0 object-contain" />
        <span className="min-w-0 font-medium">{tr("Notification from")} <span className="text-primary">apexsmmworld.com</span></span>
        {!n.read_at && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label={tr("Unread")} />}
      </div>
      <div className="px-3 py-3">
        <div className="flex items-start gap-2.5 border-b border-border pb-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${TONE[p.tone]}`}>
            {p.type === "order" && d?.platform_slug ? <PlatformIcon slug={d.platform_slug} name={d.platform_name} className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1 self-center">
            <h3 className="break-words text-sm font-semibold leading-snug">{p.type === "deposit" ? tr("Add Fund") : p.type === "order" ? d?.service_name || tr("Order") : n.title}</h3>
            {d?.platform_name && <p className="mt-0.5 text-xs text-muted-foreground">{d.platform_name}</p>}
          </div>
          {status && <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold ${TONE[p.tone]}`}>{status}</span>}
        </div>
        <dl className="mt-2 divide-y divide-border text-xs">
          {rows.map((r) => <div key={r.label} className="grid grid-cols-[14px_90px_minmax(0,1fr)] items-start gap-2 py-1.5">
            <r.icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <dt className="break-words text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 break-words font-medium">{r.value}</dd>
          </div>)}
        </dl>
        {p.ref && <Button asChild variant="link" size="sm" className="mt-1 h-7 px-0 text-xs"><Link to={p.type === "deposit" ? "/add-funds/history" : "/orders"}>{tr(p.type === "deposit" ? "Add Fund ID" : "Order ID")}<ArrowUpRight /></Link></Button>}
      </div>
    </article>
  );
}

/** Bell with unread count + list, browser notifications, and show-once popups sent by support. */
export function UserInbox() {
  const tr = useTr();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [askPush, setAskPush] = useState(false);
  const key = ["notifications", user?.id];
  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: key,
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return [];
      const notes = [];
      for (let offset = 0; ; offset += 1000) {
        const { data: batch, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).order("id").range(offset, offset + 999);
        if (error) throw error;
        notes.push(...batch);
        if (batch.length < 1000) break;
      }
      const orderRefs: string[] = [], depositRefs: string[] = [];
      for (const n of notes) {
        const p = parseNotification(n.title, n.body);
        if (p.ref && p.type === "order") orderRefs.push(p.ref);
        if (p.ref && p.type === "deposit") depositRefs.push(p.ref);
      }
      const details = new Map<string, NotificationDetails>();
      for (const [type, refs] of [["order", orderRefs], ["deposit", depositRefs]] as const) {
        const unique = [...new Set(refs)];
        for (let i = 0; i < unique.length; i += 100) {
          if (type === "order") {
            const { data: rows, error } = await supabase.from("orders").select("order_code,service_name,platform_name,platform_slug,quantity,charge,link").eq("user_id", user.id).in("order_code", unique.slice(i, i + 100));
            if (error) throw error;
            rows.forEach((r) => details.set(`order:${r.order_code}`, r));
          } else {
            const { data: rows, error } = await supabase.from("deposits").select("code,amount,bdt_amount,method_name").eq("user_id", user.id).in("code", unique.slice(i, i + 100));
            if (error) throw error;
            rows.forEach((r) => details.set(`deposit:${r.code}`, r));
          }
        }
      }
      return notes.map((n) => { const p = parseNotification(n.title, n.body); return { ...n, details: details.get(`${p.type}:${p.ref}`) }; });
    },
  });

  useEffect(() => {
    if (!user || !("Notification" in window)) return;
    if (Notification.permission === "granted") { navigator.serviceWorker?.register("/notify-sw.js").catch(() => {}); return; }
    if (Notification.permission === "default" && localStorage.getItem("push_ask_dismissed") !== "1") {
      const t = setTimeout(() => setAskPush(true), 2500);
      return () => clearTimeout(t);
    }
    return;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notes-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (p) => {
          qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          const n = p.new as Note;
          if (n?.title) void showSystemNotification(n.title, n.body ?? "");
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  const enablePush = async () => {
    setAskPush(false);
    if (window.top !== window.self) { toast(tr("Open the website in its own tab to allow notifications")); return; }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await navigator.serviceWorker?.register("/notify-sw.js").catch(() => {});
      toast.success(tr("Notifications enabled"));
      void showSystemNotification("Apex SMM World", tr("You will now get order and fund updates here."));
    } else {
      localStorage.setItem("push_ask_dismissed", "1");
      toast(tr("Notifications are blocked. You can allow them from browser site settings."));
    }
  };
  const dismissPush = () => { setAskPush(false); localStorage.setItem("push_ask_dismissed", "1"); };

  const now = Date.now();
  const live = data.filter((n) => !n.expires_at || Date.parse(n.expires_at) > now);
  const filtered = live.filter((n) => matchesNotification(search, n.title, n.body, n.details));
  const unread = live.filter((n) => !n.read_at);
  const [dismissed, setDismissed] = useState<string[]>([]);
  // Show-once popups disappear after the first view; others show again each visit (session) until they expire.
  const popup = live.find((n) => n.kind === "popup" && !dismissed.includes(n.id)
    && (n.show_once ? !n.shown_at : typeof window !== "undefined" && sessionStorage.getItem(`pop_${n.id}`) !== "1"));
  const popImg = useStorageUrl("logos", popup?.image ?? null);
  const closePopup = () => {
    if (!popup) return;
    sessionStorage.setItem(`pop_${popup.id}`, "1");
    setDismissed((d) => [...d, popup.id]);
    mark([popup.id], true);
  };

  const mark = async (ids: string[], shown: boolean) => {
    if (!ids.length) return;
    await supabase.rpc("mark_my_notifications", { _ids: ids, _shown: shown });
    qc.invalidateQueries({ queryKey: key });
  };

  const openList = () => {
    if (!user) { toast(tr("Sign in to see notifications")); return; }
    setSearch("");
    setOpen(true);
    mark(unread.filter((n) => n.kind !== "popup" || n.shown_at).map((n) => n.id), false);
  };

  return (
    <>
      <Button variant="ghost" size="icon" aria-label={tr("Notifications")} className="relative rounded-full" onClick={openList}>
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="bg-brand absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </Button>
      {askPush && (
        <div role="dialog" aria-label={tr("Allow notifications")} className="fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl sm:right-4 sm:left-auto">
          <Button variant="ghost" size="icon" aria-label={tr("Close")} onClick={dismissPush} className="absolute right-2 top-2 h-7 w-7 rounded-full text-muted-foreground"><X className="h-4 w-4" /></Button>
          <div className="flex items-start gap-3">
            <img src={LOGO} alt="" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-semibold">{tr("Get instant notifications")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{tr("Order updates, fund approvals and offers right on your screen.")}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={dismissPush}>{tr("Later")}</Button>
            <Button size="sm" onClick={enablePush}><BellRing className="h-4 w-4" />{tr("Allow")}</Button>
          </div>
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-[420px]">
          <SheetHeader className="shrink-0 border-b border-border px-4 pb-4 pt-5 text-left">
            <SheetTitle className="flex items-center gap-2"><img src={LOGO} alt="" className="h-6 w-6 rounded" />{tr("Notifications")}</SheetTitle>
            <SheetDescription className="text-xs">apexsmmworld.com</SheetDescription>
          </SheetHeader>
          <div className="shrink-0 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input aria-label={tr("Search notifications")} placeholder={tr("Search notifications")} value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              {search && <Button variant="ghost" size="icon" aria-label={tr("Clear search")} className="absolute right-1 top-1 h-8 w-8" onClick={() => setSearch("")}><X /></Button>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-6 motion-safe:scroll-smooth">
            {isPending ? <div className="flex justify-center py-12"><Spinner /></div> : isError ? <><ErrorState /><Button variant="outline" onClick={() => void refetch()}>{tr("Retry")}</Button></> : filtered.length === 0 ? <Empty text={tr(search ? "No results found" : "No notifications yet")} /> : filtered.map((n) => <NotificationCard key={n.id} n={n} />)}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={!!popup} onOpenChange={(o) => { if (!o) closePopup(); }}>
        <DialogContent>
          {popImg && <img src={popImg} alt="" className="mx-auto max-h-56 rounded-2xl object-contain" />}
          <DialogTitle className="text-gradient text-2xl">{popup?.title}</DialogTitle>
          {popup?.body && <p className="whitespace-pre-wrap text-muted-foreground">{popup.body}</p>}
          {popup?.link
            ? <a href={popup.link} target={popup.link.startsWith("/") ? undefined : "_blank"} rel="noreferrer" className="btn-glow" onClick={closePopup}>{popup.button || tr("Open")}</a>
            : <Button onClick={closePopup}>{popup?.button || tr("OK")}</Button>}
        </DialogContent>
      </Dialog>
    </>
  );
}
