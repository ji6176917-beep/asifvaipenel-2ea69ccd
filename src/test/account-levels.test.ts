import { describe, it, expect } from "vitest";
import { levelFor, LEVELS } from "@/lib/account-levels";
describe("account levels", () => {
  it("starts at Beginner", () => expect(LEVELS[levelFor(0)]!.name).toBe("Beginner"));
  it("reaches Silver at 100", () => expect(LEVELS[levelFor(100)]!.name).toBe("Silver"));
  it("stays Gold below 1000", () => expect(LEVELS[levelFor(999.99)]!.name).toBe("Gold"));
  it("Legend at 10000+", () => expect(LEVELS[levelFor(25000)]!.name).toBe("Legend"));
});
