import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { giveawaySchema, ticketSchema, replySchema, validateAttachmentOwner, type Ticket, type TrackedOrder } from "./community";
import { z } from "zod";

export const getGiveaway = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) throw new Error("Giveaway unavailable");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key); return fetch(input, { ...init, headers });
  } } });
  const { data, error } = await db.from("giveaway_settings").select("config").eq("id", 1).single();
  if (error) throw new Error("Giveaway unavailable");
  const config = giveawaySchema.parse(data.config);
  return { ...config, tasks: config.tasks.filter((t) => t.active) };
});

export const getMyTickets = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [tickets, orders] = await Promise.all([
    context.supabase.from("support_tickets").select("*").eq("user_id", context.userId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(500),
    context.supabase.from("orders").select("order_code,service_name,status,quantity,delivered_qty,updated_at,admin_note").eq("user_id", context.userId).is("deleted_at", null).order("updated_at", { ascending: false }).limit(500),
  ]);
  if (tickets.error || orders.error) throw new Error("Unable to load tickets");
  return { tickets: tickets.data as unknown as Ticket[], orders: orders.data as TrackedOrder[] };
});
export const submitTicket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => ticketSchema.parse(d)).handler(async ({ data, context }) => {
  if (!validateAttachmentOwner(data.attachments.map((a) => a.path), context.userId)) throw new Error("Invalid attachment");
  const { data: ticket, error } = await context.supabase.rpc("submit_support_ticket", { _subject: data.subject, _subcategory: data.subcategory, _orders: data.order_codes, _body: data.body, _attachments: data.attachments, _task: data.task_id ?? "", _idem: data.idempotency_key });
  if (error) throw new Error(error.message.includes("ORDER_") ? "Enter valid order IDs belonging to your account" : "Unable to submit ticket");
  return ticket as unknown as Ticket;
});
export const replyTicket = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => replySchema.parse(d)).handler(async ({ data, context }) => {
  if (!validateAttachmentOwner(data.attachments.map((a) => a.path), context.userId)) throw new Error("Invalid attachment");
  const { data: ticket, error } = await context.supabase.rpc("reply_support_ticket", { _id: data.id, _body: data.body, _attachments: data.attachments, _admin: false });
  if (error) throw new Error("Unable to reply to ticket");
  return ticket as unknown as Ticket;
});

async function adminContext() {
  const s = await import("./admin.server"); await s.requireAdmin();
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  return { s, db };
}
export const adminGetGiveaway = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await adminContext();
  const { data, error } = await db.from("giveaway_settings").select("config").eq("id", 1).single();
  if (error) throw new Error("Unable to load giveaway"); return giveawaySchema.parse(data.config);
});
export const adminSaveGiveaway = createServerFn({ method: "POST" }).inputValidator((d) => giveawaySchema.parse(d)).handler(async ({ data }) => {
  const { db, s } = await adminContext();
  const { data: old } = await db.from("giveaway_settings").select("config").eq("id", 1).single();
  const { error } = await db.from("giveaway_settings").update({ config: data, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) throw new Error("Unable to save giveaway");
  await s.logAdmin("giveaway_saved", {}, old?.config, data); return { ok: true };
});
export const adminGetTickets = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await adminContext();
  const { data, error } = await db.from("support_tickets").select("*").is("deleted_at", null).order("updated_at", { ascending: false }).limit(500);
  if (error) throw new Error("Unable to load tickets"); return data as unknown as Ticket[];
});
export const adminReplyTicket = createServerFn({ method: "POST" }).inputValidator((d) => replySchema.extend({ status: z.enum(["pending", "answered", "closed"]) }).parse(d)).handler(async ({ data }) => {
  const { db, s } = await adminContext();
  const { data: old, error: readError } = await db.from("support_tickets").select("*").eq("id", data.id).single();
  if (readError || !old) throw new Error("Ticket not found");
  const { data: ticket, error } = await db.rpc("reply_support_ticket", { _id: data.id, _body: data.body, _attachments: [], _admin: true, _status: data.status });
  if (error) throw new Error("Unable to reply");
  await s.logAdmin("ticket_replied", { id: data.id }, old, ticket); return ticket as unknown as Ticket;
});
export const adminAttachmentUrl = createServerFn({ method: "POST" }).inputValidator((d) => z.object({ id: z.string().uuid(), path: z.string().max(300) }).parse(d)).handler(async ({ data }) => {
  const { db } = await adminContext();
  const { data: row } = await db.from("support_tickets").select("messages").eq("id", data.id).single();
  const messages = row?.messages as unknown as Ticket["messages"] | undefined;
  if (!messages?.some((m) => m.attachments.some((a) => a.path === data.path))) throw new Error("Attachment not found");
  const { data: signed, error } = await db.storage.from("support-attachments").createSignedUrl(data.path, 60);
  if (error || !signed) throw new Error("Attachment unavailable"); return signed.signedUrl;
});