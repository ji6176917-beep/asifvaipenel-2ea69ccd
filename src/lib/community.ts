import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().min(1).max(80), platform: z.string().min(1).max(40),
  title: z.string().trim().min(1).max(150), summary: z.string().max(500),
  reward: z.number().min(0).max(10000), currency: z.enum(["USD", "BDT"]),
  active: z.boolean(), how: z.string().max(6000), conditions: z.string().max(6000),
});
export const giveawaySchema = z.object({
  title: z.string().min(1).max(150), description: z.string().max(1000),
  rules: z.string().max(10000), steps: z.array(z.string().min(1).max(300)).min(1).max(6),
  tasks: z.array(taskSchema).max(50),
}).superRefine((v, ctx) => {
  if (new Set(v.tasks.map((t) => t.id)).size !== v.tasks.length) ctx.addIssue({ code: "custom", message: "Duplicate task IDs" });
});
export type GiveawayConfig = z.infer<typeof giveawaySchema>;
export type GiveawayTask = z.infer<typeof taskSchema>;
export const subjects = ["Order", "Payment", "Service", "Other", "Giveaway"] as const;
export const subcategories: Record<(typeof subjects)[number], string[]> = {
  Order: ["Refill", "Cancel", "Speed Up", "Restart", "Other"], Payment: ["Deposit", "Payment verification", "Other"],
  Service: ["Service details", "Other"], Other: ["General support"], Giveaway: ["Submit Your Proof"],
};
export const attachmentSchema = z.object({ path: z.string().max(300), name: z.string().max(150) });
export const ticketSchema = z.object({ subject: z.enum(subjects), subcategory: z.string().min(1).max(200), order_codes: z.array(z.string().regex(/^\d{1,20}$/)).max(20), body: z.string().trim().min(1).max(5000), attachments: z.array(attachmentSchema).max(3), task_id: z.string().max(80).optional(), idempotency_key: z.string().uuid() });
export const replySchema = z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(5000), attachments: z.array(attachmentSchema).max(3) });
export type TicketMessage = { author: "customer" | "admin"; body: string; attachments: z.infer<typeof attachmentSchema>[]; created_at: string };
export type Ticket = { id: string; ticket_no: number; user_id: string; subject: string; subcategory: string; order_codes: string[]; task_id: string | null; status: "new" | "pending" | "answered" | "closed"; messages: TicketMessage[]; created_at: string; updated_at: string };
export type TrackedOrder = { order_code: string; service_name: string; status: string; quantity: number; delivered_qty: number | null; updated_at: string; admin_note: string | null };
export const parseOrderCodes = (value: string) => [...new Set(value.split(/[\s,]+/).map((s) => s.replace(/^#/, "")).filter(Boolean))];
export function validateAttachmentOwner(paths: string[], userId: string) {
  return paths.every((p) => p.startsWith(`${userId}/`) && !p.includes("..") && /^[-\w./]+$/.test(p));
}
export function filterTickets(rows: Ticket[], term: string, status: string) {
  const q = term.trim().toLowerCase();
  return rows.filter((r) => (status === "all" || status === r.status) && `${r.ticket_no} ${r.subject} ${r.subcategory} ${r.order_codes.join(" ")}`.toLowerCase().includes(q));
}