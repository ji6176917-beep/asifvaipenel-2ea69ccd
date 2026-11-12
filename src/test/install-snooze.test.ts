import { describe, expect, it } from "vitest";
import { INSTALL_SNOOZE_MS, isInstallSnoozed } from "@/lib/pwa-install";
describe("install suggestion snooze", () => {
  it("stays hidden for 3 days after dismissal", () => {
    expect(INSTALL_SNOOZE_MS).toBe(3 * 24 * 60 * 60 * 1000);
    expect(isInstallSnoozed(1000, 1000 + INSTALL_SNOOZE_MS - 1)).toBe(true);
    expect(isInstallSnoozed(1000, 1000 + INSTALL_SNOOZE_MS)).toBe(false);
    expect(isInstallSnoozed(null)).toBe(false);
  });
});
