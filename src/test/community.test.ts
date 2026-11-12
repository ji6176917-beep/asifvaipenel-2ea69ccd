import { describe, expect, it } from "vitest";
import { filterTickets, giveawaySchema, parseOrderCodes, validateAttachmentOwner, ticketSchema, type Ticket } from "../lib/community";

describe("community rules", () => {
  it("searches tickets by linked order ID and subject", () => {
    const rows = [{ ticket_no: 123, subject: "Order", subcategory: "Refill", order_codes: ["4010026"], status: "new" }, { ticket_no: 124, subject: "Payment", subcategory: "Other", order_codes: [], status: "closed" }] as Ticket[];
    expect(filterTickets(rows, "4010026", "all").map((t) => t.ticket_no)).toEqual([123]);
    expect(filterTickets(rows, "Payment", "closed").map((t) => t.ticket_no)).toEqual([124]);
    expect(filterTickets(rows, "Payment", "new")).toEqual([]);
  });
  it("parses comma separated order IDs without duplicates", () => {
    expect(parseOrderCodes("4010026, 4010027, #4010026")).toEqual(["4010026", "4010027"]);
  });
  it("rejects another customer's private attachments", () => {
    expect(validateAttachmentOwner(["customer-a/proof.png"], "customer-b")).toBe(false);
    expect(validateAttachmentOwner(["customer-a/../customer-b/proof.png"], "customer-a")).toBe(false);
    expect(validateAttachmentOwner(["customer-a/proof.png"], "customer-a")).toBe(true);
  });
  it("allows admin configured rewards in USD and BDT and rejects negative values", () => {
    const task = { id: "review", platform: "youtube", title: "Review", summary: "", reward: 2, currency: "USD", active: true, how: "", conditions: "" };
    const config = { title: "Giveaway", description: "", rules: "", steps: ["Complete"], tasks: [task] };
    expect(giveawaySchema.parse(config).tasks[0]?.reward).toBe(2);
    expect(giveawaySchema.parse({ ...config, tasks: [{ ...task, reward: 200, currency: "BDT", active: false }] }).tasks[0]?.active).toBe(false);
    expect(giveawaySchema.safeParse({ ...config, tasks: [{ ...task, reward: -1 }] }).success).toBe(false);
  });
  it("limits attachments to three and validates real numeric order references", () => {
    const ticket = { subject: "Order", subcategory: "Refill", order_codes: ["4010026"], body: "Please check", attachments: [], idempotency_key: "11111111-1111-4111-8111-111111111111" };
    expect(ticketSchema.safeParse(ticket).success).toBe(true);
    expect(ticketSchema.safeParse({ ...ticket, order_codes: ["not-an-order"] }).success).toBe(false);
    expect(ticketSchema.safeParse({ ...ticket, attachments: Array.from({ length: 4 }, () => ({ path: "a/proof.png", name: "proof" })) }).success).toBe(false);
  });
});