import { useQuery } from "@tanstack/react-query";
import {
  Home, User, Wallet, ShoppingCart, History, PlusCircle, ReceiptText, ShieldCheck, HelpCircle, Info, LogOut,
  Code2, LayoutDashboard, Languages, Music, Mail, Star, Gift, Link as LinkIcon, MessageCircle, Phone, Rocket, Heart, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStorageUrl } from "@/lib/storage-url";
import { TelegramIcon, WhatsAppIcon } from "@/lib/brand";

export const MENU_ICONS: Record<string, LucideIcon | typeof TelegramIcon> = {
  home: Home, user: User, wallet: Wallet, cart: ShoppingCart, history: History, plus: PlusCircle, receipt: ReceiptText,
  shield: ShieldCheck, help: HelpCircle, info: Info, logout: LogOut, code: Code2, dashboard: LayoutDashboard,
  languages: Languages, music: Music, mail: Mail, star: Star, gift: Gift, link: LinkIcon, chat: MessageCircle,
  phone: Phone, rocket: Rocket, heart: Heart, telegram: TelegramIcon, whatsapp: WhatsAppIcon,
};

export const MENU_LOCATIONS = [
  ["three_dot_menu", "3-dot menu"], ["bottom_bar", "Bottom bar"], ["footer_links", "Footer quick links"],
  ["footer_info", "Footer info icons"], ["home_shortcuts", "Home shortcut tiles"],
] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number][0];
export type TargetType = "internal_route" | "external_url" | "telegram" | "whatsapp" | "email" | "action";

export type MenuItem = {
  id: string; location: MenuLocation; label: Record<string, string>; icon_key: string | null; icon_url: string | null;
  target_type: TargetType; target_value: string; sort: number; is_active: boolean; requires_login: boolean;
  is_system: boolean; system_key: string | null;
};

type Seed = [key: string, label: string, icon: string, type: TargetType, value: string, login?: boolean, system?: boolean];
/** Built-in defaults: fallback before the table loads, and the one-time seed. */
export const DEFAULT_MENU: Record<MenuLocation, Seed[]> = {
  three_dot_menu: [
    ["home", "Home", "home", "internal_route", "/"],
    ["profile", "Profile", "user", "internal_route", "/profile", true],
    ["balance", "Balance", "wallet", "internal_route", "/balance", true],
    ["new_order", "New Order", "cart", "internal_route", "/order"],
    ["orders", "Order History", "history", "internal_route", "/orders", true],
    ["add_funds", "Add Funds", "plus", "internal_route", "/add-funds", true],
    ["funds_history", "Add Funds History", "receipt", "internal_route", "/add-funds/history", true],
    ["api", "API", "code", "internal_route", "/reseller-api", true, true],
    ["dashboard", "Dashboard", "dashboard", "internal_route", "/dashboard", true],
    ["language", "Language", "languages", "action", "language", false, true],
    ["music", "Music", "music", "action", "music", false, true],
    ["policy", "Policy", "shield", "internal_route", "/policy"],
    ["qna", "QnA", "help", "internal_route", "/qna"],
    ["about", "About Us", "info", "internal_route", "/about"],
    ["support", "Support Admin", "telegram", "action", "support"],
    ["logout", "Logout", "logout", "action", "logout", true, true],
  ],
  bottom_bar: [
    ["home", "Home", "home", "internal_route", "/"],
    ["new_order", "New Order", "cart", "internal_route", "/order"],
    ["orders", "Orders", "history", "internal_route", "/orders"],
    ["add_funds", "Add Funds", "plus", "internal_route", "/add-funds"],
    ["account", "Account", "user", "internal_route", "/profile"],
  ],
  footer_links: [
    ["home", "Home", "home", "internal_route", "/"],
    ["support", "Support Admin", "telegram", "action", "support"],
    ["qna", "QnA", "help", "internal_route", "/qna"],
    ["buy", "Buy Services", "cart", "internal_route", "/order"],
    ["about", "About Us", "info", "internal_route", "/about"],
    ["policy", "Policy", "shield", "internal_route", "/policy"],
  ],
  footer_info: [
    ["whatsapp", "WhatsApp", "whatsapp", "whatsapp", ""],
    ["telegram", "Telegram", "telegram", "telegram", ""],
    ["email", "E-mail", "mail", "email", ""],
  ],
  home_shortcuts: [
    ["wallet", "Wallet", "wallet", "internal_route", "/balance"],
    ["orders", "Order History", "history", "internal_route", "/orders"],
    ["add_funds", "Add Funds", "plus", "internal_route", "/add-funds"],
    ["funds_history", "Add Funds History", "receipt", "internal_route", "/add-funds/history"],
    ["account", "Account", "user", "internal_route", "/profile"],
  ],
};

const fallback = (loc: MenuLocation): MenuItem[] => DEFAULT_MENU[loc].map(([k, l, i, t, v, login, sys], idx) => ({
  id: `default-${loc}-${k}`, location: loc, label: { en: l }, icon_key: i, icon_url: null, target_type: t, target_value: v,
  sort: idx, is_active: true, requires_login: !!login, is_system: !!sys, system_key: k,
}));

export function useMenu(loc: MenuLocation) {
  const { data } = useQuery({
    queryKey: ["menu-items"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("menu_items").select("*").order("sort");
      if (error) throw error;
      return (data ?? []) as unknown as MenuItem[];
    },
  });
  const rows = data?.filter((m) => m.location === loc);
  return rows && rows.length ? rows : data ? [] : fallback(loc);
}

export function MenuIcon({ item, className = "h-5 w-5" }: { item: Pick<MenuItem, "icon_key" | "icon_url">; className?: string }) {
  const url = useStorageUrl("logos", item.icon_url);
  if (url) return <img src={url} alt="" className={`${className} object-contain`} />;
  const I = MENU_ICONS[item.icon_key ?? ""] ?? LinkIcon;
  return <I className={className} />;
}
