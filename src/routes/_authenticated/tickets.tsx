import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { Search, Paperclip, Send, Ticket as TicketIcon, PackageSearch, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { giveawayQuery, ticketsQuery } from "@/lib/community-queries";
import { submitTicket, replyTicket } from "@/lib/community.functions";
import { subjects, subcategories, parseOrderCodes, filterTickets, type Ticket } from "@/lib/community";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TicketConversation } from "@/components/TicketConversation";
import headset from "@/assets/support-headset.png";
import ordersArt from "@/assets/orders-box.png";

export const Route = createFileRoute("/_authenticated/tickets")({
  validateSearch: (s) => z.object({ task: z.string().max(80).optional() }).parse(s),
  loader: async ({ context }) => { await Promise.all([context.queryClient.ensureQueryData(ticketsQuery), context.queryClient.ensureQueryData(giveawayQuery)]); },
  head: () => ({ meta: [{ title: "My Tickets & Tracking | Apex SMM World" }, { name: "description", content: "Track your Apex SMM World orders and contact support through your private tickets." }, { property: "og:title", content: "My Tickets & Tracking | Apex SMM World" }, { property: "og:description", content: "Your support conversations and current order status." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Tickets,
});
function Tickets() {
  const tr = useTr(); const { user } = useAuth(); const qc = useQueryClient();
  const { data } = useSuspenseQuery(ticketsQuery); const { data: config } = useSuspenseQuery(giveawayQuery);
  const taskId = Route.useSearch().task;
  const [subject, setSubject] = useState<(typeof subjects)[number]>(taskId ? "Giveaway" : "Order");
  const [sub, setSub] = useState(taskId ? "Submit Your Proof" : "Refill");
  const [codes, setCodes] = useState(""); const [body, setBody] = useState(""); const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [view, setView] = useState("tickets"); const [selected, setSelected] = useState<string>();
  const submit = useServerFn(submitTicket); const reply = useServerFn(replyTicket);
  useEffect(() => { if (taskId) { setSubject("Giveaway"); setSub("Submit Your Proof"); } }, [taskId]);
  const task = config.tasks.find((t) => t.id === taskId);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || busy) return; setBusy(true); setError("");
    const uploaded: string[] = [];
    try {
      const order_codes = parseOrderCodes(codes);
      if (subject === "Order" && !order_codes.length) throw new Error("Enter valid order IDs belonging to your account");
      if (order_codes.some((c) => !/^\d{1,20}$/.test(c))) throw new Error("Enter valid order IDs belonging to your account");
      if (subject === "Giveaway" && !task) throw new Error("Select a giveaway task first");
      const attachments = [];
      for (const f of files) {
        const extension = f.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const r = await supabase.storage.from("support-attachments").upload(path, f);
        if (r.error) throw new Error("Attachment upload failed"); uploaded.push(path); attachments.push({ path, name: f.name.slice(0, 150) });
      }
      const ticket = await submit({ data: { subject, subcategory: sub, order_codes, body, attachments, task_id: subject === "Giveaway" ? taskId : undefined, idempotency_key: crypto.randomUUID() } });
      setBody(""); setCodes(""); setFiles([]); setSelected(ticket.id); await qc.invalidateQueries({ queryKey: ticketsQuery.queryKey }); toast.success(tr("Ticket submitted"));
    } catch (e) { if (uploaded.length) await supabase.storage.from("support-attachments").remove(uploaded); setError(tr(e instanceof Error ? e.message : "Unable to submit ticket")); }
    finally { setBusy(false); }
  };
  const rows = filterTickets(data.tickets, q, status);
  const orders = data.orders.filter((o) => `${o.order_code} ${o.service_name} ${o.status}`.toLowerCase().includes(q.toLowerCase()));
  return <div className="community-page"><section className="community-banner"><div><h1>{tr("My Tickets")}</h1><p>{tr("Track your orders and contact our support team.")}</p></div><img src={headset} alt="" width={816} height={816} /></section>
    <div className="tickets-layout"><section className="ticket-tool"><header><TicketIcon /><h2>{tr("Create Ticket")}</h2></header><form onSubmit={send} className="space-y-4 p-5">
      <div><label htmlFor="ticket-subject">{tr("Subject")}</label><select id="ticket-subject" value={subject} onChange={(e) => { const s = e.target.value as typeof subject; setSubject(s); setSub(subcategories[s][0] ?? "Other"); }}>{subjects.map((s) => <option key={s} value={s}>{tr(s)}</option>)}</select></div>
      <div><label htmlFor="ticket-category">{tr("Sub Category")}</label><select id="ticket-category" value={sub} onChange={(e) => setSub(e.target.value)}>{subcategories[subject].map((s) => <option key={s}>{tr(s)}</option>)}</select></div>
      {subject === "Giveaway" && <div className="rounded-md bg-secondary p-3 text-sm">{task ? tr(task.title) : <Link to="/giveaway" className="text-primary underline">{tr("Select a giveaway task first")}</Link>}</div>}
      {(subject === "Order" || subject === "Payment") && <div><label htmlFor="ticket-orders">{tr("Order IDs")}</label><Input id="ticket-orders" value={codes} onChange={(e) => setCodes(e.target.value)} placeholder="4010026, 4010027" required={subject === "Order"} /></div>}
      <div><label htmlFor="ticket-message">{tr("Message")}</label><Textarea id="ticket-message" rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} required /></div>
      <div><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><Paperclip />{tr("Attach files")}<input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length > 3 || fs.some((f) => f.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(f.type))) { setError(tr("Choose up to 3 images or PDFs, 5 MB each.")); return; } setError(""); setFiles(fs); }} /></label>{files.map((f, i) => <div key={i} className="flex items-center justify-between text-xs"><span className="truncate">{f.name}</span><Button type="button" variant="ghost" size="icon" aria-label={tr("Remove file")} onClick={() => setFiles(files.filter((_, n) => n !== i))}><X /></Button></div>)}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} className="w-full rounded-md"><Send />{tr(busy ? "Submitting…" : "Submit Now")}</Button>
    </form></section><section className="ticket-tool"><header><PackageSearch /><h2>{tr("Ticket History / Order Tracking")}</h2></header><div className="p-5">
      <div className="mb-4 flex gap-2"><Button variant={view === "tickets" ? "default" : "outline"} onClick={() => { setView("tickets"); setQ(""); }}>{tr("Tickets")}</Button><Button variant={view === "orders" ? "default" : "outline"} onClick={() => { setView("orders"); setQ(""); }}>{tr("Orders")}</Button></div>
      <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label={tr("Search tickets or orders")} placeholder={tr("Search tickets or orders")} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" /></div>
      {view === "tickets" && <select aria-label={tr("Status")} className="mb-4" value={status} onChange={(e) => setStatus(e.target.value)}>{["all", "new", "pending", "answered", "closed"].map((s) => <option key={s} value={s}>{tr(s)}</option>)}</select>}
      <div className="overflow-x-auto"><table className="ticket-table"><thead><tr><th>{tr("ID")}</th><th>{tr("Subject")}</th><th>{tr("Status")}</th><th>{tr("Last update")}</th></tr></thead><tbody>{view === "tickets" ? rows.map((r) => <tr key={r.id}><td><Button variant="link" className="px-0" onClick={() => setSelected(r.id)}>#{r.ticket_no}</Button></td><td>{tr(r.subject)}<small>{tr(r.subcategory)}</small></td><td><span className={`ticket-status ticket-status-${r.status}`}>{tr(r.status)}</span></td><td>{new Date(r.updated_at).toLocaleString()}</td></tr>) : orders.map((o) => <tr key={o.order_code}><td><Link to="/orders" search={{ q: o.order_code }} className="font-semibold text-primary">#{o.order_code}</Link></td><td>{o.service_name}<small>{o.delivered_qty ?? 0}/{o.quantity}</small></td><td><span className="ticket-status">{tr(o.status)}</span></td><td>{new Date(o.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div>
      {!(view === "tickets" ? rows.length : orders.length) && <div className="tracking-empty"><img src={ordersArt} alt="" width={816} height={816} loading="lazy" /><strong>{tr(q ? "No results found" : view === "tickets" ? "No tickets yet" : "No orders to track yet")}</strong><p className="text-xs text-muted-foreground">{tr("Your tickets and order progress will appear here.")}</p><div className="tracking-tips"><div><TicketIcon className="h-4 w-4 shrink-0 text-primary" />{tr("Create a ticket on the left for refill, cancel or speed up requests.")}</div><div><PackageSearch className="h-4 w-4 shrink-0 text-primary" />{tr("Every order status updates here automatically.")}</div></div>{view === "orders" && <Button asChild size="sm"><Link to="/order">{tr("New Order")}</Link></Button>}</div>}
    </div></section></div>
    <TicketConversation key={selected} ticket={data.tickets.find((t) => t.id === selected)} onClose={() => setSelected(undefined)} onReply={async (body) => { if (!selected) return; await reply({ data: { id: selected, body, attachments: [] } }); await qc.invalidateQueries({ queryKey: ticketsQuery.queryKey }); }} />
  </div>;
}