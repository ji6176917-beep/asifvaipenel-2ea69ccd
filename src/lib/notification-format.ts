export type NoteType = "deposit" | "order" | "balance" | "security" | "info";
export type NoteTone = "success" | "danger" | "info" | "warning" | "neutral";
export type ParsedNote = {
  type: NoteType;
  tone: NoteTone;
  ref?: string | undefined;
  amount?: string | undefined;
  status?: string | undefined;
  note?: string | undefined;
  refund?: string | undefined;
};

const STATUS_TONE: Record<string, NoteTone> = {
  approved: "success", completed: "success", added: "success",
  rejected: "danger", canceled: "danger", cancelled: "danger", reversed: "danger", deducted: "danger",
  processing: "info", partial: "warning", pending: "warning",
};

/** Turns a plain notification title/body into structured rows for the inbox card. */
export function parseNotification(title: string, body?: string | null): ParsedNote {
  const t = title.trim();
  const b = (body ?? "").trim();
  const dep = t.match(/^Add Fund #(\S+)\s+(?:(?:was|is now|is)\s+)?(approved|rejected|pending|cancelled)/i);
  if (dep) {
    const status = (dep[2] ?? "").toLowerCase();
    return { type: "deposit", tone: STATUS_TONE[status] ?? "neutral", ref: dep[1], status, note: b || undefined };
  }
  const ord = t.match(/^Order #(\S+)\s+(?:(?:was|is now|is)\s+)?(partially completed|completed|processing|rejected|pending|cancelled|canceled|partial)/i);
  if (ord) {
    const status = (ord[2] ?? "").toLowerCase().replace("partially completed", "partial");
    const lines = b.split("\n");
    const refund = b.match(/Refunded (\$[\d.,]+) to your balance\./i)?.[1];
    const note = lines.filter((line) => !/^.* × \d+$/.test(line) && !/^Refunded \$[\d.,]+ to your balance\.$/i.test(line)).join("\n");
    return { type: "order", tone: STATUS_TONE[status] ?? "neutral", ref: ord[1], status, refund, note: note || undefined };
  }
  if (/^Balance (added|deducted)/i.test(t)) {
    const status = /deducted/i.test(t) ? "deducted" : "added";
    const m = b.match(/^([+-]?\$[\d.,]+)\s*(?:[—-]\s*(.*))?$/);
    return { type: "balance", tone: STATUS_TONE[status] ?? "neutral", status, amount: m?.[1], note: (m ? m[2] : b) || undefined };
  }
  if (/password|security|sign/i.test(t)) return { type: "security", tone: "warning", note: b || undefined };
  return { type: "info", tone: "neutral", note: b || undefined };
}

export type NotificationDetails = {
  amount?: number; bdt_amount?: number | null; method_name?: string; txn_id?: string;
  service_name?: string; platform_name?: string; platform_slug?: string;
  quantity?: number; charge?: number; link?: string;
};

export function notificationDestination(title: string, body?: string | null) {
  const parsed = parseNotification(title, body);
  if (parsed.type === "deposit") return { to: "/add-funds/history" as const, search: { q: parsed.ref ?? "" } };
  if (parsed.type === "order") return { to: "/orders" as const, search: { q: parsed.ref ?? "" } };
  if (parsed.type === "balance") return { to: "/balance" as const, search: {} };
  if (parsed.type === "security") return { to: "/profile" as const, search: {} };
  return null;
}

export function matchesNotification(query: string, title: string, body: string | null, details?: NotificationDetails | null) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const text = [title, body, details?.service_name, details?.platform_name, details?.method_name, details?.txn_id].filter(Boolean).join(" ").toLocaleLowerCase();
  return words.every((word) => text.includes(word));
}

export function notificationInPeriod(createdAt: string, days: number, now: number) {
  if (days === 0) return true;
  const timestamp = Date.parse(createdAt);
  return Number.isFinite(timestamp) && timestamp <= now && timestamp >= now - days * 86400000;
}
