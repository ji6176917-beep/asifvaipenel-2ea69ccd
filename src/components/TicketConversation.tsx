import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminAttachmentUrl } from "@/lib/community.functions";
import { type Ticket } from "@/lib/community";
import { useTr } from "@/lib/i18n";

export function TicketConversation({ ticket, onClose, onReply, admin = false }: { ticket: Ticket | undefined; onClose: () => void; onReply: (body: string, status: "pending" | "answered" | "closed") => Promise<void>; admin?: boolean }) {
  const tr = useTr(); const [body, setBody] = useState(""); const [busy, setBusy] = useState(false); const [status, setStatus] = useState<"pending" | "answered" | "closed">("answered");
  const getAdminUrl = useServerFn(adminAttachmentUrl);
  const file = async (path: string) => {
    if (!ticket) return;
    try {
      let url: string;
      if (admin) url = await getAdminUrl({ data: { id: ticket.id, path } });
      else { const r = await supabase.storage.from("support-attachments").createSignedUrl(path, 60); if (r.error || !r.data) throw new Error("Attachment unavailable"); url = r.data.signedUrl; }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch { toast.error(tr("Attachment unavailable")); }
  };
  const send = async () => { if (!body.trim()) return; setBusy(true); try { await onReply(body, status); setBody(""); } catch { toast.error(tr("Unable to reply")); } finally { setBusy(false); } };
  return <Dialog open={!!ticket} onOpenChange={(o) => !o && onClose()}><DialogContent className="sm:max-w-xl"><DialogTitle>{tr("Ticket")} #{ticket?.ticket_no} · {ticket && tr(ticket.subject)}</DialogTitle>
    <p className="text-sm text-muted-foreground">{ticket && tr(ticket.subcategory)} · {ticket && tr(ticket.status)} {ticket?.order_codes.length ? `· #${ticket.order_codes.join(", #")}` : ""}</p>
    <div className="max-h-[45vh] space-y-4 overflow-y-auto">{ticket?.messages.map((m, i) => <div key={i} className={`rounded-md border border-border p-3 ${m.author === "admin" ? "bg-secondary" : "bg-muted"}`}><div className="mb-2 flex justify-between gap-3 text-xs text-muted-foreground"><strong>{tr(m.author === "admin" ? "Support Team" : "You")}</strong><time>{new Date(m.created_at).toLocaleString()}</time></div><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>{m.attachments.map((a) => <Button key={a.path} variant="link" className="max-w-full px-0" onClick={() => file(a.path)}><Paperclip className="shrink-0" /><span className="truncate">{a.name}</span></Button>)}</div>)}</div>
    {(admin || ticket?.status !== "closed") && <><Textarea aria-label={tr("Reply")} value={body} onChange={(e) => setBody(e.target.value)} placeholder={tr("Reply")} maxLength={5000} />{admin && <select aria-label="Ticket status" className="rounded-md border border-input bg-background p-2" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="answered">Answered</option><option value="pending">Pending</option><option value="closed">Closed</option></select>}<Button disabled={busy || !body.trim()} onClick={send}><Send />{tr("Send Reply")}</Button></>}
  </DialogContent></Dialog>;
}