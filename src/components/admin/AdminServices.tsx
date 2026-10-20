import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowLeft, ArrowUp, Link2, Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminCatalogAction, adminCatalogList, adminCatalogSave, adminLinkManualApi } from "@/lib/admin-catalog.functions";
import { adminUploadImage } from "@/lib/admin-content.functions";
import { Card, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { PlatformIcon } from "@/lib/brand";
import { money, rateMoney } from "@/lib/format";
import { AdminProviders } from "./AdminProviders";
import { ProviderCompare } from "./ProviderCompare";
import { adminListProviders, adminSetServiceSource } from "@/lib/admin-providers.functions";
import { Button } from "@/components/ui/button";

type Level = "platforms" | "categories" | "services";
type Nav = { platform?: { id: string; name: string } | undefined; category?: { id: string; name: string } | undefined };

export function AdminServices() {
  const [mode, setMode] = useState<"own" | "api" | "compare">("own");
  const get = useServerFn(adminListProviders), setSource = useServerFn(adminSetServiceSource);
  const qc = useQueryClient();
  const { data, isError, isLoading } = useQuery({ queryKey: ["admin-providers"], queryFn: () => get() });
  const change = async (source: "own_enabled" | "api_enabled", enabled: boolean) => {
    try { await setSource({ data: { source, enabled } }); qc.invalidateQueries(); }
    catch { toast.error("পরিবর্তন সংরক্ষণ করা যায়নি"); }
  };
  if (isError) return <ErrorState />;
  if (isLoading || !data) return <Skeleton className="h-40" />;
  return <div className="space-y-4"><div className="flex flex-wrap gap-3 border-b border-border pb-3">
    <div className="flex items-center gap-2"><Button variant={mode === "own" ? "default" : "outline"} onClick={() => setMode("own")}>নিজের সার্ভিস</Button><Switch checked={data.sources.own_enabled} aria-label="নিজের সার্ভিস অন/অফ" onCheckedChange={(v) => void change("own_enabled", v)} /></div>
    <div className="flex items-center gap-2"><Button variant={mode === "api" ? "default" : "outline"} onClick={() => setMode("api")}>এপিআই সার্ভিস</Button><Switch checked={data.sources.api_enabled} aria-label="এপিআই সার্ভিস অন/অফ" onCheckedChange={(v) => void change("api_enabled", v)} /></div>
    <Button variant={mode === "compare" ? "default" : "outline"} onClick={() => setMode("compare")}>প্যানেল বাছাই</Button>
  </div>{mode === "own" ? <OwnServices /> : mode === "compare" ? <ProviderCompare /> : <AdminProviders providers={data.providers} />}</div>;
}
function OwnServices() {
  const [nav, setNav] = useState<Nav>({});
  if (nav.category && nav.platform) return <LevelView level="services" parentId={nav.category.id} title={nav.category.name} sub={nav.platform.name} onBack={() => setNav({ platform: nav.platform })} />;
  if (nav.platform) return <LevelView level="categories" parentId={nav.platform.id} title={nav.platform.name} sub="Categories" onBack={() => setNav({})} onOpen={(r) => setNav({ platform: nav.platform, category: { id: r.id, name: r.name } })} />;
  return <LevelView level="platforms" parentId={null} title="Services" sub="Platforms" onOpen={(r) => setNav({ platform: { id: r.id, name: r.name } })} />;
}

function errMsg(e: unknown) {
  const m = (e as Error)?.message ?? "Failed";
  try { const j = JSON.parse(m); return j[0]?.message ?? m; } catch { return m; }
}

function LevelView({ level, parentId, title, sub, onBack, onOpen }: {
  level: Level; parentId: string | null; title: string; sub: string; onBack?: () => void; onOpen?: (r: any) => void;
}) {
  const list = useServerFn(adminCatalogList), act = useServerFn(adminCatalogAction);
  const qc = useQueryClient();
  const [trash, setTrash] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<{ id: string | null; row?: any } | null>(null);
  const [linkRow, setLinkRow] = useState<any>(null);
  const key = ["adm-catalog", "own", level, parentId, trash];
  const { data, isLoading, isError } = useQuery({ queryKey: key, queryFn: () => list({ data: { level, parentId, trash, ownOnly: true } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adm-catalog"] });
  const run = async (id: string, action: "on" | "off" | "delete" | "restore" | "up" | "down") => {
    try {
      await act({ data: { level, id, action } }); refresh();
      if (action === "delete") toast.success("Moved to Trash");
      if (action === "restore") toast.success("Restored");
    } catch (e) { toast.error(errMsg(e)); }
  };
  const noun = level === "platforms" ? "Platform" : level === "categories" ? "Category" : "Service";
  const rows = (data?.rows ?? []).filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      {onBack && <button onClick={onBack} className="btn-ghost-glow !px-3 !py-1.5 text-sm"><ArrowLeft className="h-4 w-4" /> Back</button>}
      <div className="flex items-center gap-3">
        {level === "categories" && data?.parent && <PlatformIcon slug={data.parent.slug ?? ""} logo={data.parent.logo_url} name={data.parent.name} className="h-10 w-10" />}
        <PageTitle sub={sub}>{title}</PageTitle>
      </div>
      <div className="flex flex-wrap gap-2">
        {!trash && <button onClick={() => setForm({ id: null })} className="btn-glow !px-4 !py-2 text-sm"><Plus className="h-4 w-4" /> Add {noun}</button>}
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} !py-2 pl-9`} placeholder={`Search ${noun.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button onClick={() => setTrash(!trash)} className={`btn-ghost-glow !px-4 !py-2 text-sm ${trash ? "ring-2 ring-primary" : ""}`}><Trash2 className="h-4 w-4" /> {trash ? "Back to list" : "Trash"}</button>
      </div>
      {form && !form.id && <ItemForm level={level} parentId={parentId} onClose={() => setForm(null)} onSaved={refresh} />}
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !rows.length ? <Empty text={trash ? "Trash is empty." : `No ${noun.toLowerCase()} yet. Tap "Add ${noun}".`} /> : (
        <div className={level === "platforms" ? "grid gap-3 sm:grid-cols-2" : "space-y-2"}>
          {rows.map((r, i) => form?.id === r.id ? (
            <ItemForm key={r.id} level={level} parentId={parentId} row={r} onClose={() => setForm(null)} onSaved={refresh} />
          ) : (
            <Card key={r.id} className="!p-3">
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={trash || !onOpen} onClick={() => onOpen?.(r)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {level === "platforms" && <PlatformIcon slug={r.slug} logo={r.logo_url} name={r.name} className="h-10 w-10 shrink-0" />}
                  <div className="min-w-0">
                    <div className={`font-semibold ${level === "platforms" ? "text-lg" : ""} break-words`}>{level === "services" && r.service_no != null && <span className="mr-1 text-brand">#{r.service_no}</span>}{r.name}</div>
                    {level === "services" && (
                      <div className="text-xs text-muted-foreground">
                        {rateMoney(Number(r.rate))} per {r.rate_per} · min {r.min_qty} · max {r.max_qty} · {r.avg_time}
                      </div>
                    )}
                    {level === "services" && r.provider_id && <div className="text-xs font-semibold text-brand">Filter Task #{String(r.provider_service_id ?? "").split("#")[0]}</div>}
                    {level === "categories" && r.linked_count > 0 && <div className="text-xs font-semibold text-brand">Filter Task: {r.linked_count}টি সার্ভিস যুক্ত</div>}
                    <div className={`text-xs ${r.active ? "text-brand" : "text-muted-foreground"}`}>{r.active ? "ON" : "OFF"}</div>
                  </div>
                </button>
                {trash ? (
                  <button onClick={() => run(r.id, "restore")} className="btn-glow !px-3 !py-1.5 text-sm"><RotateCcw className="h-4 w-4" /> Restore</button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Switch checked={r.active} onCheckedChange={(v) => run(r.id, v ? "on" : "off")} aria-label="On/Off" />
                    <IconBtn label="Move up" disabled={i === 0 || !!q} onClick={() => run(r.id, "up")}><ArrowUp className="h-4 w-4" /></IconBtn>
                    <IconBtn label="Move down" disabled={i === rows.length - 1 || !!q} onClick={() => run(r.id, "down")}><ArrowDown className="h-4 w-4" /></IconBtn>
                    {level !== "platforms" && <IconBtn label="Filter Task এপিআই" onClick={() => setLinkRow(linkRow?.id === r.id ? null : r)}><Link2 className="h-4 w-4 text-brand" /></IconBtn>}
                    <IconBtn label="Edit" onClick={() => setForm({ id: r.id })}><Pencil className="h-4 w-4" /></IconBtn>
                    <IconBtn label="Delete" onClick={() => { if (confirm(`Move "${r.name}" to Trash?`)) run(r.id, "delete"); }}><Trash2 className="h-4 w-4 text-destructive" /></IconBtn>
                  </div>
                )}
              </div>
              {linkRow?.id === r.id && level !== "platforms" && <LinkApi level={level} row={r} onDone={() => { setLinkRow(null); refresh(); }} />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkApi({ level, row, onDone }: { level: "categories" | "services"; row: any; onDone: () => void }) {
  const link = useServerFn(adminLinkManualApi);
  const [apiId, setApiId] = useState(level === "services" && row.provider_service_id ? String(row.provider_service_id).split("#")[0] : "");
  const [comments, setComments] = useState(row.comments_template ?? "");
  const [busy, setBusy] = useState(false);
  const linked = level === "services" ? !!row.provider_id : row.linked_count > 0;
  const go = async (unlink: boolean) => {
    if (!unlink && !apiId.trim()) { toast.error("এপিআই সার্ভিস আইডি দিন"); return; }
    setBusy(true);
    try { const r = await link({ data: { level, id: row.id, unlink, provider_service_id: unlink ? undefined : apiId.trim(), comments: comments || undefined } }); toast.success(unlink ? `${r.count}টি সার্ভিস বিচ্ছিন্ন হয়েছে` : `${r.count}টি সার্ভিস ${r.provider}-এ যুক্ত হয়েছে`); onDone(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2 border-t border-border pt-3">
    <div className="text-sm font-semibold">Filter Task এপিআই-তে যুক্ত করুন{level === "categories" ? " (ক্যাটাগরির সব সার্ভিস)" : ""}</div>
    <input className={`${inputCls} !py-2`} placeholder="এপিআই সার্ভিস আইডি (যেমন 1)" value={apiId} onChange={(e) => setApiId(e.target.value)} />
    <textarea className={`${inputCls} !py-2`} rows={2} placeholder="কমেন্ট টেমপ্লেট (শুধু কমেন্ট সার্ভিসে, ঐচ্ছিক)" value={comments} onChange={(e) => setComments(e.target.value)} />
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => void go(false)} className="btn-glow !px-4 !py-2 text-sm">{busy && <Spinner />} যুক্ত করুন</button>
      {linked && <button type="button" disabled={busy} onClick={() => { if (confirm("এপিআই থেকে বিচ্ছিন্ন করবেন?")) void go(true); }} className="btn-ghost-glow !px-4 !py-2 text-sm">বিচ্ছিন্ন করুন</button>}
    </div>
  </div>;
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-lg p-2 hover:bg-accent disabled:opacity-30">{children}</button>;
}

const EMPTY_SVC = { name: "", rate_per: "1000", rate: "", min_qty: "", max_qty: "", avg_time: "", active: true };

function ItemForm({ level, parentId, row, onClose, onSaved }: { level: Level; parentId: string | null; row?: any; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminCatalogSave), upload = useServerFn(adminUploadImage);
  const init = level === "services"
    ? (row ? { name: row.name, rate_per: String(row.rate_per), rate: String(row.rate), min_qty: String(row.min_qty), max_qty: String(row.max_qty), avg_time: row.avg_time, active: row.active } : EMPTY_SVC)
    : { name: row?.name ?? "", logo_url: row?.logo_url ?? null };
  const [f, setF] = useState<any>(init);
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: unknown) => setF({ ...f, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let values: Record<string, unknown>;
    if (!f.name.trim()) { toast.error("Name is required"); return; }
    if (level === "services") {
      values = { name: f.name, rate_per: Number(f.rate_per), rate: Number(f.rate), min_qty: Number(f.min_qty), max_qty: Number(f.max_qty), avg_time: f.avg_time, active: f.active };
      if (!(Number(f.rate_per) > 0)) { toast.error("Quantity unit must be more than 0"); return; }
      if (!(Number(f.rate) > 0)) { toast.error("Price must be more than 0"); return; }
      if (!(Number(f.min_qty) > 0) || !(Number(f.max_qty) > Number(f.min_qty))) { toast.error("Minimum must be less than maximum"); return; }
      if (!f.avg_time.trim()) { toast.error("Average time is required"); return; }
    } else values = level === "platforms" ? { name: f.name, logo_url: f.logo_url } : { name: f.name };
    setBusy(true);
    try {
      await save({ data: { level, id: row?.id ?? null, parentId, values } });
      onSaved();
      if (row) { toast.success("Saved"); onClose(); }
      else {
        toast.success(`${f.name.trim()} added`);
        setF(level === "services" ? { ...EMPTY_SVC, rate_per: f.rate_per } : { name: "", logo_url: null });
        nameRef.current?.focus();
      }
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };

  const pickLogo = async (file?: File) => {
    if (!file) return;
    if (file.size > 1024 * 1024) { toast.error("Max 1 MB"); return; }
    const base64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(file); });
    try { const r = await upload({ data: { base64, type: file.type as any, folder: "icons" } }); set("logo_url", r.path); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const num = (k: string, label: string, step = "1") => (
    <div><label className={labelCls}>{label}</label><input type="number" inputMode="decimal" min="0" step={step} className={inputCls} value={f[k]} onChange={(e) => set(k, e.target.value)} /></div>
  );

  return (
    <Card className="!p-4">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{row ? "Edit" : "Add"} {level === "platforms" ? "platform" : level === "categories" ? "category" : "service"}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div>
          <label className={labelCls}>{level === "services" ? "Service name" : level === "categories" ? "Category name" : "Platform name"}</label>
          <input ref={nameRef} autoFocus className={inputCls} value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={200} />
        </div>
        {level === "platforms" && (
          <div className="flex items-center gap-3">
            <PlatformIcon slug={row?.slug ?? ""} logo={f.logo_url} name={f.name || "?"} className="h-12 w-12" />
            <label className="btn-ghost-glow cursor-pointer !px-3 !py-1.5 text-sm"><Upload className="h-4 w-4" /> Logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0])} />
            </label>
            {f.logo_url && <button type="button" className="text-sm text-muted-foreground underline" onClick={() => set("logo_url", null)}>Remove</button>}
          </div>
        )}
        {level === "services" && (<>
          <div className="grid grid-cols-2 gap-3">
            {num("rate_per", "Quantity unit (price is per)")}
            {num("rate", "Price in USD", "0.0001")}
            {num("min_qty", "Minimum quantity")}
            {num("max_qty", "Maximum quantity")}
          </div>
          <div><label className={labelCls}>Average time</label><input className={inputCls} placeholder="3 hours" value={f.avg_time} onChange={(e) => set("avg_time", e.target.value)} maxLength={60} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /> Active</label>
        </>)}
        <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} Save</button>
      </form>
    </Card>
  );
}
