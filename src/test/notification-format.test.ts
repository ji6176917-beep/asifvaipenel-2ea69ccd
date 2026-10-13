import { describe, it, expect } from "vitest";
import { parseNotification } from "@/lib/notification-format";

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
});
