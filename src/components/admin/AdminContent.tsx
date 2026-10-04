import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, RotateCcw, Upload, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  adminGetBranding, adminListLabels, adminResetLabel, adminSaveBranding, adminSaveLabel, adminSetIcon, adminUploadImage,
} from "@/lib/admin-content.functions";
import { LABEL_GROUPS, LANGUAGES } from "@/lib/i18n";
import { useStorageUrl } from "@/lib/storage-url";
import { Card, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

export async function fileToUpload(file: File) {
  if (!/^image\/(png|jpeg|webp|svg\+xml|x-icon)$/.test(file.type)) throw new Error("Use PNG, JPG, SVG, WebP or ICO");
  if (file.size > 1024 * 1024) throw new Error("Max 1 MB");
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
  return { base64: btoa(bin), type: file.type as "image/png" };
}

export function ImagePick({ label, value, folder, onChange }: { label: string; value: string | null; folder: "icons" | "branding" | "menu" | "popup"; onChange: (v: string | null) => void }) {
  const upload = useServerFn(adminUploadImage);
  const url = useStorageUrl("logos", value);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { const { path } = await upload({ data: { ...(await fileToUpload(file)), folder } }); onChange(path); }
    catch (e) { toast.error((e as Error).message || "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] text-muted-foreground">none</span>}
        </span>
        <label className="btn-ghost-glow cursor-pointer !px-3 !py-1.5 text-xs">
          {busy ? <Spinner /> : <Upload className="h-3.5 w-3.5" />} Upload
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <input aria-label={`${label} URL`} placeholder="or paste https:// URL" className={`${inputCls} !py-1.5 text-xs`} value={value && /^https?:/.test(value) ? value : ""} onChange={(e) => onChange(e.target.value || null)} />
        {value && <button type="button" aria-label="Remove" onClick={() => onChange(null)} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

export function AdminContent() {
  const [view, setView] = useState<"labels" | "icons" | "branding">("labels");
  return (
    <div className="space-y-4">
      <PageTitle sub="Edit every text, button name and icon. Changes appear for visitors right away.">Website Content & Labels</PageTitle>
      <div className="flex flex-wrap gap-2">
        {([["labels", "Texts & labels"], ["icons", "Icons"], ["branding", "Branding, banner & popup"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} className={view === id ? "btn-glow !py-2 text-sm" : "btn-ghost-glow !py-2 text-sm"}>{l}</button>
        ))}
      </div>
      {view === "labels" ? <Labels /> : view === "icons" ? <Icons /> : <Branding />}
    </div>
  );
}

type LabelRow = Awaited<ReturnType<typeof adminListLabels>>["labels"][number];

export function useLabels() {
  const list = useServerFn(adminListLabels);
  return useQuery({ queryKey: ["admin-labels"], queryFn: () => list() });
}

function Labels() {
  const { data, isLoading, isError } = useLabels();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("all");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data?.labels ?? []).filter((l) => (group === "all" || l.page_group === group) &&
      (!t || l.key.includes(t) || l.default_text.toLowerCase().includes(t) || JSON.stringify(l.translations).toLowerCase().includes(t)));
  }, [data, q, group]);
  if (isError) return <ErrorState />;
  if (isLoading) return <Skeleton className="h-60 rounded-3xl" />;
  const groups = LABEL_GROUPS.filter((g) => rows.some((r) => r.page_group === g));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search labels" placeholder="Search texts" className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Page" className={`${inputCls} !w-auto`} value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="all">All pages</option>
          {LABEL_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      {!rows.length ? <Empty text="No texts match." /> : groups.map((g) => (
        <div key={g} className="space-y-2">
          <h3 className="label-premium text-lg">{g}</h3>
          {rows.filter((r) => r.page_group === g).map((r) => <LabelEditor key={r.key} row={r} />)}
        </div>
      ))}
    </div>
  );
}

export function LabelEditor({ row }: { row: LabelRow }) {
  const save = useServerFn(adminSaveLabel);
  const reset = useServerFn(adminResetLabel);
  const qc = useQueryClient();
  const tr = (row.translations ?? {}) as Record<string, string>;
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState("en");
  const [vals, setVals] = useState<Record<string, string>>(tr);
  const [busy, setBusy] = useState(false);
  useEffect(() => setVals(tr), [row.translations]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = tr["en"] || row.default_text;
  const preview = vals[lang] || vals["en"] || row.default_text;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-labels"] }); qc.invalidateQueries({ queryKey: ["ui-content"] }); };
  const go = async () => {
    setBusy(true);
    try { await save({ data: { key: row.key, translations: vals } }); toast.success("Saved"); refresh(); }
    catch { toast.error("Could not save"); } finally { setBusy(false); }
  };
  return (
    <Card className="!p-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-sm">
        <span className="font-mono text-[11px] text-muted-foreground">{row.key}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{current || <i className="text-muted-foreground">empty</i>}</span>
        {Object.keys(tr).length > 0 && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">edited</span>}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1">
            {LANGUAGES.map((l) => (
              <button key={l.code} onClick={() => setLang(l.code)} className={`rounded-full px-2.5 py-0.5 text-xs ${lang === l.code ? "bg-brand text-primary-foreground" : "bg-accent"}`}>
                {l.code}{vals[l.code] ? " •" : ""}
              </button>
            ))}
          </div>
          {row.rich || row.default_text.length > 80
            ? <textarea aria-label={`Text (${lang})`} dir={lang === "ar" || lang === "fa" ? "rtl" : "ltr"} rows={4} className={inputCls} placeholder={row.default_text} value={vals[lang] ?? ""} onChange={(e) => setVals({ ...vals, [lang]: e.target.value })} />
            : <input aria-label={`Text (${lang})`} dir={lang === "ar" || lang === "fa" ? "rtl" : "ltr"} className={inputCls} placeholder={row.default_text} value={vals[lang] ?? ""} onChange={(e) => setVals({ ...vals, [lang]: e.target.value })} />}
          <div className="rounded-xl border border-dashed border-border p-2 text-sm">
            <span className="mb-1 block text-[10px] uppercase text-muted-foreground">Preview</span>
            {row.rich ? <div className="md-content"><ReactMarkdown>{preview}</ReactMarkdown></div> : preview}
          </div>
          <p className="text-[11px] text-muted-foreground">Empty fields fall back to English, then the default.{row.rich && " Supports **bold**, *italic*, lists and links."}</p>
          <div className="flex gap-2">
            <button onClick={async () => { await reset({ data: { key: row.key } }); toast.success("Reset to default"); refresh(); }} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><RotateCcw className="h-3.5 w-3.5" /> Reset to default</button>
            <button disabled={busy} onClick={go} className="btn-glow ml-auto !px-4 !py-1.5 text-xs">{busy && <Spinner />} Save</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Icons() {
  const { data, isLoading, isError } = useLabels();
  const set = useServerFn(adminSetIcon);
  const qc = useQueryClient();
  if (isError) return <ErrorState />;
  if (isLoading) return <Skeleton className="h-40 rounded-3xl" />;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Menu and bottom-bar icons are edited in Menu & Navigation. PNG/SVG/WebP, max 1 MB.</p>
      {data!.icons.map((i) => (
        <Card key={i.key} className="!p-3">
          <div className="mb-1 text-xs text-muted-foreground">{i.page_group} · <span className="font-mono">{i.key}</span></div>
          <ImagePick label="Icon" folder="icons" value={i.icon_url} onChange={async (v) => {
            try { await set({ data: { key: i.key, icon_url: v } }); toast.success(v ? "Icon updated" : "Icon reset"); qc.invalidateQueries({ queryKey: ["admin-labels"] }); }
            catch { toast.error("Could not save"); }
          }} />
        </Card>
      ))}
    </div>
  );
}

export function Branding({ identityOnly = false }: { identityOnly?: boolean }) {
  const get = useServerFn(adminGetBranding);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-branding"], queryFn: () => get() });
  if (isError) return <ErrorState />;
  if (isLoading || !data) return <Skeleton className="h-60 rounded-3xl" />;
  return <BrandingForm s={data} identityOnly={identityOnly} />;
}

const toLocal = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : "");

function BrandingForm({ s, identityOnly }: { s: Awaited<ReturnType<typeof adminGetBranding>>; identityOnly: boolean }) {
  const save = useServerFn(adminSaveBranding);
  const qc = useQueryClient();
  const [f, setF] = useState({ ...s, announcement_start: toLocal(s.announcement_start), announcement_end: toLocal(s.announcement_end) });
  const [busy, setBusy] = useState(false);
  const txt = (k: "site_name" | "tagline" | "footer_copyright" | "announcement_text" | "announcement_link" | "popup_link") =>
    ({ value: f[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }) });
  const go = async () => {
    setBusy(true);
    try {
      await save({ data: {
        ...f, announcement_text: f.announcement_text ?? "",
        announcement_start: f.announcement_start ? new Date(f.announcement_start).toISOString() : null,
        announcement_end: f.announcement_end ? new Date(f.announcement_end).toISOString() : null,
        popup_mode: f.popup_mode === "every" ? "every" : "once",
      } });
      toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-branding"] }); qc.invalidateQueries({ queryKey: ["settings"] });
    } catch (e) { toast.error((e as Error).message.includes("https") ? "Links must start with https://" : "Check the fields"); }
    finally { setBusy(false); }
  };
  return (
    <div className="max-w-2xl space-y-4">
      <Card className="space-y-3">
        <h3 className="label-premium">Branding</h3>
        <div><label className={labelCls} htmlFor="b-name">Website name</label><input id="b-name" className={inputCls} {...txt("site_name")} /></div>
        <div><label className={labelCls} htmlFor="b-tag">Tagline</label><input id="b-tag" className={inputCls} {...txt("tagline")} /></div>
        <ImagePick label="Logo" folder="branding" value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
        <ImagePick label="Favicon" folder="branding" value={f.favicon_url} onChange={(v) => setF({ ...f, favicon_url: v })} />
        <ImagePick label="Share image" folder="branding" value={f.share_image_url} onChange={(v) => setF({ ...f, share_image_url: v })} />
        <div><label className={labelCls} htmlFor="b-copy">Footer copyright (empty = “© year Website name”)</label><input id="b-copy" className={inputCls} {...txt("footer_copyright")} /></div>
        <p className="text-xs text-muted-foreground">Hero title, hero article, section titles and “Order Now” are in Texts & labels → Home, with a field per language.</p>
        {identityOnly && <button disabled={busy} onClick={go} className="btn-glow w-full">{busy && <Spinner />} Save site identity</button>}
      </Card>
      {!identityOnly && <>
      <Card className="space-y-3">
        <label className="flex items-center justify-between"><span className="label-premium">Announcement banner</span><Switch checked={f.announcement_on} onCheckedChange={(v) => setF({ ...f, announcement_on: v })} /></label>
        <div><label className={labelCls} htmlFor="b-ann">Text</label><input id="b-ann" className={inputCls} {...txt("announcement_text")} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls} htmlFor="b-col">Colour</label><input id="b-col" type="color" className={`${inputCls} !h-11 !p-1`} value={f.announcement_color || "#7c3aed"} onChange={(e) => setF({ ...f, announcement_color: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="b-link">Link (optional)</label><input id="b-link" className={inputCls} placeholder="https://" {...txt("announcement_link")} /></div>
          <div><label className={labelCls} htmlFor="b-s">Show from</label><input id="b-s" type="datetime-local" className={inputCls} value={f.announcement_start} onChange={(e) => setF({ ...f, announcement_start: e.target.value })} /></div>
          <div><label className={labelCls} htmlFor="b-e">Show until</label><input id="b-e" type="datetime-local" className={inputCls} value={f.announcement_end} onChange={(e) => setF({ ...f, announcement_end: e.target.value })} /></div>
        </div>
      </Card>
      <Card className="space-y-3">
        <label className="flex items-center justify-between"><span className="label-premium">First-visit welcome popup</span><Switch checked={f.popup_on} onCheckedChange={(v) => setF({ ...f, popup_on: v })} /></label>
        <ImagePick label="Image" folder="popup" value={f.popup_image} onChange={(v) => setF({ ...f, popup_image: v })} />
        <div><label className={labelCls} htmlFor="b-plink">Button link (empty = just close)</label><input id="b-plink" className={inputCls} placeholder="https:// or leave empty" {...txt("popup_link")} /></div>
        <select aria-label="Popup frequency" className={inputCls} value={f.popup_mode} onChange={(e) => setF({ ...f, popup_mode: e.target.value })}>
          <option value="once">Show once</option>
          <option value="every">Show every visit</option>
        </select>
        <p className="text-xs text-muted-foreground">Popup title, message and button text are in Texts & labels → Home.</p>
      </Card>
      <button disabled={busy} onClick={go} className="btn-glow w-full">{busy && <Spinner />} Save</button>
    </div>
  );
}
