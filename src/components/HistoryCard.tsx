import type { ReactNode } from "react";
import { Banknote, Clock, StickyNote } from "lucide-react";
import { Copyable, StatusBadge } from "@/components/ui-kit";
import { useTr } from "@/lib/i18n";
import { fmtDate } from "@/lib/format";
import { MethodLogo } from "@/lib/brand";
import bkash from "@/assets/payments/bkash.png.asset.json";
import nagad from "@/assets/payments/nagad.png.asset.json";
import rocket from "@/assets/payments/rocket.png.asset.json";

const logos: Record<string, string> = { bkash: bkash.url, nagad: nagad.url, rocket: rocket.url };
export function HistoryPaymentLogo({ name, kind, logo }: { name: string; kind: string; logo?: string | null }) {
  const officialLogo = Object.entries(logos).find(([key]) => name.toLowerCase().includes(key))?.[1];
  return <MethodLogo name={name} kind={kind} logo={logo} officialLogo={officialLogo} className="history-payment-logo" />;
}

export function HistoryCard({ type, logo, title, reference, status, amount, createdAt, note, children }: {
  type: "order" | "deposit"; logo: ReactNode; title: string; reference: string; status: string;
  amount: string; createdAt: string; note: string | null; children: ReactNode;
}) {
  const tr = useTr();
  return <article className={`history-card notification-item--${type}`}>
    <div className="history-identity">{logo}</div>
    <div className="history-main">
      <div className="history-heading"><h3>{title}</h3><StatusBadge status={status} /></div>
      <div className="history-highlights"><span className="notification-amount"><Banknote />{amount}</span><span className="history-reference">{tr(type === "order" ? "Order ID" : "Add Fund ID")} <Copyable value={reference} /></span></div>
      <div className="history-body">{children}</div>
      <div className="history-note"><StickyNote /> <span>{tr("Note")}: {note || tr("No note")}</span></div>
      <time className="history-time" dateTime={createdAt}><Clock />{fmtDate(createdAt)}</time>
    </div>
  </article>;
}