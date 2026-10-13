import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Wallet, Package, ShieldCheck, Info, Hash, Clock, StickyNote, CircleDot, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStorageUrl } from "@/lib/storage-url";
import { fmtDate } from "@/lib/format";
import { parseNotification, type NoteTone } from "@/lib/notification-format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Empty } from "@/components/ui-kit";
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

type Note = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; kind: string };

function NotificationCard({ n }: { n: Note }) {
  const tr = useTr();
  const p = parseNotification(n.title, n.body);
  const Icon = ICON[p.type];
  const rows: { icon: typeof Hash; label: string; value: React.ReactNode }[] = [];
  if (p.ref) rows.push({ icon: Hash, label: p.type === "deposit" ? tr("Add Fund ID") : tr("Order ID"), value: <span className="font-mono">{p.ref}</span> });
  if (p.status) rows.push({ icon: CircleDot, label: tr("Status"), value: <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${TONE[p.tone]}`}>{tr(p.status.charAt(0).toUpperCase() + p.status.slice(1))}</span> });
  rows.push({ icon: StickyNote, label: tr("Note"), value: p.note ? <span className="whitespace-pre-wrap">{p.note}</span> : <span className="text-muted-foreground">{tr("No note")}</span> });
  rows.push({ icon: Clock, label: tr("Time"), value: fmtDate(n.created_at) });
  return (
    <div className={`overflow-hidden rounded-2xl border bg-card shadow-sm ${n.read_at ? "border-border" : "border-primary/40"}`}>
      <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 text-[11px] text-muted-foreground">
        <img src={LOGO} alt="" className="h-4 w-4 rounded" />
        <span className="font-medium">{tr("Notification from")} <span className="text-primary">apexsmmworld.com</span></span>
        {!n.read_at && <span className="ml-auto h-2 w-2 rounded-full bg-primary" aria-label={tr("Unread")} />}
      </div>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${TONE[p.tone]}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{n.title}</p>
            {p.amount && <p className={`mt-0.5 text-xl font-bold ${p.tone === "danger" ? "text-destructive" : "text-success"}`}>{p.amount}</p>}
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 rounded-xl bg-muted/50 p-2.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-2">
              <r.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <dt className="w-24 shrink-0 text-muted-foreground">{r.label}</dt>
              <dd className="min-w-0 flex-1 break-words font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Bell with unread count + list, browser notifications, and show-once popups sent by support. */
export function UserInbox() {
  const tr = useTr();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [askPush, setAskPush] = useState(false);
  const key = ["notifications", user?.id];
  const { data = [] } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
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
    setOpen(true);
    mark(unread.filter((n) => n.kind !== "popup" || n.shown_at).map((n) => n.id), false);
  };

  return (
    <>
      <button aria-label={tr("Notifications")} className="relative rounded-full p-2 hover:bg-accent" onClick={openList}>
        <Bell className="h-5 w-5" />
        {unread.length > 0 && (
          <span className="bg-brand absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-primary-foreground">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>
      {askPush && (
        <div role="dialog" aria-label={tr("Allow notifications")} className="fixed inset-x-3 top-16 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl sm:right-4 sm:left-auto">
          <button aria-label={tr("Close")} onClick={dismissPush} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
          <div className="flex items-start gap-3">
            <img src={LOGO} alt="" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-semibold">{tr("Get instant notifications")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{tr("Order updates, fund approvals and offers right on your screen.")}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={dismissPush} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent">{tr("Later")}</button>
            <button onClick={enablePush} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><BellRing className="h-4 w-4" />{tr("Allow")}</button>
          </div>
        </div>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2"><img src={LOGO} alt="" className="h-6 w-6 rounded" />{tr("Notifications")}</SheetTitle>
            <p className="text-xs text-muted-foreground">{tr("Notification from")} apexsmmworld.com</p>
          </SheetHeader>
          <div className="mt-2 space-y-3 overflow-y-auto px-4 pb-6">
            {live.length === 0 ? <Empty text={tr("No notifications yet")} /> : live.map((n) => <NotificationCard key={n.id} n={n} />)}
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
            : <button className="btn-glow" onClick={closePopup}>{popup?.button || tr("OK")}</button>}
        </DialogContent>
      </Dialog>
    </>
  );
}
