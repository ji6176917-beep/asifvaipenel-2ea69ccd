import { describe, it, expect } from "vitest";
import { userCountAt, visitorsAt, TARGET_USERS, TARGET_VISITORS } from "@/lib/growth-sim.server";
const START = Date.UTC(2026, 10, 18, 8), DAY = 86_400_000;
describe("growth sim", () => {
  it("reaches targets after 25 days", () => {
    expect(userCountAt(START + 25 * DAY + 1)).toBe(TARGET_USERS);
    expect(visitorsAt(START + 25 * DAY + 1)).toBe(TARGET_VISITORS);
  });
  it("daily additions vary", () => {
    const per = Array.from({ length: 25 }, (_, d) => userCountAt(START + (d + 1) * DAY) - userCountAt(START + d * DAY));
    expect(Math.max(...per) / Math.max(1, Math.min(...per))).toBeGreaterThan(3);
    for (let d = 1; d < 25; d++) expect(userCountAt(START + d * DAY)).toBeGreaterThanOrEqual(userCountAt(START + (d - 1) * DAY));
    console.log(per.join(","));
  });
});
