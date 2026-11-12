import { describe, expect, it } from "vitest";
import type { MenuItem } from "@/lib/menu";
import { DESKTOP_MENU_BREAKPOINT, desktopMenuDestination, isSettingsItem, showDesktopMenu } from "@/components/layout/desktop-menu";

const item = (overrides: Partial<MenuItem> = {}): MenuItem => ({
  id: "profile", location: "three_dot_menu", label: { en: "Profile" }, icon_key: "user", icon_url: null,
  target_type: "internal_route", target_value: "/profile", sort: 1, is_active: true,
  requires_login: true, is_system: true, system_key: "profile", ...overrides,
});

describe("Desktop menu", () => {
  it("shows the permanent menu only after sign-in on desktop", () => {
    expect(showDesktopMenu(false, 1146)).toBe(false);
    expect(showDesktopMenu(true, 1146)).toBe(true);
  });
  it("keeps the permanent menu off mobile even after sign-in", () => {
    expect(showDesktopMenu(true, 390)).toBe(false);
    expect(showDesktopMenu(true, 1023)).toBe(false);
    expect(showDesktopMenu(true, 1024)).toBe(true);
  });
  it("leaves mobile and medium screens below the desktop breakpoint", () => {
    expect(DESKTOP_MENU_BREAKPOINT).toBe(1024);
    expect(390 >= DESKTOP_MENU_BREAKPOINT).toBe(false);
    expect(1146 >= DESKTOP_MENU_BREAKPOINT).toBe(true);
  });
  it("asks guests to sign in before opening Profile and retains their destination", () => {
    expect(desktopMenuDestination(item(), false)).toEqual({ to: "/sign-in", search: { redirect: "/profile" } });
  });
  it("opens Balance directly for a signed-in customer", () => {
    expect(desktopMenuDestination(item({ target_value: "/balance" }), true)).toEqual({ to: "/balance", search: undefined });
  });
  it("keeps Home public", () => {
    expect(desktopMenuDestination(item({ requires_login: false, target_value: "/" }), false)).toEqual({ to: "/", search: undefined });
  });
  it("places Logout inside Settings, not ordinary navigation", () => {
    expect(isSettingsItem(item({ target_type: "action", target_value: "logout" }))).toBe(true);
    expect(isSettingsItem(item())).toBe(false);
  });
});