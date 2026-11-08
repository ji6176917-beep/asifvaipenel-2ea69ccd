import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home, User, Wallet, ShoppingCart, History, PlusCircle, ReceiptText, ShieldCheck, HelpCircle, Info,
  LogOut, Bell, X, Mail, Sparkles, Code2, LayoutDashboard, Languages, Music, Check,

} from "lucide-react";
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
import { MusicProvider, useMusic } from "@/components/MusicPlayer";
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

function NavItem({ m, className, iconClass = "h-5 w-5 text-primary", onAction, settings, children, showIcon = true }: {
  m: MenuItem; className: string; iconClass?: string; onAction: (a: string) => void; settings?: Settings | null | undefined; children?: ReactNode; showIcon?: boolean;
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
  if (h.kind === "route") return <Link to={h.to as never} className={className}>{inner}</Link>;
  if (h.kind === "external") return <a href={h.to} target={h.to.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" className={className}>{inner}</a>;
  return <button type="button" onClick={() => (h.to === "support" ? tap() : onAction(h.to))} className={`${className} text-left`}>{inner}</button>;
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

  useEffect(() => { setCookieOk(localStorage.getItem("cookie_ok") === "1"); }, []);

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
    <div className={`relative min-h-screen pb-28 ${path === "/" ? "home-reference-shell" : path === "/order" ? "order-reference-shell" : ""}`}>
      <ThemeApplier t={theme} />
      {path !== "/" && path !== "/order" && <FloatingBackground cfg={home.bg} glowOn={theme.bg3d} />}
      <WelcomePopup s={settings as Settings | null | undefined} />

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
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <img src={siteLogo.url} alt={`${siteName} - Global Social Media Growth Logo`} width={36} height={36} className="h-9 w-auto shrink-0 object-contain" />
            <span className="home-brand-copy min-w-0"><span className="home-brand-name block truncate font-display text-base font-bold sm:text-lg">{headerName}</span>{path === "/" && <span className="home-brand-tagline">{tr("Social Media Growth Partner")}</span>}</span>
          </Link>
          <div className="home-header-tools ml-auto flex shrink-0 items-center gap-1.5">
            {user ? (<>
              <Link to="/balance" className="home-wallet btn-ghost-glow !px-3 !py-1.5 text-sm">
                <Wallet className="h-4 w-4 text-primary" /> {money(profile?.balance ?? 0)}
              </Link>
              <UserInbox />
            </>) : (<>
              <Link to="/sign-in" className="inline-flex h-8 items-center rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:h-9 sm:px-4 sm:text-sm">{tr("Sign In")}</Link>
              <Link to="/sign-up" className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:h-9 sm:px-4 sm:text-sm">{tr("Sign Up")}</Link>
            </>)}
            <Button variant="ghost" size="icon" aria-label={t("header.open_menu")} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className={`${path === "/" ? "home-menu-button" : "menu-btn"} ${menuOpen ? "is-open" : ""}`}>
              <span className="menu-dots" aria-hidden><i /><i /><i /></span>{path === "/" && <span className="home-menu-label">{tr("Menu")}</span>}
            </Button>
          </div>
        </div>

      </header>

      {user && !verified && (
        <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm sm:mx-4 lg:mx-auto">
          <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-warning" /> {t("header.verify_banner")}</span>
          <button onClick={resend} className="font-semibold text-primary underline-offset-2 hover:underline">{t("header.resend")}</button>
        </div>
      )}

      <main className={path === "/" ? "home-main" : path === "/order" ? "order-main" : `mx-auto px-4 pt-6 ${path.startsWith("/admin") ? "max-w-7xl" : "max-w-5xl"}`}>
        {settings?.maintenance_on && !path.startsWith("/admin") ? (
          <div className="glass mx-auto mt-10 max-w-lg rounded-3xl p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-gradient mt-3 text-3xl font-bold">{t("maintenance.title", "Under maintenance")}</h1>
            <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{settings.maintenance_text}</p>
          </div>
        ) : <RouteTransition>{children}</RouteTransition>}
      </main>

      {path !== "/order" && !(path === "/" && home.sections.find((x) => x.id === "footer")?.on === false) && <footer className="mx-auto mt-20 max-w-5xl px-4 pb-8 sm:mt-24">
        <div className="glass space-y-6 rounded-3xl p-6">
          {fc.info && <div>
            <h3 className="label-premium mb-3 text-lg">{t("footer.info")}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {footInfo.filter(visible).map((m) => {
                const txt = m.target_type === "whatsapp" ? (m.target_value || settings?.whatsapp || undefined)
                  : m.target_type === "telegram" ? tr("Telegram Support")
                  : m.target_type === "email" ? (m.target_value || settings?.email || undefined) : undefined;
                return <NavItem key={m.id} m={m} settings={settings} onAction={onAction} iconClass="h-5 w-5 shrink-0 text-primary" className="footer-contact flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium">{txt ? <span className="truncate">{txt}</span> : undefined}</NavItem>;
              })}
            </div>
          </div>}
          {fc.hours && settings?.support_hours && <p className="text-xs text-muted-foreground">{t("footer.hours", "Support hours")}: {settings.support_hours}</p>}
          {(fc.quick_links || (fc.pages && !!footerPages?.length)) && <div className="border-t border-border pt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("footer.quick_links")}</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {fc.quick_links && footLinks.filter(visible).map((m) => <NavItem key={m.id} m={m} settings={settings} onAction={onAction} showIcon={false} className="hover:text-primary" />)}
              {fc.pages && (footerPages ?? []).map((p) => <Link key={p.slug} to="/p/$slug" params={{ slug: p.slug }} className="hover:text-primary">{pickLang(p.title, lang, p.slug)}</Link>)}
            </div>
          </div>}
          {fc.copyright && <p className="text-xs text-muted-foreground">{settings?.footer_copyright || `© ${new Date().getFullYear()} ${siteName}. ${t("footer.rights")}`}</p>}
        </div>
      </footer>}

      {/* Floating WhatsApp support button: fixed to the bottom-right corner on every page. */}
      {wa && settings?.whatsapp_float !== false && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label={tr("Chat on WhatsApp")} title={tr("Chat on WhatsApp")}
          className="animate-pulse-ring home-whatsapp-float fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center overflow-visible rounded-full bg-success text-primary-foreground shadow-glow">
          <ContactIcon k="contact.whatsapp" className="h-7 w-7" fallback={<WhatsAppIcon className="h-7 w-7" />} />
        </a>
      )}


      <nav className="home-bottom-nav glass fixed inset-x-0 bottom-0 z-40 rounded-none border-x-0 border-b-0" aria-label="Shortcuts">
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

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
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
