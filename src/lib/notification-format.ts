export type NoteType = "deposit" | "order" | "balance" | "security" | "info";
export type NoteTone = "success" | "danger" | "info" | "warning" | "neutral";
export type ParsedNote = {
  type: NoteType;
  tone: NoteTone;
  ref?: string | undefined;
  amount?: string | undefined;
  status?: string | undefined;
  note?: string | undefined;
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
  const dep = t.match(/^Add Fund #(\S+)\s+(?:was|is now)\s+(\w+)/i);
  if (dep) {
    const status = dep[2].toLowerCase();
    return { type: "deposit", tone: STATUS_TONE[status] ?? "neutral", ref: dep[1], status, note: b || undefined };
  }
  const ord = t.match(/^Order #(\S+)\s+(?:was|is now)\s+(\w+)/i);
  if (ord) {
    const status = ord[2].toLowerCase();
    return { type: "order", tone: STATUS_TONE[status] ?? "neutral", ref: ord[1], status, note: b || undefined };
  }
  if (/^Balance (added|deducted)/i.test(t)) {
    const status = /deducted/i.test(t) ? "deducted" : "added";
    const m = b.match(/^([+-]?\$[\d.,]+)\s*(?:[—-]\s*(.*))?$/);
    return { type: "balance", tone: STATUS_TONE[status], status, amount: m?.[1], note: (m ? m[2] : b) || undefined };
  }
  if (/password|security|sign/i.test(t)) return { type: "security", tone: "warning", note: b || undefined };
  return { type: "info", tone: "neutral", note: b || undefined };
}
