import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { adminGetGiveaway, adminSaveGiveaway, adminGetTickets, adminReplyTicket } from "@/lib/community.functions";
import { filterTickets, type GiveawayConfig, type GiveawayTask } from "@/lib/community";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Switch } from "../ui/switch";
import { TicketConversation } from "../TicketConversation";

export function AdminGiveaway() {
  const get = useServerFn(adminGetGiveaway); const saveFn = useServerFn(adminSaveGiveaway); const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-giveaway"], queryFn: () => get() });
  const [draft, setDraft] = useState<GiveawayConfig>(); const [busy, setBusy] = useState(false); const config = draft ?? data;
  if (isLoading) return <p>Loading…</p>; if (error || !config) return <p role="alert">Unable to load giveaway.</p>;
  const update = (patch: Partial<GiveawayConfig>) => setDraft({ ...config, ...patch });
  const taskUpdate = (id: string, patch: Partial<GiveawayTask>) => update({ tasks: config.tasks.map((t) => t.id === id ? { ...t, ...patch } : t) });
  const save = async () => { setBusy(true); try { await saveFn({ data: config }); await Promise.all([qc.invalidateQueries({ queryKey: ["admin-giveaway"] }), qc.invalidateQueries({ queryKey: ["giveaway"] })]); setDraft(undefined); toast.success("Giveaway saved"); } catch { toast.error("Unable to save giveaway"); } finally { setBusy(false); } };
  return <div className="space-y-5"><div className="flex items-center justify-between gap-2"><h1 className="text-xl font-bold">Giveaway</h1><Button disabled={busy} onClick={save}><Save />Save</Button></div>
    <label className="block text-sm">Page title<Input value={config.title} onChange={(e) => update({ title: e.target.value })} /></label>
    <label className="block text-sm">Description<Textarea value={config.description} onChange={(e) => update({ description: e.target.value })} /></label>
    <label className="block text-sm">General rules (one per line)<Textarea rows={5} value={config.rules} onChange={(e) => update({ rules: e.target.value })} /></label>
    <label className="block text-sm">Participation steps (one per line)<Textarea value={config.steps.join("\n")} onChange={(e) => update({ steps: e.target.value.split("\n") })} /></label>
    <div className="flex items-center justify-between"><h2 className="font-bold">Tasks</h2><Button variant="outline" onClick={() => update({ tasks: [...config.tasks, { id: crypto.randomUUID(), platform: "youtube", title: "New Giveaway", summary: "", reward: 0, currency: "USD", active: false, how: "", conditions: "" }] })}><Plus />Add task</Button></div>
    {config.tasks.map((t, i) => <article key={t.id} className="space-y-3 rounded-md border border-border bg-card p-4"><div className="flex items-center gap-2"><Switch aria-label={`Active ${t.title}`} checked={t.active} onCheckedChange={(active) => taskUpdate(t.id, { active })} /><span className="flex-1 text-sm">{t.active ? "Active" : "Inactive"}</span>{[-1, 1].map((d) => <Button key={d} variant="ghost" size="icon" aria-label={d < 0 ? "Move up" : "Move down"} disabled={i + d < 0 || i + d >= config.tasks.length} onClick={() => { const tasks = [...config.tasks]; const other = tasks[i + d]; if (!other) return; tasks[i] = other; tasks[i + d] = t; update({ tasks }); }}>{d < 0 ? <ArrowUp /> : <ArrowDown />}</Button>)}<Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => { if (confirm("Remove this task?")) update({ tasks: config.tasks.filter((r) => r.id !== t.id) }); }}><Trash2 /></Button></div>
      <label className="block text-sm">Title<Input value={t.title} onChange={(e) => taskUpdate(t.id, { title: e.target.value })} /></label><label className="block text-sm">Platform<Input value={t.platform} onChange={(e) => taskUpdate(t.id, { platform: e.target.value })} list="giveaway-platforms" /></label>
      <label className="block text-sm">Summary<Input value={t.summary} onChange={(e) => taskUpdate(t.id, { summary: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm">Reward<Input type="number" min={0} step="0.01" value={t.reward} onChange={(e) => taskUpdate(t.id, { reward: Number(e.target.value) })} /></label><label className="text-sm">Currency<select className="block h-10 w-full rounded-md border border-input bg-background px-3" value={t.currency} onChange={(e) => taskUpdate(t.id, { currency: e.target.value as "USD" | "BDT" })}><option>USD</option><option>BDT</option></select></label></div>
      <label className="block text-sm">How It Works<Textarea rows={4} value={t.how} onChange={(e) => taskUpdate(t.id, { how: e.target.value })} /></label><label className="block text-sm">Conditions<Textarea rows={4} value={t.conditions} onChange={(e) => taskUpdate(t.id, { conditions: e.target.value })} /></label>
    </article>)}<datalist id="giveaway-platforms">{["youtube", "facebook", "tiktok", "linkedin", "instagram", "telegram", "other"].map((s) => <option key={s}>{s}</option>)}</datalist>
  </div>;
}
export function AdminTickets() {
  const get = useServerFn(adminGetTickets); const reply = useServerFn(adminReplyTicket); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin-tickets"], queryFn: () => get(), refetchInterval: 10000 });
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [selected, setSelected] = useState<string>();
  const rows = filterTickets(query.data ?? [], q, status);
  return <div className="space-y-4"><h1 className="text-xl font-bold">Support Tickets & Giveaway Proofs</h1><Input aria-label="Search tickets" placeholder="Search ticket ID, order ID or subject" value={q} onChange={(e) => setQ(e.target.value)} /><select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background p-2">{["all", "new", "pending", "answered", "closed"].map((s) => <option key={s}>{s}</option>)}</select>
    {query.error && <p role="alert">Unable to load tickets.</p>}<div className="overflow-x-auto"><table className="ticket-table"><thead><tr><th>ID</th><th>Subject</th><th>Orders</th><th>Status</th><th>Last update</th></tr></thead><tbody>{rows.map((t) => <tr key={t.id}><td><Button variant="link" onClick={() => setSelected(t.id)}>#{t.ticket_no}</Button></td><td>{t.subject}<small>{t.subcategory}</small></td><td>{t.order_codes.join(", ") || "—"}</td><td>{t.status}</td><td>{new Date(t.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div>
    {!query.isLoading && !rows.length && <p>No tickets found.</p>}<TicketConversation key={selected} admin ticket={query.data?.find((t) => t.id === selected)} onClose={() => setSelected(undefined)} onReply={async (body, status) => { if (!selected) return; await reply({ data: { id: selected, body, attachments: [], status } }); await qc.invalidateQueries({ queryKey: ["admin-tickets"] }); }} />
  </div>;
}