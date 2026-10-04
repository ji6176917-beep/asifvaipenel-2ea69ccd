import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Eye, EyeOff, History, Pencil, Plus, RotateCcw, Send, Trash2, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  adminDeleteBroadcast, adminDeletePage, adminEditBroadcast, adminGetSite, adminGetTelegram, adminListBroadcasts, adminListPages,
  adminListQna, adminPageVersions, adminQnaAction, adminReorderQna, adminRestorePageVersion, adminSaveSite, adminSavePage,
  adminSaveQna, adminSaveTelegram, adminSendBroadcast, adminTestTelegram, adminTranslationStats, adminQnaHome, adminReorderQnaHome,
} from "@/lib/admin-site.functions";
import { adminSetIcon } from "@/lib/admin-content.functions";
import { LANGUAGES, useI18n } from "@/lib/i18n";
import { ALL_SLUGS, FOOTER_TOGGLES, FONTS, HOME_SECTIONS, THEME_DEFAULTS, homeConfig, langConfig, themeConfig, type HomeConfig, type Level, type ThemeConfig } from "@/lib/site-config";
import { telegramUrl, whatsappUrl, fmtDate } from "@/lib/format";
import { PlatformIcon } from "@/lib/brand";
import { Card, Empty, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Branding, ImagePick, LabelEditor, useLabels } from "./AdminContent";

type Site = Awaited<ReturnType<typeof adminGetSite>>;
type Patch = Partial<{ [K in keyof Site]: unknown }> & Record<string, unknown>;

function useSite() {
  const get = useServerFn(adminGetSite);
  const save = useServerFn(adminSaveSite);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-site"], queryFn: () => get() });
  const [busy, setBusy] = useState(false);
  const saveSite = async (patch: Patch, msg = "Saved") => {
    setBusy(true);
    try { await save({ data: patch as never }); toast.success(msg); qc.invalidateQueries({ queryKey: ["admin-site"] }); qc.invalidateQueries({ queryKey: ["settings"] }); return true; }
    catch (e) { toast.error((e as Error).message || "Could not save"); return false; }
    finally { setBusy(false); }
  };
  return { site: q.data, loading: q.isLoading, saveSite, busy };
}

function Row({ label, sub, children }: { label: string; sub?: string | undefined; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 py-3 last:border-0">
      <div className="min-w-0"><div className="label-premium text-sm">{label}</div>{sub && <div className="text-xs text-muted-foreground">{sub}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
const move = <T,>(arr: T[], i: number, d: number) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j]!, a[i]!]; return a; };
function Arrows({ onUp, onDown }: { onUp: () => void; onDown: () => void }) {
  return (<span className="flex gap-1">
    <button type="button" aria-label="Move up" onClick={onUp} className="rounded-lg p-1.5 hover:bg-accent"><ArrowUp className="h-4 w-4" /></button>
    <button type="button" aria-label="Move down" onClick={onDown} className="rounded-lg p-1.5 hover:bg-accent"><ArrowDown className="h-4 w-4" /></button>
  </span>);
}
function LevelPick({ value, onChange }: { value: Level; onChange: (v: Level) => void }) {
  return (<div className="flex gap-1">{(["off", "low", "high"] as const).map((l) => (
    <button key={l} type="button" onClick={() => onChange(l)} className={`${value === l ? "btn-glow" : "btn-ghost-glow"} !px-3 !py-1 text-xs capitalize`}>{l}</button>
  ))}</div>);
}
function Loading() { return <Skeleton className="h-64 rounded-3xl" />; }

/** Per-language text fields with markdown preview. */
function LangFields({ label, value, onChange, rich }: { label: string; value: Record<string, string>; onChange: (v: Record<string, string>) => void; rich?: boolean }) {
  const [lang, setLang] = useState("en");
  const v = value[lang] ?? "";
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className={`${labelCls} !mb-0 mr-2`}>{label}</span>
        {LANGUAGES.map((l) => (
          <button key={l.code} type="button" onClick={() => setLang(l.code)}
            className={`rounded-full px-2 py-0.5 text-[11px] ${lang === l.code ? "bg-primary text-primary-foreground" : value[l.code]?.trim() ? "bg-accent" : "bg-muted text-muted-foreground"}`}>{l.code}</button>
        ))}
      </div>
      {rich
        ? <textarea dir={lang === "ar" || lang === "fa" ? "rtl" : "ltr"} rows={6} className={inputCls} value={v} placeholder={lang === "en" ? "Markdown supported: **bold**, lists, [links](https://…)" : `Leave empty to use English`} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />
        : <input dir={lang === "ar" || lang === "fa" ? "rtl" : "ltr"} className={inputCls} value={v} placeholder={lang === "en" ? "" : "Leave empty to use English"} onChange={(e) => onChange({ ...value, [lang]: e.target.value })} />}
      {rich && v && <div className="md-content mt-2 rounded-2xl border border-border/50 p-3 text-sm text-muted-foreground"><ReactMarkdown>{v}</ReactMarkdown></div>}
    </div>
  );
}

/* ========================= 12. HOME PAGE ========================= */

export function AdminHome() {
  const { site, loading, saveSite, busy } = useSite();
  const [c, setC] = useState<HomeConfig | null>(null);
  useEffect(() => { if (site) setC(homeConfig(site.home_config)); }, [site]);
  if (loading || !c) return <Loading />;
  const setP = (i: number, p: Partial<HomeConfig["platforms"][number]>) => setC({ ...c, platforms: c.platforms.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="Show, hide and reorder sections of the home page.">Home Page</PageTitle>
      <Card>
        <h2 className="label-premium mb-2 text-lg">Sections</h2>
        {c.sections.map((s, i) => (
          <Row key={s.id} label={HOME_SECTIONS.find((x) => x.id === s.id)?.label ?? s.id}>
            <span className="flex items-center gap-2">
              <Arrows onUp={() => setC({ ...c, sections: move(c.sections, i, -1) })} onDown={() => setC({ ...c, sections: move(c.sections, i, 1) })} />
              <Switch aria-label={`Show ${s.id}`} checked={s.on} onCheckedChange={(on) => setC({ ...c, sections: c.sections.map((x, j) => (j === i ? { ...x, on } : x)) })} />
            </span>
          </Row>
        ))}
      </Card>
      <Card>
        <h2 className="label-premium mb-2 text-lg">Services logos</h2>
        <Row label="3D animation"><LevelPick value={c.anim} onChange={(anim) => setC({ ...c, anim })} /></Row>
        <div className="mt-2 space-y-3">
          {c.platforms.map((p, i) => (
            <div key={p.slug} className="rounded-2xl border border-border/50 p-3">
              <div className="flex items-center gap-3">
                <PlatformIcon slug={p.slug} className="h-8 w-8" />
                <span className="label-premium flex-1 capitalize">{p.slug}</span>
                <Arrows onUp={() => setC({ ...c, platforms: move(c.platforms, i, -1) })} onDown={() => setC({ ...c, platforms: move(c.platforms, i, 1) })} />
                <Switch aria-label={`Show ${p.slug}`} checked={p.on} onCheckedChange={(on) => setP(i, { on })} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div><label className={labelCls}>Name under logo</label><input className={inputCls} value={p.name ?? ""} placeholder="Default platform name" onChange={(e) => setP(i, { name: e.target.value })} /></div>
                <ImagePick label="Replace logo" value={p.logo ?? null} folder="icons" onChange={(logo) => setP(i, { logo })} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="label-premium mb-2 text-lg">Floating background logos</h2>
        <Row label="Show floating logos"><Switch checked={c.bg.on} onCheckedChange={(on) => setC({ ...c, bg: { ...c.bg, on } })} /></Row>
        <div className="flex flex-wrap gap-2 py-3">
          {ALL_SLUGS.map((s) => {
            const on = c.bg.slugs.includes(s);
            return <button key={s} type="button" onClick={() => setC({ ...c, bg: { ...c.bg, slugs: on ? c.bg.slugs.filter((x) => x !== s) : [...c.bg.slugs, s] } })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs capitalize ${on ? "border-primary bg-primary/10" : "border-border opacity-60"}`}><PlatformIcon slug={s} className="h-4 w-4" /> {s}</button>;
          })}
        </div>
        {([["opacity", "Opacity (%)", 0, 60], ["blur", "Blur (px)", 0, 20], ["speed", "Speed", 1, 10]] as const).map(([k, l, min, max]) => (
          <div key={k} className="py-2">
            <label className={labelCls}>{l}: {c.bg[k]}</label>
            <input type="range" min={min} max={max} value={c.bg[k]} onChange={(e) => setC({ ...c, bg: { ...c.bg, [k]: Number(e.target.value) } })} className="w-full accent-primary" />
          </div>
        ))}
      </Card>
      <Card>
        <h2 className="label-premium mb-2 text-lg">Footer</h2>
        <p className="mb-2 text-xs text-muted-foreground">Single quick links and contact icons are switched on/off in Menu & Navigation.</p>
        {FOOTER_TOGGLES.map(([k, l]) => (
          <Row key={k} label={l}><Switch aria-label={l} checked={c.footer[k]} onCheckedChange={(v) => setC({ ...c, footer: { ...c.footer, [k]: v } })} /></Row>
        ))}
      </Card>
      <button disabled={busy} onClick={() => saveSite({ home_config: c as unknown as Record<string, unknown> })} className="btn-glow w-full">{busy && <Spinner />} Save home page</button>
      <HomeQna on={c.sections.find((x) => x.id === "qna")?.on ?? true} />
      <HomeTexts />
    </div>
  );
}

function HomeQna({ on }: { on: boolean }) {
  const list = useServerFn(adminListQna); const setHome = useServerFn(adminQnaHome); const reorder = useServerFn(adminReorderQnaHome);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-qna"], queryFn: () => list() });
  const rows = [...(data ?? [])].sort((a, b) => Number(b.show_on_home) - Number(a.show_on_home) || a.home_sort - b.home_sort || a.sort - b.sort);
  const shown = rows.filter((r) => r.show_on_home);
  const run = async (p: Promise<unknown>, m: string) => {
    try { await p; toast.success(m); qc.invalidateQueries({ queryKey: ["admin-qna"] }); qc.invalidateQueries({ queryKey: ["qna"] }); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Card>
      <h2 className="label-premium text-lg">QnA on home page</h2>
      <p className="mb-2 text-xs text-muted-foreground">Master switch: "QnA section" in Sections above (currently {on ? "ON" : "OFF"}). If no question is selected, the section is hidden. Changes here apply instantly.</p>
      {isLoading ? <Loading /> : !rows.length ? <Empty text="No questions yet. Add them in QnA, Policies & Pages." /> : rows.map((q) => {
        const i = shown.findIndex((x) => x.id === q.id);
        return (
          <Row key={q.id} label={(q.question as Record<string, string>)["en"] ?? ""} sub={q.active ? undefined : "Hidden in QnA (inactive)"}>
            <span className="flex items-center gap-2">
              {q.show_on_home && <Arrows onUp={() => run(reorder({ data: { ids: move(shown, i, -1).map((x) => x.id) } }), "Reordered")} onDown={() => run(reorder({ data: { ids: move(shown, i, 1).map((x) => x.id) } }), "Reordered")} />}
              <Switch aria-label="Show on home page" checked={q.show_on_home} onCheckedChange={(v) => run(setHome({ data: { id: q.id, show: v } }), v ? "Shown on home" : "Removed from home")} />
            </span>
          </Row>
        );
      })}
    </Card>
  );
}

const HOME_TEXT_KEYS = ["home.badge", "home.hero_title", "home.hero_text", "home.services_title", "home.order_now", "home.qna_title", "footer.quick_links", "footer.info", "footer.rights"];
function HomeTexts() {
  const { data, isLoading } = useLabels();
  const rows = (data?.labels ?? []).filter((r) => HOME_TEXT_KEYS.includes(r.key)).sort((a, b) => HOME_TEXT_KEYS.indexOf(a.key) - HOME_TEXT_KEYS.indexOf(b.key));
  return (
    <div className="space-y-2">
      <h2 className="label-premium text-lg">Home page texts</h2>
      <p className="text-xs text-muted-foreground">Tap a text to edit it in every language. Empty languages use English. The full copyright line can be replaced in Theme & Branding → Site Identity.</p>
      {isLoading ? <Loading /> : rows.map((r) => <LabelEditor key={r.key} row={r} />)}
    </div>
  );
}

/* ========================= 13. SUPPORT & CONTACTS ========================= */

export function AdminSupport() {
  const { site, loading, saveSite } = useSite();
  const { icon } = useI18n();
  const setIcon = useServerFn(adminSetIcon);
  const qc = useQueryClient();
  const [f, setF] = useState({ telegram: "", whatsapp: "", email: "", support_hours: "" });
  useEffect(() => { if (site) setF({ telegram: site.telegram ?? "", whatsapp: site.whatsapp ?? "", email: site.email ?? "", support_hours: site.support_hours ?? "" }); }, [site]);
  if (loading || !site) return <Loading />;
  const tg = telegramUrl(f.telegram); const wa = whatsappUrl(f.whatsapp);
  const item = (key: keyof typeof f, label: string, hint: string, test: string | null) => (
    <Card key={key}>
      <label className={labelCls} htmlFor={`sup-${key}`}>{label}</label>
      <input id={`sup-${key}`} className={inputCls} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => saveSite({ [key]: f[key] } as Patch)} className="btn-glow !py-2 text-sm">Save</button>
        {test !== undefined && <a href={test ?? undefined} target="_blank" rel="noreferrer" aria-disabled={!test}
          className={`btn-ghost-glow !py-2 text-sm ${test ? "" : "pointer-events-none opacity-40"}`}><ExternalLink className="h-4 w-4" /> Test link</a>}
      </div>
    </Card>
  );
  const saveIcon = async (key: string, path: string | null) => {
    try { await setIcon({ data: { key, icon_url: path, page_group: "Footer" } }); qc.invalidateQueries({ queryKey: ["ui-content"] }); toast.success("Logo updated"); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle sub="Telegram and WhatsApp are separate and never replace each other.">Support & Contacts</PageTitle>
      {item("telegram", "Support Telegram username", "Used by every Support Admin button and Forgot Password. Opens t.me/<username>.", tg)}
      {item("whatsapp", "WhatsApp number", `Digits only are kept (country code first). Opens ${wa ?? "wa.me/<digits>"}. Leave empty to hide WhatsApp.`, wa)}
      {item("email", "Support email", "Shown in the footer.", f.email ? `mailto:${f.email}` : null)}
      <Card>
        <label className={labelCls} htmlFor="sup-hours">Working hours</label>
        <input id="sup-hours" className={inputCls} placeholder="e.g. Every day 10:00–22:00 (GMT+6)" value={f.support_hours} onChange={(e) => setF({ ...f, support_hours: e.target.value })} />
        <button onClick={() => saveSite({ support_hours: f.support_hours })} className="btn-glow mt-3 !py-2 text-sm">Save</button>
      </Card>
      <Card>
        <Row label="Floating WhatsApp button" sub="Round button at the bottom right of every page.">
          <Switch checked={site.whatsapp_float} onCheckedChange={(v) => saveSite({ whatsapp_float: v }, v ? "Button shown" : "Button hidden")} />
        </Row>
      </Card>
      <Card className="space-y-3">
        <h2 className="label-premium text-lg">Contact logos</h2>
        {([["contact.whatsapp", "WhatsApp logo"], ["contact.telegram", "Telegram logo"], ["contact.email", "E-mail logo"]] as const).map(([k, l]) => (
          <ImagePick key={k} label={l} value={icon(k)} folder="icons" onChange={(p) => saveIcon(k, p)} />
        ))}
      </Card>
    </div>
  );
}

/* ========================= 14. QNA, POLICIES & PAGES ========================= */

type QnaForm = { id?: string; question: Record<string, string>; answer: Record<string, string>; active: boolean };

export function AdminQnaPages() {
  const [tab, setTab] = useState<"qna" | "pages">("qna");
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="Rich text in every language; empty languages fall back to English.">QnA, Policies & Pages</PageTitle>
      <div className="flex gap-2">
        <button onClick={() => setTab("qna")} className={tab === "qna" ? "btn-glow !py-2 text-sm" : "btn-ghost-glow !py-2 text-sm"}>QnA</button>
        <button onClick={() => setTab("pages")} className={tab === "pages" ? "btn-glow !py-2 text-sm" : "btn-ghost-glow !py-2 text-sm"}>Pages</button>
      </div>
      {tab === "qna" ? <QnaManager /> : <PagesManager />}
    </div>
  );
}

function QnaManager() {
  const list = useServerFn(adminListQna); const save = useServerFn(adminSaveQna); const act = useServerFn(adminQnaAction); const reorder = useServerFn(adminReorderQna);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-qna"], queryFn: () => list() });
  const [f, setF] = useState<QnaForm | null>(null);
  const reload = () => { qc.invalidateQueries({ queryKey: ["admin-qna"] }); qc.invalidateQueries({ queryKey: ["qna"] }); };
  const run = async (p: Promise<unknown>, m: string) => { try { await p; toast.success(m); reload(); } catch (e) { toast.error((e as Error).message); } };
  if (isLoading) return <Loading />;
  const rows = data ?? [];
  return (
    <>
      <button onClick={() => setF({ question: {}, answer: {}, active: true })} className="btn-glow w-full"><Plus className="h-4 w-4" /> Add question</button>
      <Card>
        {!rows.length ? <Empty text="No questions yet." /> : rows.map((q, i) => (
          <div key={q.id} className={`flex items-center gap-2 border-b border-border/40 py-3 last:border-0 ${q.active ? "" : "opacity-50"}`}>
            <span className="min-w-0 flex-1 truncate label-premium text-sm">{(q.question as Record<string, string>)["en"]}</span>
            <Arrows onUp={() => run(reorder({ data: { ids: move(rows, i, -1).map((x) => x.id) } }), "Reordered")} onDown={() => run(reorder({ data: { ids: move(rows, i, 1).map((x) => x.id) } }), "Reordered")} />
            <Switch aria-label="Active" checked={q.active} onCheckedChange={(v) => run(act({ data: { id: q.id, action: v ? "on" : "off" } }), v ? "Shown" : "Hidden")} />
            <button aria-label="Edit" onClick={() => setF({ id: q.id, question: q.question as Record<string, string>, answer: q.answer as Record<string, string>, active: q.active })} className="rounded-lg p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
            <button aria-label="Delete" onClick={() => confirm("Delete this question?") && run(act({ data: { id: q.id, action: "delete" } }), "Deleted")} className="rounded-lg p-1.5 text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </Card>
      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>{f?.id ? "Edit question" : "New question"}</DialogTitle>
          {f && <div className="space-y-4">
            <LangFields label="Question" value={f.question} onChange={(question) => setF({ ...f, question })} />
            <LangFields label="Answer" rich value={f.answer} onChange={(answer) => setF({ ...f, answer })} />
            <button className="btn-glow w-full" onClick={async () => { try { await save({ data: f }); toast.success("Saved"); setF(null); reload(); } catch (e) { toast.error((e as Error).message); } }}>Save</button>
          </div>}
        </DialogContent>
      </Dialog>
    </>
  );
}

type PageForm = { slug: string; title: Record<string, string>; content: Record<string, string>; show_in_footer: boolean; is_new: boolean; is_custom: boolean };

function PagesManager() {
  const list = useServerFn(adminListPages); const save = useServerFn(adminSavePage); const del = useServerFn(adminDeletePage);
  const versions = useServerFn(adminPageVersions); const restore = useServerFn(adminRestorePageVersion);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-pages"], queryFn: () => list() });
  const [f, setF] = useState<PageForm | null>(null);
  const [hist, setHist] = useState<string | null>(null);
  const { data: vers } = useQuery({ queryKey: ["admin-page-versions", hist], enabled: !!hist, queryFn: () => versions({ data: { slug: hist! } }) });
  const reload = () => { qc.invalidateQueries({ queryKey: ["admin-pages"] }); qc.invalidateQueries({ queryKey: ["page"] }); qc.invalidateQueries({ queryKey: ["footer-pages"] }); };
  if (isLoading) return <Loading />;
  return (
    <>
      <button onClick={() => setF({ slug: "", title: {}, content: {}, show_in_footer: true, is_new: true, is_custom: true })} className="btn-glow w-full"><Plus className="h-4 w-4" /> Add custom page</button>
      <Card>
        {(data ?? []).map((p) => (
          <div key={p.slug} className="flex items-center gap-2 border-b border-border/40 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="label-premium truncate text-sm">{(p.title as Record<string, string>)["en"]} {p.is_custom && <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px]">CUSTOM</span>}</div>
              <div className="font-mono text-xs text-muted-foreground">/p/{p.slug} · updated {fmtDate(p.updated_at)}</div>
            </div>
            <button aria-label="Versions" onClick={() => setHist(p.slug)} className="rounded-lg p-1.5 hover:bg-accent"><History className="h-4 w-4" /></button>
            <button aria-label="Edit" onClick={() => setF({ slug: p.slug, title: p.title as Record<string, string>, content: p.content as Record<string, string>, show_in_footer: p.show_in_footer, is_new: false, is_custom: p.is_custom })} className="rounded-lg p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
            {p.is_custom && <button aria-label="Delete" onClick={async () => { if (!confirm("Delete this page?")) return; try { await del({ data: { slug: p.slug } }); toast.success("Deleted"); reload(); } catch (e) { toast.error((e as Error).message); } }} className="rounded-lg p-1.5 text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
      </Card>
      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogTitle>{f?.is_new ? "New page" : "Edit page"}</DialogTitle>
          {f && <div className="space-y-4">
            {f.is_new && <div><label className={labelCls}>Slug (address)</label><input className={inputCls} placeholder="e.g. how-to-order" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /><p className="mt-1 text-xs text-muted-foreground">Page address: /p/{f.slug || "…"}</p></div>}
            <LangFields label="Title" value={f.title} onChange={(title) => setF({ ...f, title })} />
            <LangFields label="Content" rich value={f.content} onChange={(content) => setF({ ...f, content })} />
            {f.is_custom && <Row label="Show in footer"><Switch checked={f.show_in_footer} onCheckedChange={(v) => setF({ ...f, show_in_footer: v })} /></Row>}
            <button className="btn-glow w-full" onClick={async () => { try { await save({ data: { slug: f.slug, title: f.title, content: f.content, show_in_footer: f.show_in_footer, is_new: f.is_new } }); toast.success("Page saved"); setF(null); reload(); } catch (e) { toast.error((e as Error).message); } }}>Save</button>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!hist} onOpenChange={(o) => !o && setHist(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogTitle>Last 10 versions</DialogTitle>
          {!vers?.length ? <Empty text="No earlier versions yet." /> : vers.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-2 text-sm">
              <span>{fmtDate(v.created_at)} — {(v.title as Record<string, string>)["en"]}</span>
              <button className="btn-ghost-glow !px-3 !py-1 text-xs" onClick={async () => { try { await restore({ data: { id: v.id } }); toast.success("Version restored"); setHist(null); reload(); } catch (e) { toast.error((e as Error).message); } }}><RotateCcw className="h-3.5 w-3.5" /> Restore</button>
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ========================= 15. LANGUAGES ========================= */

export function AdminLanguages() {
  const { site, loading, saveSite, busy } = useSite();
  const statsFn = useServerFn(adminTranslationStats);
  const { data: stats } = useQuery({ queryKey: ["admin-tr-stats"], queryFn: () => statsFn() });
  const [c, setC] = useState(langConfig(null));
  useEffect(() => { if (site) setC(langConfig(site.languages_config)); }, [site]);
  if (loading) return <Loading />;
  return (
    <div className="max-w-2xl space-y-4">
      <PageTitle sub="Every editable text supports each language and falls back to English when empty.">Languages</PageTitle>
      <Card>
        {LANGUAGES.map((l) => {
          const on = c.enabled.includes(l.code);
          const rtl = c.rtl.includes(l.code);
          return (
            <div key={l.code} className="flex flex-wrap items-center gap-3 border-b border-border/40 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="label-premium text-sm">{l.label} {c.default === l.code && <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">DEFAULT</span>}</div>
                {stats && <div className="text-xs text-muted-foreground">{stats.missing[l.code] ?? 0} of {stats.total} texts missing a translation</div>}
              </div>
              <label className="flex items-center gap-1.5 text-xs">RTL <Switch checked={rtl} onCheckedChange={(v) => setC({ ...c, rtl: v ? [...c.rtl, l.code] : c.rtl.filter((x) => x !== l.code) })} /></label>
              <button disabled={!on} onClick={() => setC({ ...c, default: l.code })} className="btn-ghost-glow !px-3 !py-1 text-xs disabled:opacity-40">Make default</button>
              <Switch aria-label={`Enable ${l.label}`} checked={on} disabled={l.code === c.default}
                onCheckedChange={(v) => setC({ ...c, enabled: v ? [...c.enabled, l.code] : c.enabled.filter((x) => x !== l.code) })} />
            </div>
          );
        })}
      </Card>
      <p className="text-xs text-muted-foreground">The default language is used for first-time visitors. Visitors can still switch to any enabled language.</p>
      <button disabled={busy} onClick={() => saveSite({ languages_config: c })} className="btn-glow w-full">{busy && <Spinner />} Save languages</button>
    </div>
  );
}

/* ========================= 16. NOTIFICATIONS & POPUPS ========================= */

export function AdminNotifications() {
  const send = useServerFn(adminSendBroadcast); const list = useServerFn(adminListBroadcasts);
  const edit = useServerFn(adminEditBroadcast); const del = useServerFn(adminDeleteBroadcast);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-broadcasts"], queryFn: () => list() });
  const blank = { kind: "popup" as "popup" | "notification", title: "", body: "", image: null as string | null, link: "", button: "", expires: "", show_once: true, target: "all" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [ed, setEd] = useState<{ id: string; title: string; body: string; expires: string } | null>(null);
  const reload = () => qc.invalidateQueries({ queryKey: ["admin-broadcasts"] });
  const submit = async () => {
    if (!f.title.trim()) { toast.error("Title is required"); return; }
    if (f.target === "all" && !confirm("Send to ALL users?")) return;
    setBusy(true);
    try {
      const r = await send({ data: { kind: f.kind, title: f.title, body: f.body, image: f.image, link: f.link.trim() || null, button: f.button.trim() || null,
        expires_at: f.expires ? new Date(f.expires).toISOString() : null, show_once: f.show_once, target: f.target } });
      toast.success(`Sent to ${r.recipients} user(s)`); setF(blank); reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="Send a popup or an in-app notification to one user or everyone.">Notifications & Popups</PageTitle>
      <Card className="space-y-3">
        <div className="flex gap-2">
          {(["popup", "notification"] as const).map((k) => <button key={k} onClick={() => setF({ ...f, kind: k })} className={`${f.kind === k ? "btn-glow" : "btn-ghost-glow"} !py-2 text-sm capitalize`}>{k}</button>)}
        </div>
        <div><label className={labelCls}>Send to</label><input className={inputCls} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} placeholder="all — or a User ID, email or username" /></div>
        <div><label className={labelCls}>Title</label><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div><label className={labelCls}>Message</label><textarea rows={4} className={inputCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></div>
        {f.kind === "popup" && <>
          <ImagePick label="Image (optional)" value={f.image} folder="popup" onChange={(image) => setF({ ...f, image })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Button text</label><input className={inputCls} placeholder="OK" value={f.button} onChange={(e) => setF({ ...f, button: e.target.value })} /></div>
            <div><label className={labelCls}>Button link</label><input className={inputCls} placeholder="https://… or /add-funds" value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} /></div>
          </div>
          <Row label="Show once" sub="Off = shows on every visit until it expires."><Switch checked={f.show_once} onCheckedChange={(v) => setF({ ...f, show_once: v })} /></Row>
        </>}
        <div><label className={labelCls}>Expires (optional)</label><input type="datetime-local" className={inputCls} value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></div>
        <button disabled={busy} onClick={submit} className="btn-glow w-full">{busy ? <Spinner /> : <Send className="h-4 w-4" />} Send</button>
      </Card>
      <Card>
        <h2 className="label-premium mb-2 text-lg">Sent</h2>
        {isLoading ? <Skeleton className="h-24" /> : !data?.length ? <Empty text="Nothing sent yet." /> : data.map((b) => (
          <div key={b.id} className="flex items-center gap-2 border-b border-border/40 py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="label-premium truncate text-sm">{b.title} <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase">{b.kind}</span></div>
              <div className="text-xs text-muted-foreground">{fmtDate(b.created_at)} · {b.target === "all" ? "All users" : "One user"} · seen {b.seen}/{b.sent}{b.expires_at ? ` · expires ${fmtDate(b.expires_at)}` : ""}</div>
            </div>
            <button aria-label="Edit" onClick={() => setEd({ id: b.id, title: b.title, body: b.body, expires: b.expires_at ? b.expires_at.slice(0, 16) : "" })} className="rounded-lg p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
            <button aria-label="Delete" onClick={async () => { if (!confirm("Delete this for everyone?")) return; await del({ data: { id: b.id } }); toast.success("Deleted"); reload(); }} className="rounded-lg p-1.5 text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </Card>
      <TelegramAlerts />
      <Dialog open={!!ed} onOpenChange={(o) => !o && setEd(null)}>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          {ed && <div className="space-y-3">
            <input className={inputCls} value={ed.title} onChange={(e) => setEd({ ...ed, title: e.target.value })} />
            <textarea rows={4} className={inputCls} value={ed.body} onChange={(e) => setEd({ ...ed, body: e.target.value })} />
            <input type="datetime-local" className={inputCls} value={ed.expires} onChange={(e) => setEd({ ...ed, expires: e.target.value })} />
            <button className="btn-glow w-full" onClick={async () => { try { await edit({ data: { id: ed.id, title: ed.title, body: ed.body, expires_at: ed.expires ? new Date(ed.expires).toISOString() : null } }); toast.success("Updated"); setEd(null); reload(); } catch (e) { toast.error((e as Error).message); } }}>Save</button>
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TelegramAlerts() {
  const get = useServerFn(adminGetTelegram); const save = useServerFn(adminSaveTelegram); const test = useServerFn(adminTestTelegram);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-tg"], queryFn: () => get(), refetchInterval: 10_000 });
  const [f, setF] = useState({ bot_token: "", chat_id: "", on_order: true, on_deposit: true, on_user: false });
  const [show, setShow] = useState(false);
  useEffect(() => { if (data) setF((p) => ({ ...p, chat_id: data.chat_id, on_order: data.on_order, on_deposit: data.on_deposit, on_user: data.on_user })); }, [data?.chat_id, data?.on_order, data?.on_deposit, data?.on_user]);
  return (
    <Card className="space-y-3">
      <h2 className="label-premium text-lg">Telegram alerts</h2>
      <div>
        <label className={labelCls}>Bot token {data?.has_token && <span className="text-success">✓ saved</span>}</label>
        <div className="relative">
          <input type={show ? "text" : "password"} autoComplete="off" className={inputCls} placeholder={data?.has_token ? "Saved — type to replace" : "123456:ABC-…"} value={f.bot_token} onChange={(e) => setF({ ...f, bot_token: e.target.value })} />
          <button type="button" aria-label="Show token" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Stored on the server only and never shown again.</p>
      </div>
      <div><label className={labelCls}>Admin chat ID</label><input className={inputCls} placeholder="e.g. 123456789 or -100…" value={f.chat_id} onChange={(e) => setF({ ...f, chat_id: e.target.value })} /></div>
      <Row label="New order"><Switch checked={f.on_order} onCheckedChange={(v) => setF({ ...f, on_order: v })} /></Row>
      <Row label="New add-funds request"><Switch checked={f.on_deposit} onCheckedChange={(v) => setF({ ...f, on_deposit: v })} /></Row>
      <Row label="New user"><Switch checked={f.on_user} onCheckedChange={(v) => setF({ ...f, on_user: v })} /></Row>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-glow" onClick={async () => { try { await save({ data: { ...f, bot_token: f.bot_token || undefined } }); setF({ ...f, bot_token: "" }); toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-tg"] }); } catch (e) { toast.error((e as Error).message); } }}>Save</button>
        <button className="btn-ghost-glow" onClick={async () => { try { await test(); toast.success("Test message sent — check Telegram"); setTimeout(() => qc.invalidateQueries({ queryKey: ["admin-tg"] }), 3000); } catch (e) { toast.error((e as Error).message); } }}><Send className="h-4 w-4" /> Send test message</button>
      </div>
      <div>
        <div className={labelCls}>Last 20 deliveries</div>
        {!data?.log.length ? <p className="text-xs text-muted-foreground">No messages sent yet.</p> : (
          <div className="space-y-1 text-xs">
            {data.log.map((l) => (
              <div key={l.id} className="flex justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1">
                <span>{fmtDate(l.created_at)} · {l.event}</span>
                <span className={l.status_code && l.status_code < 300 ? "text-success" : l.status_code ? "text-destructive" : "text-muted-foreground"}>
                  {l.status_code ? (l.status_code < 300 ? "Delivered" : `Failed (${l.status_code})`) : l.event.includes("error") ? "Failed" : "Sending…"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ========================= 17. THEME & BRANDING ========================= */

export function AdminTheme() {
  const { site, loading, saveSite, busy } = useSite();
  const [t, setT] = useState<ThemeConfig>(THEME_DEFAULTS);
  useEffect(() => { if (site) setT(themeConfig(site.theme_config)); }, [site]);
  if (loading) return <Loading />;
  const color = (k: keyof ThemeConfig, l: string) => (
    <label className="flex items-center justify-between gap-3 py-2 text-sm"><span>{l}</span>
      <span className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{String(t[k])}</span>
        <input type="color" value={String(t[k])} onChange={(e) => setT({ ...t, [k]: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent" /></span></label>
  );
  const font = FONTS.find((x) => x.id === t.font) ?? FONTS[0];
  return (
    <div className="max-w-3xl space-y-4">
      <PageTitle sub="Changes apply to every visitor after you save.">Theme & Branding</PageTitle>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${font.q}&display=swap`} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="label-premium mb-1 text-lg">Colours</h2>
          {color("primary_light", "Primary — light mode")}{color("primary_dark", "Primary — dark mode")}
          {color("glow_light", "Glow — light mode")}{color("glow_dark", "Glow — dark mode")}
          <label className={`${labelCls} mt-2`}>Button glow intensity: {t.glow}%</label>
          <input type="range" min={0} max={100} value={t.glow} onChange={(e) => setT({ ...t, glow: Number(e.target.value) })} className="w-full accent-primary" />
          <label className={`${labelCls} mt-2`}>Corner radius: {t.radius.toFixed(2)}rem</label>
          <input type="range" min={0} max={2} step={0.125} value={t.radius} onChange={(e) => setT({ ...t, radius: Number(e.target.value) })} className="w-full accent-primary" />
        </Card>
        <Card>
          <h2 className="label-premium mb-1 text-lg">Style</h2>
          <label className={labelCls}>Font</label>
          <select className={inputCls} value={t.font} onChange={(e) => setT({ ...t, font: e.target.value })}>{FONTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
          <Row label="3D background"><Switch checked={t.bg3d} onCheckedChange={(v) => setT({ ...t, bg3d: v })} /></Row>
          <Row label="Animation level"><LevelPick value={t.anim} onChange={(anim) => setT({ ...t, anim })} /></Row>
          <label className={labelCls}>Default theme</label>
          <div className="flex gap-1">{(["dark", "light", "system"] as const).map((d) => <button key={d} onClick={() => setT({ ...t, default_theme: d })} className={`${t.default_theme === d ? "btn-glow" : "btn-ghost-glow"} !px-3 !py-1 text-xs capitalize`}>{d}</button>)}</div>
        </Card>
      </div>
      <Card>
        <h2 className="label-premium mb-3 text-lg">Live preview</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {([["Light", t.primary_light, t.glow_light, "#f7faf8", "#0d1a12"], ["Dark", t.primary_dark, t.glow_dark, "#0b120e", "#eef6f0"]] as const).map(([n, p, g, bg, fg]) => (
            <div key={n} className="p-4" style={{ background: bg, color: fg, borderRadius: `${t.radius + 0.75}rem`, fontFamily: `"${font.body}", sans-serif` }}>
              <div style={{ fontFamily: `"${font.display}", sans-serif` }} className="text-lg font-bold">{n} mode</div>
              <p className="text-xs opacity-70">Grow every account, delivered by real people.</p>
              <button className="mt-3 px-4 py-2 text-sm font-bold" style={{ background: p, color: n === "Dark" ? "#06100a" : "#fff", borderRadius: `${t.radius}rem`, boxShadow: `0 0 ${Math.round(t.glow / 4)}px ${g}` }}>Order Now</button>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setT(THEME_DEFAULTS); }} className="btn-ghost-glow"><RotateCcw className="h-4 w-4" /> Reset to default</button>
        <button disabled={busy} onClick={() => saveSite({ theme_config: t })} className="btn-glow">{busy && <Spinner />} Save theme</button>
      </div>
      <h2 className="label-premium pt-4 text-xl">Site Identity</h2>
      <p className="text-xs text-muted-foreground">Website name, logo and favicon appear in the header, footer, sign-in/sign-up pages, browser tab and menu.</p>
      <Branding identityOnly />
    </div>
  );
}

/* ========================= 18. GENERAL SETTINGS ========================= */

export function GeneralSettings() {
  const { site, loading, saveSite, busy } = useSite();
  const [f, setF] = useState<Site | null>(null);
  useEffect(() => { if (site) setF(site); }, [site]);
  if (loading || !f) return <Loading />;
  const sw = (k: keyof Site, label: string, sub?: string) => (
    <Row label={label} sub={sub}><Switch checked={!!f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} /></Row>
  );
  const lc = langConfig(f.languages_config);
  const save = () => saveSite({
    maintenance_on: f.maintenance_on, maintenance_text: f.maintenance_text, allow_signups: f.allow_signups, allow_orders: f.allow_orders,
    api_global_enabled: f.api_global_enabled, require_verified_email: f.require_verified_email, require_screenshot: f.require_screenshot,
    cookie_notice: f.cookie_notice, blocked_email_domains: f.blocked_email_domains, seo_title: f.seo_title, seo_description: f.seo_description,
    share_image_url: f.share_image_url, session_timeout_min: Number(f.session_timeout_min) || 0, languages_config: lc,
    bdt_rate: Number(f.bdt_rate), deposit_min: Number(f.deposit_min), deposit_max: Number(f.deposit_max),
  }, "Settings saved");
  return (
    <Card>
      <h2 className="label-premium mb-1 text-lg">General switches</h2>
      {sw("maintenance_on", "Maintenance mode", "Visitors see a maintenance message. The admin panel still works.")}
      {f.maintenance_on && <textarea rows={2} className={`${inputCls} mb-2`} value={f.maintenance_text} onChange={(e) => setF({ ...f, maintenance_text: e.target.value })} />}
      {sw("allow_signups", "Allow new sign-ups")}
      {sw("allow_orders", "Allow new orders")}
      {sw("api_global_enabled", "Allow API orders")}
      {sw("require_verified_email", "Require email verification before ordering")}
      {sw("require_screenshot", "Require payment screenshot")}
      {sw("cookie_notice", "Cookie notice")}
      <div className="space-y-3 pt-3">
        <div><label className={labelCls}>Blocked email domains</label><textarea rows={2} className={inputCls} placeholder="mailinator.com, tempmail.com, 10minutemail.com" value={f.blocked_email_domains} onChange={(e) => setF({ ...f, blocked_email_domains: e.target.value })} /></div>
        <div><label className={labelCls}>SEO title</label><input className={inputCls} value={f.seo_title} placeholder={f.site_name} onChange={(e) => setF({ ...f, seo_title: e.target.value })} /></div>
        <div><label className={labelCls}>SEO description</label><textarea rows={2} className={inputCls} value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value })} /></div>
        <ImagePick label="Share image" value={f.share_image_url} folder="branding" onChange={(v) => setF({ ...f, share_image_url: v })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={labelCls}>Session timeout (minutes, 0 = never)</label><input type="number" min={0} className={inputCls} value={f.session_timeout_min} onChange={(e) => setF({ ...f, session_timeout_min: Number(e.target.value) })} /></div>
          <div><label className={labelCls}>Default language</label>
            <select className={inputCls} value={lc.default} onChange={(e) => setF({ ...f, languages_config: { ...lc, default: e.target.value, enabled: lc.enabled.includes(e.target.value) ? lc.enabled : [...lc.enabled, e.target.value] } })}>
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className={labelCls}>BDT per 1 USD</label><input type="number" step="0.01" className={inputCls} value={f.bdt_rate} onChange={(e) => setF({ ...f, bdt_rate: Number(e.target.value) })} /></div>
          <div><label className={labelCls}>Min deposit ($)</label><input type="number" step="0.01" className={inputCls} value={f.deposit_min} onChange={(e) => setF({ ...f, deposit_min: Number(e.target.value) })} /></div>
          <div><label className={labelCls}>Max deposit ($)</label><input type="number" step="0.01" className={inputCls} value={f.deposit_max} onChange={(e) => setF({ ...f, deposit_max: Number(e.target.value) })} /></div>
        </div>
        <button disabled={busy} onClick={save} className="btn-glow w-full">{busy && <Spinner />} Save settings</button>
      </div>
    </Card>
  );
}
