import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { langConfig } from "@/lib/site-config";
import { useAuth } from "@/lib/auth";
import DICT from "@/lib/translations.json";

const D = DICT as Record<string, Record<string, string>>;
/** Built-in translation of an English phrase (central dictionary per language). */
export function trFor(lang: string, text: string) { return (lang !== "en" && D[lang]?.[text]) || text; }

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "bn", label: "বাংলা (Bangla)" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "id", label: "Bahasa Indonesia" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية (Arabic)", rtl: true },
  { code: "fa", label: "فارسی (Persian)", rtl: true },
] as const;
export type Lang = (typeof LANGUAGES)[number]["code"];

export const LABEL_GROUPS = [
  "Header", "Home", "Sign Up", "Sign In", "Service pages", "Order form", "Success screen", "Balance", "Add Funds",
  "Histories", "Profile", "API page", "QnA", "Footer", "3-dot menu", "Notifications", "Errors/Toasts", "Emails",
] as const;

type Def = [group: (typeof LABEL_GROUPS)[number], text: string, rich?: boolean];

/** Built-in defaults. Used as fallback and as the one-time seed for the ui_labels table. */
export const DEFAULT_LABELS: Record<string, Def> = {
  "header.balance": ["Header", "Balance"],
  "header.open_menu": ["Header", "Open menu"],
  "header.verify_banner": ["Header", "Verify your email to order and add funds."],
  "header.resend": ["Header", "Resend"],
  "home.badge": ["Home", "Fast delivery • Secure wallet • 24/7 Human support"],
  "home.hero_title": ["Home", "Cheapest Panel: Services at Unbeatable Prices! Grow your social media.", true],
  "home.hero_text": ["Home", "Boost your social media presence with affordable, high-quality services. Get social media followers, likes, views, and more at competitive prices. Enjoy a smooth, user-friendly platform designed for your convenience. Grow your brand, reach a wider audience, and stand out from the competition. Whether you're a creator, influencer, business owner, or reseller, we've got you covered. Experience convenient ordering, fast processing, and dedicated customer support. Make social media growth easier, smarter, and more affordable than ever.", true],
  "home.hero_article": ["Home", "", true],
  "home.services_title": ["Home", "Services"],
  "home.order_now": ["Home", "Order Now"],
  "home.sign_in": ["Home", "Sign In"],
  "home.sign_up": ["Home", "Sign Up"],
  "home.popup_title": ["Home", "Welcome!"],
  "home.popup_message": ["Home", "Thanks for visiting. Add funds and place your first order in minutes.", true],
  "home.popup_button": ["Home", "Get started"],
  "home.announcement": ["Home", ""],
  "signup.title": ["Sign Up", "Create account"],
  "signup.submit": ["Sign Up", "Sign Up"],
  "signin.title": ["Sign In", "Sign In"],
  "signin.submit": ["Sign In", "Sign In"],
  "service.title_suffix": ["Service pages", "Service"],
  "order.category": ["Order form", "Category"],
  "order.category_placeholder": ["Order form", "Select a category"],
  "order.service": ["Order form", "Service"],
  "order.service_placeholder": ["Order form", "Select a service"],
  "order.link": ["Order form", "Paste your link"],
  "order.quantity": ["Order form", "Quantity"],
  "order.avg_time": ["Order form", "Average time"],
  "order.manual": ["Order form", "Delivered manually by our team"],
  "order.total": ["Order form", "Total charge"],
  "order.submit": ["Order form", "Submit"],
  "order.empty_categories": ["Order form", "No categories available."],
  "order.empty_services": ["Order form", "No services in this category."],
  "success.title": ["Success screen", "Order Submitted"],
  "success.order_id": ["Success screen", "Order ID"],
  "success.home": ["Success screen", "Back to Home"],
  "success.history": ["Success screen", "Go to Order History"],
  "success.new": ["Success screen", "Buy New Service"],
  "balance.title": ["Balance", "Balance"],
  "funds.title": ["Add Funds", "Add Funds"],
  "funds.select": ["Add Funds", "Select Payment Method"],
  "funds.submit": ["Add Funds", "Add Funds"],
  "history.orders": ["Histories", "Order History"],
  "history.funds": ["Histories", "Add Funds History"],
  "profile.title": ["Profile", "Profile"],
  "api.title": ["API page", "Reseller API"],
  "qna.title": ["QnA", "Questions & Answers"],
  "footer.quick_links": ["Footer", "Quick Links"],
  "footer.info": ["Footer", "Info"],
  "footer.rights": ["Footer", "All rights reserved."],
  "footer.cookie": ["Footer", "We use cookies to keep you signed in and remember your preferences."],
  "footer.cookie_ok": ["Footer", "OK"],
  "menu.language": ["3-dot menu", "Language"],
  "menu.music": ["3-dot menu", "Music"],
  "menu.logout": ["3-dot menu", "Logout"],
  "notif.title": ["Notifications", "Notifications"],
  "notif.empty": ["Notifications", "No notifications yet."],
  "toast.logged_out": ["Errors/Toasts", "Logged out"],
  "toast.insufficient": ["Errors/Toasts", "Insufficient balance"],
  "toast.choose_service": ["Errors/Toasts", "Choose a service"],
  "toast.invalid_link": ["Errors/Toasts", "Enter a valid link"],
  "toast.verify_first": ["Errors/Toasts", "Please verify your email first."],
  "email.verify_subject": ["Emails", "Verify your email"],
};

type LabelRow = { key: string; default_text: string; translations: Record<string, string> };
type Ctx = {
  lang: Lang; setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
  tr: (text: string) => string;
  icon: (key: string) => string | null;
  enabled: string[];
};
const I18nCtx = createContext<Ctx>({
  lang: "en", setLang: () => {},
  t: (k, f) => f ?? DEFAULT_LABELS[k]?.[1] ?? k, tr: (x) => x, icon: () => null, enabled: ["en"],
});
export const useI18n = () => useContext(I18nCtx);
export const useT = () => useContext(I18nCtx).t;
/** Translate a hard-coded English phrase into the current language. */
export const useTr = () => useContext(I18nCtx).tr;

export function I18nProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [lang, setLangState] = useState<Lang>("en");
  const { data: settings } = useQuery(settingsQuery);
  const lc = langConfig(settings?.languages_config);
  useEffect(() => {
    if (!settings) return;
    const saved = localStorage.getItem("lang") ?? (profile?.language && profile.language !== "en" ? profile.language : null);
    const pick = saved && lc.enabled.includes(saved) ? saved : lc.default;
    if (LANGUAGES.some((l) => l.code === pick)) setLangState(pick as Lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.languages_config, profile?.language]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lc.rtl.includes(lang) ? "rtl" : "ltr";
  }, [lang, lc.rtl.join()]);
  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l); setLangState(l);
    if (user) void supabase.rpc("set_my_language", { _lang: l });
  };

  const { data: raw } = useQuery(uiContentQuery);
  const data = useMemo(() => raw && Array.isArray(raw.labels) && Array.isArray(raw.icons) ? {
    labels: new Map(raw.labels.map((l) => [l.key, l as unknown as LabelRow])),
    icons: new Map(raw.icons.filter((i) => i.icon_url).map((i) => [i.key, i.icon_url as string])),
  } : undefined, [raw]);

  // Realtime: admin edits to labels, icons, menus or settings refresh every open tab.
  useEffect(() => {
    const ch = supabase.channel("ui-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "ui_labels" }, () => qc.invalidateQueries({ queryKey: uiContentQuery.queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "ui_icons" }, () => qc.invalidateQueries({ queryKey: uiContentQuery.queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => qc.invalidateQueries({ queryKey: ["menu-items"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        qc.invalidateQueries({ queryKey: ["settings"] }); qc.invalidateQueries({ queryKey: ["welcome-song"] });
        qc.invalidateQueries({ queryKey: ["catalog"] }); qc.invalidateQueries({ queryKey: ["platforms"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "qna" }, () => qc.invalidateQueries({ queryKey: ["qna"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, () => {
        qc.invalidateQueries({ queryKey: ["page"] }); qc.invalidateQueries({ queryKey: ["footer-pages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const t = useCallback((key: string, fallback?: string) => {
    const row = data?.labels.get(key);
    const tr = row?.translations ?? {};
    if (tr[lang]) return tr[lang];
    if (tr["en"]) return tr["en"];
    const base = row?.default_text || fallback || DEFAULT_LABELS[key]?.[1] || key;
    return trFor(lang, base);
  }, [data, lang]);
  const trx = useCallback((text: string) => trFor(lang, text), [lang]);
  const icon = useCallback((key: string) => data?.icons.get(key) ?? null, [data]);
  const enabled = lc.enabled.join();
  const value = useMemo(() => ({ lang, setLang, t, tr: trx, icon, enabled: enabled.split(",") }), [lang, t, trx, icon, enabled, user]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

/** Pick a per-language value from a {lang: text} object. */
export function pickLang(obj: unknown, lang: string, fallback = "") {
  const o = (obj ?? {}) as Record<string, string>;
  return o[lang] || (o["en"] ? trFor(lang, o["en"]) : "") || fallback;
}

export const uiContentQuery = {
  queryKey: ["ui-content", 2] as const,
  staleTime: 10 * 60_000,
  queryFn: async () => {
    const [{ data: labels }, { data: icons }] = await Promise.all([
      supabase.from("ui_labels").select("key, default_text, translations"),
      supabase.from("ui_icons").select("key, icon_url"),
    ]);
    return { labels: labels ?? [], icons: icons ?? [] };
  },
};
