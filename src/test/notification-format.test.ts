import { describe, it, expect } from "vitest";
import { parseNotification, matchesNotification, notificationInPeriod, notificationDestination } from "@/lib/notification-format";

describe("parseNotification", () => {
  it("opens the matching funding history and reference", () => {
    expect(notificationDestination("Add Fund #ADD-194871 approved")).toEqual({ to: "/add-funds/history", search: { q: "ADD-194871" } });
  });
  it("opens the matching order history and reference", () => {
    expect(notificationDestination("Order #4406212323 completed")).toEqual({ to: "/orders", search: { q: "4406212323" } });
  });
  it("opens Balance for balance changes without inventing destinations for generic notices", () => {
    expect(notificationDestination("Balance added")).toEqual({ to: "/balance", search: {} });
    expect(notificationDestination("Site announcement")).toBeNull();
  });
  it.each([3, 7, 30])("includes only notifications within the %i-day filter", (days) => {
    const now = Date.parse("2026-10-13T11:08:00Z");
    expect(notificationInPeriod(new Date(now - days * 86400000).toISOString(), days, now)).toBe(true);
    expect(notificationInPeriod(new Date(now - days * 86400000 - 1).toISOString(), days, now)).toBe(false);
    expect(notificationInPeriod(new Date(now + 1).toISOString(), days, now)).toBe(false);
  });
  it("keeps all historical notifications in All and searches actual transaction IDs", () => {
    expect(notificationInPeriod("2020-01-01T00:00:00Z", 0, Date.parse("2026-10-13T11:08:00Z"))).toBe(true);
    expect(matchesNotification("TX-194871", "Add Fund #ADD-194871 approved", null, { txn_id: "TX-194871" })).toBe(true);
    expect(matchesNotification("TX-OTHER", "Add Fund #ADD-194871 approved", null, { txn_id: "TX-194871" })).toBe(false);
  });
  it("reads rejected deposits with note", () => {
    expect(parseNotification("Add Fund #ADD-194871 was rejected", "Fake")).toMatchObject({ type: "deposit", ref: "ADD-194871", status: "rejected", tone: "danger", note: "Fake" });
  });
  it("reads order status", () => {
    expect(parseNotification("Order #4406212323 is now processing", "x")).toMatchObject({ type: "order", ref: "4406212323", status: "processing" });
  });
  it("reads balance amount and note", () => {
    expect(parseNotification("Balance added", "+$2.00 — Admin")).toMatchObject({ type: "balance", amount: "+$2.00", note: "Admin", tone: "success" });
  });
  it("reads approved deposits without auxiliary verbs", () => {
    expect(parseNotification("Add Fund #ADD-194871 approved").status).toBe("approved");
  });
  it("reads pending submission events", () => {
    expect(parseNotification("Order #4406212323 is now pending")).toMatchObject({ ref: "4406212323", status: "pending" });
    expect(parseNotification("Add Fund #ADD-194871 is now pending")).toMatchObject({ ref: "ADD-194871", status: "pending" });
  });
  it("preserves partial event status and separates actual refund from notes", () => {
    expect(parseNotification("Order #4406212323 partially completed", "Facebook Followers × 2000\nRefunded $1.60 to your balance.\nNon Drop")).toMatchObject({ status: "partial", refund: "$1.60", note: "Non Drop" });
  });
  it("searches references, platform names and status together", () => {
    const details = { platform_name: "Facebook", service_name: "Follow Service" };
    expect(matchesNotification("Facebook 4406212323 processing", "Order #4406212323 is now processing", null, details)).toBe(true);
    expect(matchesNotification("Instagram", "Order #4406212323 is now processing", null, details)).toBe(false);
  });
});
