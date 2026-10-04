import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminDeleteMenuItem, adminListMenu, adminReorderMenu, adminSaveMenuItem } from "@/lib/admin-content.functions";
import { MENU_ICONS, MENU_LOCATIONS, MenuIcon, type MenuItem, type MenuLocation, type TargetType } from "@/lib/menu";
import { LANGUAGES } from "@/lib/i18n";
import { Card, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImagePick } from "@/components/admin/AdminContent";

const TARGETS: [TargetType, string][] = [["internal_route", "Page on this site"], ["external_url", "External link"], ["telegram", "Telegram"], ["whatsapp", "WhatsApp"], ["email", "E-mail"]];

export function AdminMenu() {
  const list = useServerFn(adminListMenu);
  const reorder = useServerFn(adminReorderMenu);
  const save = useServerFn(adminSaveMenuItem);
  const del = useServerFn(adminDeleteMenuItem);
  const qc = useQueryClient();
  const [loc, setLoc] = useState<MenuLocation>("three_dot_menu");
  const [edit, setEdit] = useState<Partial<MenuItem> | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-menu"], queryFn: () => list() });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-menu"] }); qc.invalidateQueries({ queryKey: ["menu-items"] }); };
  const items = ((data ?? []) as unknown as MenuItem[]).filter((m) => m.location === loc);

  const move = async (i: number, d: -1 | 1) => {
    const ids = items.map((m) => m.id);
    const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    try { await reorder({ data: { ids } }); refresh(); } catch { toast.error("Could not reorder"); }
  };
  const toggle = async (m: MenuItem, v: boolean) => {
    try {
      await save({ data: { id: m.id, location: m.location, label: m.label, icon_key: m.icon_key, icon_url: m.icon_url, target_type: m.target_type, target_value: m.target_value, is_active: v, requires_login: m.requires_login } });
      refresh();
    } catch { toast.error("Could not update"); }
  };

  return (
    <div className="space-y-4">
      <PageTitle sub="Rename, re-icon, reorder, show/hide or add items. Changes apply instantly.">Menu & Navigation</PageTitle>
      <div className="flex flex-wrap gap-1.5">
        {MENU_LOCATIONS.map(([id, l]) => (
          <button key={id} onClick={() => setLoc(id)} className={`rounded-full px-3 py-1.5 text-sm ${loc === id ? "bg-brand text-primary-foreground" : "bg-accent"}`}>{l}</button>
        ))}
        <button onClick={() => setEdit({ location: loc, label: {}, icon_key: "link", icon_url: null, target_type: "internal_route", target_value: "/", is_active: true, requires_login: false })} className="btn-glow ml-auto !px-4 !py-1.5 text-sm"><Plus className="h-4 w-4" /> Add item</button>
      </div>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !items.length ? <Empty text="No items here." /> : (
        <div className="space-y-2">
          {items.map((m, i) => (
            <Card key={m.id} className={`!p-3 ${m.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-2">
                <div className="flex flex-col">
                  <button aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-accent disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-accent disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                </div>
                <MenuIcon item={m} className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">{m.label["en"] ?? m.system_key} {m.is_system && <Lock className="inline h-3 w-3 text-muted-foreground" aria-label="System item" />}</div>
                  <div className="truncate text-xs text-muted-foreground">{m.target_type === "action" ? `system: ${m.target_value}` : `${m.target_type.replace("_", " ")}: ${m.target_value || "from Support settings"}`}{m.requires_login && " · signed-in only"}</div>
                </div>
                <Switch aria-label={m.is_active ? "Hide" : "Show"} checked={m.is_active} onCheckedChange={(v) => toggle(m, v)} />
                <button aria-label="Edit" onClick={() => setEdit(m)} className="btn-ghost-glow !px-2.5 !py-1.5"><Pencil className="h-4 w-4" /></button>
                {!m.is_system && (
                  <button aria-label="Delete" onClick={async () => {
                    if (!confirm("Delete this item?")) return;
                    try { await del({ data: { id: m.id } }); toast.success("Deleted"); refresh(); } catch (e) { toast.error((e as Error).message); }
                  }} className="btn-ghost-glow !px-2.5 !py-1.5 text-destructive"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <ItemDialog item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </div>
  );
}

function ItemDialog({ item, onClose, onSaved }: { item: Partial<MenuItem>; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminSaveMenuItem);
  const [f, setF] = useState(item);
  const [lang, setLang] = useState("en");
  const [busy, setBusy] = useState(false);
  const sys = !!item.is_system;
  const go = async () => {
    if (!f.label?.["en"]?.trim()) { toast.error("English label is required"); return; }
    setBusy(true);
    try {
      await save({ data: {
        id: f.id, location: f.location!, label: f.label as Record<string, string>, icon_key: f.icon_key ?? null, icon_url: f.icon_url ?? null,
        target_type: f.target_type!, target_value: f.target_value ?? "", is_active: f.is_active ?? true, requires_login: f.requires_login ?? false,
      } });
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit item" : "Add item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <span className={labelCls}>Label</span>
            <div className="mb-1 flex flex-wrap gap-1">
              {LANGUAGES.map((l) => <button key={l.code} type="button" onClick={() => setLang(l.code)} className={`rounded-full px-2.5 py-0.5 text-xs ${lang === l.code ? "bg-brand text-primary-foreground" : "bg-accent"}`}>{l.code}{f.label?.[l.code] ? " •" : ""}</button>)}
            </div>
            <input aria-label={`Label (${lang})`} className={inputCls} value={f.label?.[lang] ?? ""} onChange={(e) => setF({ ...f, label: { ...f.label, [lang]: e.target.value } })} />
          </div>
          <div>
            <span className={labelCls}>Icon</span>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.entries(MENU_ICONS).map(([k, I]) => (
                <button key={k} type="button" aria-label={k} onClick={() => setF({ ...f, icon_key: k, icon_url: null })}
                  className={`flex h-9 items-center justify-center rounded-lg border ${f.icon_key === k && !f.icon_url ? "border-primary bg-primary/10" : "border-border"}`}><I className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
          <ImagePick label="…or upload a custom icon" folder="menu" value={f.icon_url ?? null} onChange={(v) => setF({ ...f, icon_url: v })} />
          {!sys && (<>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls} htmlFor="mi-type">Opens</label>
                <select id="mi-type" className={inputCls} value={f.target_type} onChange={(e) => setF({ ...f, target_type: e.target.value as TargetType })}>
                  {f.target_type === "action" && <option value="action">System action</option>}
                  {TARGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="mi-val">{f.target_type === "internal_route" ? "Path (e.g. /qna)" : f.target_type === "external_url" ? "URL" : f.target_type === "email" ? "E-mail (empty = support)" : "Number / username (empty = support)"}</label>
                <input id="mi-val" className={inputCls} disabled={f.target_type === "action"} value={f.target_value ?? ""} onChange={(e) => setF({ ...f, target_value: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.requires_login} onCheckedChange={(v) => setF({ ...f, requires_login: v })} /> Only for signed-in users</label>
          </>)}
          {sys && <p className="text-xs text-muted-foreground">System item: you can rename, re-icon, reorder or hide it, but not delete it or change what it does.</p>}
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active ?? true} onCheckedChange={(v) => setF({ ...f, is_active: v })} /> Visible</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy} onClick={go} className="btn-glow">{busy && <Spinner />} Save</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
