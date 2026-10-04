/** Typed views over the admin-editable JSON config columns in site_settings, with defaults. */

export const HOME_SECTIONS = [
  { id: "hero", label: "Hero (title & text)" },
  { id: "auth", label: "Sign In / Sign Up buttons" },
  { id: "services", label: "Services logos" },
  { id: "order", label: "Order Now button" },
  { id: "qna", label: "QnA section" },
  { id: "footer", label: "Footer" },
] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];
export type Level = "off" | "low" | "high";

export type HomeConfig = {
  sections: { id: HomeSectionId; on: boolean }[];
  platforms: { slug: string; on: boolean; name?: string; logo?: string | null }[];
  anim: Level;
  bg: { on: boolean; slugs: string[]; opacity: number; blur: number; speed: number };
  footer: FooterConfig;
};
export type FooterConfig = { quick_links: boolean; info: boolean; pages: boolean; hours: boolean; copyright: boolean };
export const FOOTER_TOGGLES: [keyof FooterConfig, string][] = [
  ["quick_links", "Quick Links block"], ["info", "Info block (WhatsApp, Telegram, E-mail)"],
  ["pages", "Custom page links (Policy etc.)"], ["hours", "Support hours line"], ["copyright", "Copyright line"],
];

export const ALL_SLUGS = ["facebook", "instagram", "youtube", "tiktok", "telegram"];

export function homeConfig(raw: unknown, platformSlugs: string[] = ALL_SLUGS): HomeConfig {
  const r = (raw ?? {}) as Partial<HomeConfig>;
  const known = new Set<string>(HOME_SECTIONS.map((s) => s.id));
  const sections = (r.sections ?? []).filter((s) => known.has(s.id));
  for (const s of HOME_SECTIONS) {
    if (sections.some((x) => x.id === s.id)) continue;
    const at = s.id === "qna" ? sections.findIndex((x) => x.id === "footer") : -1;
    if (at >= 0) sections.splice(at, 0, { id: s.id, on: true }); else sections.push({ id: s.id, on: true });
  }
  const platforms = (r.platforms ?? []).filter((p) => platformSlugs.includes(p.slug));
  for (const slug of platformSlugs) if (!platforms.some((p) => p.slug === slug)) platforms.push({ slug, on: true });
  return {
    sections, platforms,
    anim: r.anim ?? "high",
    bg: { on: true, slugs: ALL_SLUGS, opacity: 12, blur: 2, speed: 5, ...(r.bg ?? {}) },
    footer: { quick_links: true, info: true, pages: true, hours: true, copyright: true, ...(r.footer ?? {}) },
  };
}

export const FONTS = [
  { id: "manrope", label: "Manrope + Sora", body: "Manrope", display: "Sora", q: "family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800" },
  { id: "jakarta", label: "Plus Jakarta Sans + Syne", body: "Plus Jakarta Sans", display: "Syne", q: "family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800" },
  { id: "outfit", label: "Figtree + Outfit", body: "Figtree", display: "Outfit", q: "family=Figtree:wght@400;500;600;700&family=Outfit:wght@500;600;700;800" },
  { id: "urbanist", label: "Epilogue + Urbanist", body: "Epilogue", display: "Urbanist", q: "family=Epilogue:wght@400;500;600;700&family=Urbanist:wght@600;700;800" },
  { id: "space", label: "DM Sans + Space Grotesk", body: "DM Sans", display: "Space Grotesk", q: "family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700" },
] as const;

export type ThemeConfig = {
  primary_light: string; primary_dark: string; glow_light: string; glow_dark: string;
  glow: number; radius: number; font: string; bg3d: boolean; anim: Level; default_theme: "dark" | "light" | "system";
};
export const THEME_DEFAULTS: ThemeConfig = {
  primary_light: "#127a45", primary_dark: "#2fd47a", glow_light: "#16884e", glow_dark: "#2fd47a",
  glow: 100, radius: 1, font: "manrope", bg3d: true, anim: "high", default_theme: "dark",
};
export function themeConfig(raw: unknown): ThemeConfig {
  return { ...THEME_DEFAULTS, ...((raw ?? {}) as Partial<ThemeConfig>) };
}
/** True when the admin changed anything from the built-in look. */
export function themeIsCustom(t: ThemeConfig) {
  return (Object.keys(THEME_DEFAULTS) as (keyof ThemeConfig)[]).some((k) => t[k] !== THEME_DEFAULTS[k]);
}

export type LangConfig = { enabled: string[]; default: string; rtl: string[] };
export function langConfig(raw: unknown): LangConfig {
  const r = (raw ?? {}) as Partial<LangConfig>;
  return {
    enabled: r.enabled?.length ? r.enabled : ["en", "bn", "hi", "pt-BR", "id", "tr", "ar", "fa"],
    default: r.default ?? "en",
    rtl: r.rtl ?? ["ar", "fa"],
  };
}
