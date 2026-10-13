import { useState } from "react";
import { ArrowRight, Banknote, Bell, CheckCircle2, ChevronRight, Clock, Copy, Link2, Search, StickyNote, Users, Wallet, X, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Empty, ErrorState, Spinner } from "@/components/ui-kit";
import { PlatformIcon } from "@/lib/brand";
import { useTr } from "@/lib/i18n";
import { copy, money } from "@/lib/format";
import { matchesNotification, notificationInPeriod, parseNotification, type NotificationDetails } from "@/lib/notification-format";
import apexLogo from "@/assets/apex-logo.png.asset.json";
import bkash from "@/assets/payments/bkash.png.asset.json";
import nagad from "@/assets/payments/nagad.png.asset.json";
import rocket from "@/assets/payments/rocket.png.asset.json";

export type InboxNote = { id: string; title: string; body: string | null; created_at: string; read_at: string | null; kind: string; details?: NotificationDetails | null };
const paymentLogos: Record<string, string> = { bkash: bkash.url, nagad: nagad.url, rocket: rocket.url };
const periods = [0, 3, 7, 30];

function ReferenceChip({ label, value }: { label: string; value: string }) {
  const tr = useTr();
  return <div className="notification-reference"><span>{label}</span><Button variant="ghost" size="sm" className="notification-chip" title={tr("Copy")} aria-label={`${tr("Copy")} ${value}`} onClick={() => void copy(value)}><Copy />{value}</Button></div>;
}

function NotificationItem({ note }: { note: InboxNote }) {
  const tr = useTr();
  const [expanded, setExpanded] = useState(false);
  const p = parseNotification(note.title, note.body);
  const d = note.details;
  const isOrder = p.type === "order";
  const isDeposit = p.type === "deposit";
  const isWebsite = !isOrder && !isDeposit;
  const title = isDeposit ? tr("Add Fund") : isOrder ? d?.platform_name || tr("Order") : "Apex SMM World";
  const status = p.status ? tr(p.status.charAt(0).toUpperCase() + p.status.slice(1)) : null;
  const date = new Date(note.created_at);
  const methodLogo = d?.method_name ? paymentLogos[d.method_name.toLowerCase()] : undefined;
  return <article className={`notification-item notification-item--${isDeposit ? "deposit" : isOrder ? "order" : "website"}`}>
    <div className="notification-identity">
      <div className={`notification-logo ${isDeposit ? "notification-logo--wallet" : ""}`}>
        {isDeposit ? <Wallet aria-hidden /> : isOrder && d?.platform_slug ? <PlatformIcon slug={d.platform_slug} name={d.platform_name} className="notification-platform" /> : <img src={apexLogo.url} alt="Apex SMM World" />}
        {!note.read_at && <span className="notification-unread" aria-label={tr("Unread")} />}
      </div>
      {!isDeposit && <span className="notification-kind">{tr(isOrder ? "Order" : "Website")}</span>}
    </div>
    <div className="notification-main">
      <h3>{title}</h3>
      <div className="notification-highlights">
        {(isDeposit || p.amount) && <span className="notification-amount"><Banknote />{p.amount ?? (d?.amount != null ? money(d.amount) : "—")}</span>}
        {isOrder && d?.quantity != null && <span className="notification-chip"><Users />{d.quantity.toLocaleString()} <span>{tr("Quantity")}</span></span>}
        {status && <span className={`notification-status notification-status--${p.tone}`}>{p.tone === "success" ? <CheckCircle2 /> : p.tone === "danger" ? <CircleAlert /> : <Clock />}{status}</span>}
      </div>
      {isOrder && d?.service_name && <div className="notification-service"><Link2 /><span>{tr("Service")}: <strong>{d.service_name}</strong></span></div>}
      {isOrder && d?.charge != null && <span className="notification-chip notification-charge"><Banknote />{money(d.charge)}</span>}
      {p.refund && <span className="notification-chip notification-refund"><Wallet />{tr("Refund")}: {p.refund}</span>}
      {isDeposit && <div className="notification-meta">
        <span className="notification-chip"><StickyNote />{tr("Note")}: {p.note || tr("No note")}</span>
        {d?.method_name && <div className="notification-payment"><span>{methodLogo && <img src={methodLogo} alt="" />}{d.method_name}</span><small>{tr("Payment Method")}</small></div>}
        {d?.txn_id && <ReferenceChip label={tr("Transaction ID")} value={d.txn_id} />}
      </div>}
      {p.ref && <div className="notification-references"><ReferenceChip label={tr(isDeposit ? "Add Fund ID" : "Order ID")} value={p.ref} /></div>}
      {isWebsite && <div className="notification-message"><strong>{note.title}</strong>{note.body && <p>{note.body}</p>}</div>}
      {expanded && <dl className="notification-details">
        <div><dt>{tr("Notification from")}</dt><dd>apexsmmworld.com</dd></div>
        {status && <div><dt>{tr("Status")}</dt><dd>{status}</dd></div>}
        {!isDeposit && <div><dt>{tr("Note")}</dt><dd>{p.note || tr("No note")}</dd></div>}
        {d?.bdt_amount != null && <div><dt>{tr("Amount")}</dt><dd>৳{d.bdt_amount.toLocaleString()}</dd></div>}
        {d?.link && <div><dt>{tr("Link")}</dt><dd>{d.link}</dd></div>}
      </dl>}
    </div>
    <div className="notification-time"><Clock /><time dateTime={note.created_at}><span>{date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span><small>{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small></time></div>
    <Button variant="ghost" size="icon" className="notification-expand" aria-label={`${tr("Details")}: ${note.title}`} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronRight className={expanded ? "rotate-90" : ""} /></Button>
  </article>;
}

export function NotificationPanel({ open, onOpenChange, notes, pending, error, retry }: { open: boolean; onOpenChange: (open: boolean) => void; notes: InboxNote[]; pending: boolean; error: boolean; retry: () => void }) {
  const tr = useTr();
  const [search, setSearch] = useState("");
  const [days, setDays] = useState(0);
  const [allVisible, setAllVisible] = useState(false);
  const now = Date.now();
  const searched = notes.filter(n => matchesNotification(search, n.title, n.body, n.details));
  const filtered = searched.filter(n => notificationInPeriod(n.created_at, days, now));
  const shown = allVisible ? filtered : filtered.slice(0, 3);
  return <Dialog open={open} onOpenChange={(value) => { onOpenChange(value); if (!value) { setSearch(""); setDays(0); setAllVisible(false); } }}>
    <DialogContent className="notification-panel">
      <header className="notification-panel-header">
        <span className="notification-header-icon"><Bell /><span /></span>
        <div><DialogTitle>{tr("Notifications")}</DialogTitle><DialogDescription>apexsmmworld.com</DialogDescription></div>
        <DialogClose asChild><Button variant="ghost" size="icon" className="notification-close" aria-label={tr("Close")}><X /></Button></DialogClose>
      </header>
      <div className="notification-search"><Search /><input aria-label={tr("Search notifications")} placeholder={`${tr("Search notifications")}...`} value={search} onChange={e => { setSearch(e.target.value); setAllVisible(true); }} />{search && <Button variant="ghost" size="icon" aria-label={tr("Clear search")} onClick={() => setSearch("")}><X /></Button>}</div>
      <div className="notification-periods" role="group" aria-label={tr("Time")}>
        {periods.map(period => <Button key={period} variant="ghost" aria-pressed={days === period} className="notification-period" onClick={() => { setDays(period); setAllVisible(true); }}>{period === 0 ? tr("All") : `${period}D`}<span>{searched.filter(n => notificationInPeriod(n.created_at, period, now)).length}</span></Button>)}
      </div>
      <div className="notification-list">
        {pending ? <div className="flex justify-center py-12"><Spinner /></div> : error ? <><ErrorState /><Button variant="outline" onClick={retry}>{tr("Retry")}</Button></> : filtered.length === 0 ? <Empty text={tr(search || days ? "No results found" : "No notifications yet")} /> : shown.map(note => <NotificationItem key={note.id} note={note} />)}
      </div>
      <Button variant="ghost" className="notification-view-all" onClick={() => { setDays(0); setSearch(""); setAllVisible(!allVisible); }}>{tr(allVisible ? "Show recent notifications" : "View All Notifications")}<ArrowRight /></Button>
    </DialogContent>
  </Dialog>;
}