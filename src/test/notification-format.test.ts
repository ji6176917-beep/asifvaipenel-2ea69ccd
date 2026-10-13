import { describe, it, expect } from "vitest";
import { parseNotification, matchesNotification } from "@/lib/notification-format";

describe("parseNotification", () => {
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
