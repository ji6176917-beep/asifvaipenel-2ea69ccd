import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStorageUrl } from "@/lib/storage-url";
import { parseNotification, type NotificationDetails } from "@/lib/notification-format";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NotificationPanel } from "@/components/NotificationPanel";
import { useTr } from "@/lib/i18n";

const LOGO = "/favicon-192.png";
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

/** Bell with unread count + list, browser notifications, and show-once popups sent by support. */
export function UserInbox() {
  const tr = useTr();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
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
            const { data: rows, error } = await supabase.from("deposits").select("code,amount,bdt_amount,method_name,txn_id").eq("user_id", user.id).in("code", unique.slice(i, i + 100));
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
      <NotificationPanel open={open} onOpenChange={setOpen} notes={live} pending={isPending} error={isError} retry={() => void refetch()} />
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
