import type { MenuItem } from "@/lib/menu";

export const DESKTOP_MENU_BREAKPOINT = 1024;

export function desktopMenuDestination(item: MenuItem, signedIn: boolean) {
  const to = item.target_value || "/";
  return !signedIn && item.requires_login
    ? { to: "/sign-in", search: { redirect: to } }
    : { to, search: undefined };
}

export function isSettingsItem(item: MenuItem) {
  return item.target_type === "action" && ["language", "music", "logout"].includes(item.target_value);
}