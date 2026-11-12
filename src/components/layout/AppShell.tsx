import { AccountLevelButton } from "@/components/AccountLevels";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home, User, Wallet, ShoppingCart, History, PlusCircle, ReceiptText, ShieldCheck, HelpCircle, Info,
  LogOut, Bell, X, Mail, Sparkles, Code2, LayoutDashboard, Languages, Music, Check, Settings2, ChevronDown, PanelLeftClose, PanelLeftOpen, LogIn, Gift, Ticket,

} from "lucide-react";
import { InstallPrompt, InstallMenuButton } from "@/components/InstallPrompt";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { money, telegramUrl, whatsappUrl } from "@/lib/format";
import { SupportAdminButton } from "@/components/SupportAdmin";
import { Avatar } from "@/components/Avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { UserInbox } from "@/components/UserInbox";
import { PlatformIcon, TelegramIcon, WhatsAppIcon } from "@/lib/brand";
import { toast } from "sonner";
import { MusicProvider, useMusic, DesktopMusicPlayer } from "@/components/MusicPlayer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n, LANGUAGES, pickLang } from "@/lib/i18n";
import { useMenu, MenuIcon, type MenuItem } from "@/lib/menu";
import { useStorageUrl } from "@/lib/storage-url";
import { useSupportTap } from "@/components/SupportAdmin";
import ReactMarkdown from "react-markdown";
import { FONTS, homeConfig, themeConfig, themeIsCustom, type HomeConfig, type ThemeConfig } from "@/lib/site-config";
import siteLogo from "@/assets/apex-header-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { DESKTOP_MENU_BREAKPOINT, desktopMenuDestination, isSettingsItem, showDesktopMenu } from "@/components/layout/desktop-menu";

// Light mode only: the dark-mode system was removed; no `.dark` class is ever applied.


function FloatingBackground({ cfg, glowOn }: { cfg: HomeConfig["bg"]; glowOn: boolean }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const f = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);
  const items = [
    { s: "facebook", c: "left-[6%] top-[12%] h-24 w-24", d: "0s" },
    { s: "instagram", c: "right-[8%] top-[22%] h-28 w-28", d: "-4s" },
    { s: "youtube", c: "left-[12%] bottom-[18%] h-28 w-28", d: "-8s" },
    { s: "tiktok", c: "right-[14%] bottom-[10%] h-20 w-20", d: "-12s" },
    { s: "telegram", c: "left-[45%] top-[45%] h-24 w-24", d: "-6s" },
  ].filter((i) => cfg.on && cfg.slugs.includes(i.s));
  const dur = `${Math.round(30 / Math.max(1, cfg.speed))}s`;
  if (!glowOn && !items.length) return null;
  return (
    <div aria-hidden className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${hidden ? "paused-hidden" : ""}`}>
      {glowOn && <div className="absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />}
      {items.map((i) => (
        <div key={i.s} className={`absolute ${i.c} animate-floaty will-change-transform`}
          style={{ animationDelay: i.d, animationDuration: dur, opacity: cfg.opacity / 100, filter: `blur(${cfg.blur}px)` }}>
          <PlatformIcon slug={i.s} className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

/** Applies the admin theme (colours, glow, radius, font, motion) as CSS variables. */
function ThemeApplier({ t }: { t: ThemeConfig }) {
  const custom = themeIsCustom(t);
  const font = FONTS.find((f) => f.id === t.font) ?? FONTS[0];
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("motion-off", t.anim === "off");
    el.classList.toggle("motion-low", t.anim === "low");
  }, [t.anim]);
  if (!custom) return null;
  const g = (c: string) => `color-mix(in oklab, ${c} ${t.glow}%, transparent)`;
  const css = `:root{--primary:${t.primary_light};--ring:${t.primary_light};--glow:${g(t.glow_light)};--radius:${t.radius}rem;--font-sans:"${font.body}",ui-sans-serif,system-ui,sans-serif;--font-display:"${font.display}",ui-sans-serif,system-ui,sans-serif}`;

  return (<>
    {font.id !== "manrope" && <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${font.q}&display=swap`} />}
    <style>{css}</style>
  </>);
}

function ContactIcon({ k, fallback, className }: { k: string; fallback: ReactNode; className: string }) {
  const { icon } = useI18n();
  const url = useStorageUrl("logos", icon(k));
  return url ? <img src={url} alt="" className={`${className} object-contain`} /> : <>{fallback}</>;
}

type Settings = Record<string, unknown> & { telegram?: string | null; whatsapp?: string | null; email?: string | null };

/** Resolve where a menu item points. Returns null when it has nowhere to go (e.g. empty support contact). */
function itemHref(m: MenuItem, s?: Settings | null): { kind: "route" | "external" | "action"; to: string } | null {
  switch (m.target_type) {
    case "internal_route": return { kind: "route", to: m.target_value || "/" };
    case "external_url": return m.target_value ? { kind: "external", to: m.target_value } : null;
    case "telegram": { const u = telegramUrl(m.target_value || s?.telegram); return u ? { kind: "external", to: u } : null; }
    case "whatsapp": { const u = whatsappUrl(m.target_value || s?.whatsapp); return u ? { kind: "external", to: u } : null; }
    case "email": { const e = m.target_value || s?.email; return e ? { kind: "external", to: `mailto:${e}` } : null; }
    default: return { kind: "action", to: m.target_value };
  }
}

function NavItem({ m, className, iconClass = "h-5 w-5 text-primary", onAction, settings, children, showIcon = true, desktopSignedIn, active }: {
  m: MenuItem; className: string; iconClass?: string; onAction: (a: string) => void; settings?: Settings | null | undefined; children?: ReactNode; showIcon?: boolean; desktopSignedIn?: boolean; active?: boolean;
}) {
  const { lang } = useI18n();
  const tap = useSupportTap();
  const h = itemHref(m, settings);
  if (!h) return null;
  if (h.kind === "action" && h.to === "support" && !telegramUrl(settings?.telegram)) return null;
  const label = pickLang(m.label, lang, m.system_key ?? "");
  const contactKey = !m.icon_url && ["whatsapp", "telegram", "email"].includes(m.target_type) && m.location === "footer_info" ? `contact.${m.target_type}` : null;
  const ic = <MenuIcon item={m} className={iconClass} />;
  const inner = <>{showIcon && (contactKey ? <ContactIcon k={contactKey} className={iconClass} fallback={ic} /> : ic)}{children ?? label}</>;
  if (h.kind === "route") {
    const destination = desktopSignedIn === undefined ? { to: h.to, search: undefined } : desktopMenuDestination(m, desktopSignedIn);
    if (destination.search) return <Link to="/sign-in" search={destination.search} className={className}>{inner}</Link>;
    return <Link to={destination.to as never} title={label} aria-current={active ? "page" : undefined} className={className}>{inner}</Link>;
  }
  if (h.kind === "external") return <a href={h.to} target={h.to.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" className={className}>{inner}</a>;
  return <Button variant="ghost" type="button" onClick={() => (h.to === "support" ? tap() : onAction(h.to))} className={`${className} h-auto justify-start whitespace-normal text-left`}>{inner}</Button>;
}

function WelcomePopup({ s }: { s?: Settings | null | undefined }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const img = useStorageUrl("logos", (s?.["popup_image"] as string | null) ?? null);
  useEffect(() => {
    if (!s?.["popup_on"]) return;
    if (s["popup_mode"] !== "every" && localStorage.getItem("popup_seen") === "1") return;
    if (s["popup_mode"] === "every" && sessionStorage.getItem("popup_seen") === "1") return;
    const id = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(id);
  }, [s]);
  const close = () => { localStorage.setItem("popup_seen", "1"); sessionStorage.setItem("popup_seen", "1"); setOpen(false); };
  const link = (s?.["popup_link"] as string) || "";
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md text-center">
        {img && <img src={img} alt="" className="mx-auto max-h-48 rounded-2xl object-contain" />}
        <DialogTitle className="text-gradient text-2xl">{t("home.popup_title")}</DialogTitle>
        <div className="md-content text-muted-foreground"><ReactMarkdown>{t("home.popup_message")}</ReactMarkdown></div>
        {link ? <a href={link} target="_blank" rel="noreferrer" onClick={close} className="btn-glow">{t("home.popup_button")}</a>
          : <button onClick={close} className="btn-glow">{t("home.popup_button")}</button>}
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return <MusicProvider><Shell>{children}</Shell></MusicProvider>;
}


function Shell({ children }: { children: ReactNode }) {
  const music = useMusic();
  const [langOpen, setLangOpen] = useState(false);
  const { lang, setLang, t, tr, enabled } = useI18n();
  const menu = useMenu("three_dot_menu");
  const bottom = useMenu("bottom_bar");
  const footLinks = useMenu("footer_links");
  const footInfo = useMenu("footer_info");
  const { user, profile, verified } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const theme = themeConfig(settings?.theme_config);
  const home = homeConfig(settings?.home_config);
  const fc = home.footer;

  const { data: footerPages } = useQuery({
    queryKey: ["footer-pages"], staleTime: 60_000,
    queryFn: async () => (await supabase.from("pages").select("slug, title").eq("is_custom", true).eq("show_in_footer", true)).data ?? [],
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const desktopSidebar = showDesktopMenu(!!user, isDesktop ? DESKTOP_MENU_BREAKPOINT : 0);
  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_MENU_BREAKPOINT}px)`);
    const update = () => { setIsDesktop(media.matches); setMenuOpen(false); };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [bannerClosed, setBannerClosed] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  // Shell styling follows the committed page, not the still-loading destination.
  const path = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname });
  const siteName = settings?.site_name ?? "Apex SMM World";
  // The top header can show its own brand text; every other place keeps the website name.
  const headerName = settings?.header_name || siteName;
  const now = Date.now();
  const annOn = !!settings?.announcement_on && !!settings.announcement_text
    && (!settings.announcement_start || Date.parse(settings.announcement_start) <= now)
    && (!settings.announcement_end || Date.parse(settings.announcement_end) > now);
  // Show the admin's website name in every browser tab title.
  useEffect(() => {
    if (!settings?.site_name || settings.site_name === "Premium Apex SMM World") return;
    if (document.title.includes("Premium Apex SMM World")) document.title = document.title.replace("Premium Apex SMM World", settings.site_name);
  }, [path, settings?.site_name]);
  const visible = (m: MenuItem) => !m.requires_login || !!user;
  const onAction = (a: string) => {
    setMenuOpen(false);
    if (a === "language") setLangOpen(true);
    else if (a === "music") music.toggleOpen();
    else if (a === "logout") logout();
  };
  const tg = telegramUrl(settings?.telegram);
  const wa = whatsappUrl(settings?.whatsapp);
  const isMobile = useIsMobile();
  useEffect(() => { setMenuOpen(false); }, [path]);
  useEffect(() => {
    if (path !== "/" || !settings) return;
    if (settings.seo_title) document.title = settings.seo_title;
    if (settings.seo_description) document.querySelector('meta[name="description"]')?.setAttribute("content", settings.seo_description);
  }, [path, settings?.seo_title, settings?.seo_description]);

  const logout = async () => {
    setMenuOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success(t("toast.logged_out"));
    navigate({ to: "/", replace: true });
  };

  const resend = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(error.message); else toast.success(tr("Verification email sent"));
  };

  return (
    <div className={`relative flex min-h-screen flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0 ${desktopMenuOpen ? "lg:pl-64" : "lg:pl-16"} ${path === "/" ? "home-reference-shell" : path === "/order" ? "order-reference-shell" : ""}`}>
      <ThemeApplier t={theme} />
      {path !== "/" && path !== "/order" && <FloatingBackground cfg={home.bg} glowOn={theme.bg3d} />}
      <WelcomePopup s={settings as Settings | null | undefined} />
      <InstallPrompt />

      {annOn && !bannerClosed && (
        <div className="bg-brand flex items-center justify-center gap-3 px-4 py-2 text-sm text-primary-foreground" style={settings?.announcement_color ? { background: settings.announcement_color } : undefined}>
          <Sparkles className="h-4 w-4 shrink-0" />
          {settings?.announcement_link
            ? <a href={settings.announcement_link} target="_blank" rel="noreferrer" className="text-center underline-offset-2 hover:underline">{settings.announcement_text}</a>
            : <span className="text-center">{settings?.announcement_text}</span>}
          <button aria-label="Dismiss" onClick={() => setBannerClosed(true)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <header className={`glass sticky top-0 z-40 rounded-none border-x-0 border-t-0 ${path === "/" ? "home-header" : ""}`}>
        <div className="home-header-inner mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2 lg:flex">
          <Link to="/" className={`flex min-w-0 items-center gap-2 ${desktopSidebar ? "lg:hidden" : ""}`}>
            <img src={siteLogo.url} alt={`${siteName} - Global Social Media Growth Logo`} width={36} height={36} className="h-9 w-auto shrink-0 object-contain" />
            <span className="home-brand-copy min-w-0"><span className="home-brand-name block truncate font-display text-base font-bold sm:text-lg">{headerName}</span>{path === "/" && <span className="home-brand-tagline">{tr("Social Media Growth Partner")}</span>}</span>
          </Link>
          <div className="home-header-tools ml-auto flex shrink-0 items-center gap-1.5">
            {desktopSidebar && <Button variant="ghost" size="icon" aria-label={desktopMenuOpen ? tr("Close menu") : t("header.open_menu")} title={desktopMenuOpen ? tr("Close menu") : t("header.open_menu")} aria-expanded={desktopMenuOpen} onClick={() => setDesktopMenuOpen((open) => !open)}>{desktopMenuOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</Button>}
            {user ? (<>
              <Link to="/balance" className="home-wallet btn-ghost-glow !px-3 !py-1.5 text-sm">
                <Wallet className="h-4 w-4 text-primary" /> {money(profile?.balance ?? 0)}
              </Link>
              <UserInbox />
            </>) : (<>
              <Link to="/sign-in" className="inline-flex h-8 items-center rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:h-9 sm:px-4 sm:text-sm">{tr("Sign In")}</Link>
              <Link to="/sign-up" className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:h-9 sm:px-4 sm:text-sm">{tr("Sign Up")}</Link>
            </>)}
            <div className="lg:hidden"><Button variant="ghost" size="icon" aria-label={t("header.open_menu")} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className={`${path === "/" ? "home-menu-button" : "menu-btn"} ${menuOpen ? "is-open" : ""}`}>
              <span className="menu-dots" aria-hidden><i /><i /><i /></span>{path === "/" && <span className="home-menu-label">{tr("Menu")}</span>}
            </Button></div>
          </div>
        </div>

      </header>

      {user && !verified && (
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm sm:mx-4 lg:mx-auto">
          <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-warning" /> {t("header.verify_banner")}</span>
          <button onClick={resend} className="font-semibold text-primary underline-offset-2 hover:underline">{t("header.resend")}</button>
        </div>
      )}

      <main className={"flex-1 w-full " + (path === "/" ? "home-main" : path === "/order" ? "order-main" : `mx-auto px-4 pt-6 ${path.startsWith("/admin") ? "max-w-7xl" : "max-w-5xl"} ${desktopSidebar ? "lg:max-w-none lg:px-8" : ""}`)}>
        {settings?.maintenance_on && !path.startsWith("/admin") ? (
          <div className="glass mx-auto mt-10 max-w-lg rounded-3xl p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-gradient mt-3 text-3xl font-bold">{t("maintenance.title", "Under maintenance")}</h1>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{settings.maintenance_text}</p>
          </div>
        ) : <RouteTransition>{children}</RouteTransition>}
      </main>

      {path !== "/order" && !(path === "/" && home.sections.find((x) => x.id === "footer")?.on === false) && (() => {
        const full = true; // same full footer on every page
        const contacts = fc.info ? footInfo.filter(visible).map((m) => {
          const txt = m.target_type === "whatsapp" ? tr("WhatsApp Support")
            : m.target_type === "telegram" ? tr("Telegram Support")
            : m.target_type === "email" ? tr("Email Support") : undefined;
          return <NavItem key={m.id} m={m} settings={settings} onAction={onAction} iconClass="h-4 w-4 shrink-0 text-primary" className="inline-flex min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:text-primary">{txt ? <span className="truncate">{txt}</span> : undefined}</NavItem>;
        }) : [];
        const links = <>
          {fc.quick_links && footLinks.filter(visible).map((m) => <NavItem key={m.id} m={m} settings={settings} onAction={onAction} showIcon={false} className="transition-colors hover:text-primary" />)}
          {fc.pages && (footerPages ?? []).map((p) => <Link key={p.slug} to="/p/$slug" params={{ slug: p.slug }} className="transition-colors hover:text-primary">{pickLang(p.title, lang, p.slug)}</Link>)}
        </>;
        const copy = fc.copyright ? (settings?.footer_copyright || `© ${new Date().getFullYear()} ${siteName}. ${t("footer.rights")}`) : null;
        const brand = <div className="flex items-center gap-2.5"><img src={siteLogo.url} alt={siteName} width={32} height={32} className="h-8 w-auto object-contain" /><span className="text-base font-bold text-foreground">{siteName}</span></div>;
        const socials = (wide = false) => <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("Follow Us")}</h3>
          <div className={wide ? "flex flex-col gap-2" : "flex items-center gap-2"}>
            {([
              { slug: "facebook", label: "Facebook", url: (settings?.social_facebook as string | undefined) ?? "https://www.facebook.com/share/1NLNd912Fg/" },
              { slug: "youtube", label: "YouTube", url: (settings?.social_youtube as string | undefined) ?? "https://youtube.com/@apexsmmworld" },
              { slug: "tiktok", label: "TikTok", url: (settings?.social_tiktok as string | undefined) ?? "https://tiktok.com/@apexsmmworld" },
            ]).filter((s) => s.url).map((s) => (
              <a key={s.slug} href={s.url} target="_blank" rel="noreferrer" aria-label={s.label} title={s.label}
                className={wide ? "group flex w-fit items-center gap-2.5 text-sm text-foreground/80 transition-colors hover:text-primary" : "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md"}>
                {wide ? <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-all group-hover:border-primary"><PlatformIcon slug={s.slug} name={s.label} className="h-4 w-4" /></span> : <PlatformIcon slug={s.slug} name={s.label} className="h-4.5 w-4.5" />}
                {wide && <span>{s.label}</span>}
              </a>
            ))}
          </div>
        </div>;
        return <footer className="mt-16 border-t border-border bg-card sm:mt-20 -mb-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:mb-0 lg:pb-0">
          {full ? <div className="mx-auto max-w-5xl px-4 pt-8 pb-1 sm:pt-10 sm:pb-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:gap-y-8 sm:grid-cols-[1.4fr_1fr_1.2fr]">
              <div className="col-span-2 space-y-3 sm:col-span-1">{brand}<p className="max-w-xs text-sm text-muted-foreground">{tr("Fast, reliable social media growth services trusted worldwide.")}</p>
                <div className="hidden sm:block">{socials(true)}</div>
              </div>
              <div><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("footer.quick_links")}</h3><div className="flex flex-col gap-1.5 text-sm text-foreground/80 gap-y-[8.9px] sm:gap-2">{links}</div></div>
              <div className="space-y-4 sm:space-y-5">
                <div className="sm:hidden">{socials()}</div>
                <div><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{tr("Support")}</h3><div className="flex flex-wrap gap-2 sm:flex-col sm:items-start sm:gap-2.5">{contacts}</div>
                  {fc.hours && settings?.support_hours && <p className="mt-3 text-xs text-muted-foreground">{t("footer.hours", "Support hours")}: {settings.support_hours}</p>}</div>
              </div>
            </div>
            {copy && <p className="mt-2 border-t border-border pt-3 text-center sm:mt-6 sm:pt-3 text-xs text-muted-foreground">{copy}</p>}
          </div> : <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
            {brand}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">{links}</div>
            {contacts.length > 0 && <div className="flex flex-wrap justify-center gap-2">{contacts}</div>}
            {copy && <p className="w-full text-xs text-muted-foreground sm:hidden">{copy}</p>}
          </div>}
          {!full && copy && <p className="hidden border-t border-border py-3 text-center text-xs text-muted-foreground sm:block">{copy}</p>}
        </footer>;
      })()}

      {/* Floating WhatsApp support button: fixed to the bottom-right corner on every page. */}
      {wa && settings?.whatsapp_float !== false && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label={tr("Chat on WhatsApp")} title={tr("Chat on WhatsApp")}
          className="animate-pulse-ring home-whatsapp-float fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-visible rounded-full bg-success text-primary-foreground shadow-glow lg:bottom-6">
          <ContactIcon k="contact.whatsapp" className="h-7 w-7" fallback={<WhatsAppIcon className="h-7 w-7" />} />
        </a>
      )}


      <nav className="home-bottom-nav glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0 lg:hidden" aria-label="Shortcuts">
        <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${Math.max(1, (path === "/" ? bottom : bottom.filter(visible)).length)}, minmax(0, 1fr))` }}>
          {(path === "/" ? bottom : bottom.filter(visible)).map((b) => {
            const to = b.target_type === "internal_route" ? b.target_value : "";
            const active = to ? (to === "/" ? path === "/" : path.startsWith(to)) : false;
            return (
              <NavItem key={b.id} m={b} settings={settings} onAction={onAction}
                iconClass={`h-5 w-5 ${active ? "drop-shadow-[0_0_8px_var(--glow)]" : ""}`}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition ${active ? "text-primary" : "text-muted-foreground"}`} />
            );
          })}
        </div>
      </nav>

      <aside aria-label={tr("Menu")} className={`desktop-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex ${desktopMenuOpen ? "w-64" : "w-16"}`}>
        <div className={`flex h-[60px] shrink-0 items-center gap-2 border-b border-sidebar-border ${desktopMenuOpen ? "px-5" : "justify-center px-2"}`}>
          <Link to="/" title={siteName} className="flex min-w-0 items-center gap-2"><img src={siteLogo.url} alt={siteName} width={28} height={28} className="h-7 w-7 shrink-0 object-contain" /><span className={desktopMenuOpen ? "truncate font-display text-sm font-bold" : "sr-only"}>{siteName}</span></Link>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain py-5 ${desktopMenuOpen ? "px-3" : "px-2"}`}>
          {user ? <div className={`desktop-profile mb-5 ${desktopMenuOpen ? "is-expanded" : ""}`}>
            <Link to="/profile" title={tr("Account")} className={`flex min-w-0 items-center gap-3 ${desktopMenuOpen ? "px-2" : "justify-center"}`}>
              <Avatar path={profile?.avatar_url ?? null} name={profile?.full_name ?? ""} className="h-11 w-11 shrink-0" />
              <div className={desktopMenuOpen ? "min-w-0" : "sr-only"}><div className="truncate text-sm font-semibold">{profile?.full_name || profile?.username || tr("Account")}</div><div className="mt-1 font-mono text-xs text-muted-foreground">ID {profile?.public_id ?? "—"}</div></div>
            </Link>
            <div className={desktopMenuOpen ? "mt-2 px-2" : "mt-2 flex justify-center"}><AccountLevelButton compact={!desktopMenuOpen} /></div>
            <div className={`desktop-profile-wallet ${desktopMenuOpen ? "" : "is-collapsed"}`}><Button asChild variant="secondary" className="h-7 rounded-full px-3 text-xs"><Link to="/balance" title={`${t("header.balance")}: ${money(profile?.balance ?? 0)}`}><Wallet className={desktopMenuOpen ? "sr-only" : "h-4 w-4"} /><span className={desktopMenuOpen ? "font-bold text-primary" : "sr-only"}>{money(profile?.balance ?? 0)}</span></Link></Button>{desktopMenuOpen && <Button asChild size="icon" className="h-6 w-6 rounded-full"><Link to="/add-funds" aria-label={t("menu.add_funds", "Add Funds")} title={t("menu.add_funds", "Add Funds")}><PlusCircle className="h-4 w-4" /></Link></Button>}</div>
          </div> : <div className={`desktop-profile mb-5 ${desktopMenuOpen ? "is-expanded" : ""}`}>
            {desktopMenuOpen && <p className="mb-3 px-2 text-sm font-semibold">{tr("Welcome, Guest")}</p>}
            <Button asChild className={`w-full ${desktopMenuOpen ? "" : "px-0"}`}><Link to="/sign-in" title={tr("Sign In")}><LogIn className="shrink-0" /><span className={desktopMenuOpen ? "" : "sr-only"}>{tr("Sign In")}</span></Link></Button>
            {desktopMenuOpen && <Button asChild variant="secondary" className="mt-2 w-full"><Link to="/sign-up">{tr("Sign Up")}</Link></Button>}
          </div>}
          {desktopMenuOpen && <DesktopMusicPlayer />}
          {desktopMenuOpen && <div className="desktop-menu-group"><ShoppingCart className="h-4 w-4" />{tr("ORDER & SERVICES")}</div>}
          <nav className="flex flex-col gap-1" aria-label={tr("Menu")}>
            <Link to="/tickets" title={tr("My Tickets")} aria-current={path === "/tickets" ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md py-2 text-sm font-semibold hover:bg-sidebar-accent ${desktopMenuOpen ? "px-3" : "justify-center"} ${path === "/tickets" ? "bg-sidebar-accent text-primary" : ""}`}><Ticket className="h-4.5 w-4.5 shrink-0 text-primary" /><span className={desktopMenuOpen ? "" : "sr-only"}>{tr("My Tickets")}</span></Link>
            <Link to="/giveaway" title={tr("Giveaway")} aria-current={path === "/giveaway" ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-md py-2 text-sm font-semibold hover:bg-sidebar-accent ${desktopMenuOpen ? "px-3" : "justify-center"} ${path === "/giveaway" ? "bg-sidebar-accent text-primary" : ""}`}><Gift className="h-4.5 w-4.5 shrink-0 text-primary" /><span className={desktopMenuOpen ? "" : "sr-only"}>{tr("Giveaway")}</span></Link>
            <InstallMenuButton showLabel={desktopMenuOpen} className={`flex min-h-11 items-center gap-3 rounded-md py-2 text-left text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent ${desktopMenuOpen ? "px-3" : "justify-center"}`} />
            {menu.filter((m) => !isSettingsItem(m)).map((m) => {
              const active = m.target_type === "internal_route" && (m.target_value === "/" ? path === "/" : path === m.target_value || path.startsWith(`${m.target_value}/`));
              return <NavItem key={m.id} m={m} active={active} desktopSignedIn={!!user} settings={settings} onAction={onAction} iconClass="h-4.5 w-4.5 shrink-0 text-primary" className={`flex min-h-11 items-center gap-3 rounded-md py-2 text-sm font-semibold transition-colors hover:bg-sidebar-accent ${desktopMenuOpen ? "px-3" : "justify-center px-0"} ${active ? "bg-sidebar-accent text-sidebar-primary" : "text-sidebar-foreground"}`}><span className={desktopMenuOpen ? "min-w-0 break-words" : "sr-only"}>{pickLang(m.label, lang, m.system_key ?? "")}</span></NavItem>;
            })}
          </nav>
          {menu.filter(visible).filter((m) => user || m.target_value !== "logout").some(isSettingsItem) && <div className="mt-5 border-t border-sidebar-border pt-3">
            <Button variant="ghost" title={tr("Settings")} className={`w-full ${desktopMenuOpen ? "justify-start" : "justify-center px-0"}`} aria-expanded={settingsOpen} aria-controls="desktop-menu-settings" onClick={() => { setDesktopMenuOpen(true); setSettingsOpen((open) => !open); }}><Settings2 className="shrink-0 text-primary" /><span className={desktopMenuOpen ? "" : "sr-only"}>{tr("Settings")}</span>{desktopMenuOpen && <ChevronDown className={`ml-auto transition-transform motion-reduce:transition-none ${settingsOpen ? "rotate-180" : ""}`} />}</Button>
            {settingsOpen && <div id="desktop-menu-settings" className="mt-2 flex flex-col gap-1">
              {menu.filter(visible).filter(isSettingsItem).filter((m) => user || m.target_value !== "logout").map((m) => <NavItem key={m.id} m={m} settings={settings} onAction={onAction} iconClass={`h-4 w-4 shrink-0 ${m.target_value === "logout" ? "text-destructive" : "text-primary"}`} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${m.target_value === "logout" ? "text-destructive" : "text-sidebar-foreground"}`} />)}
            </div>}
          </div>}
        </div>
      </aside>

      <Sheet open={menuOpen && !isDesktop} onOpenChange={setMenuOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "max-h-[85vh] overflow-y-auto rounded-t-3xl" : "w-80 overflow-y-auto"}>
          <SheetHeader><SheetTitle className="text-gradient font-display">{siteName}</SheetTitle></SheetHeader>
          {user && profile && (
            <Link to="/profile" className="glass mx-4 flex items-center gap-3 rounded-2xl p-3">
              <Avatar path={profile.avatar_url} name={profile.full_name} className="h-12 w-12" />
              <div className="min-w-0">
                <div className="label-premium truncate">{profile.full_name || profile.username}</div>
                <div className="font-mono text-xs text-muted-foreground">ID {profile.public_id}</div>
                <div className="text-sm font-bold text-primary">{money(profile.balance)}</div>
              </div>
            </Link>
          )}
          <div className="mt-2 flex flex-col gap-1 px-2">
            {menu.filter(visible).map((m) => (
              <NavItem key={m.id} m={m} settings={settings} onAction={onAction}
                iconClass={`h-5 w-5 ${m.system_key === "logout" ? "" : "text-primary"}`}
                className={`label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent ${m.system_key === "logout" ? "text-destructive" : ""}`} />
            ))}
            <InstallMenuButton iconClass="h-5 w-5 text-primary" className="label-premium flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent" />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={langOpen} onOpenChange={setLangOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-gradient">{t("menu.language")}</DialogTitle>
          <div className="space-y-2">
            {LANGUAGES.filter((l) => enabled.includes(l.code)).map((l) => (
              <button key={l.code} onClick={() => { setLang(l.code); setLangOpen(false); toast.success(l.label); }}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${lang === l.code ? "border-primary bg-primary/10" : "border-border"}`}>
                <span>{l.label}</span>{lang === l.code && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
