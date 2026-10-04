import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X, Undo2, Plus, Pencil, Trash2, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  adminDeleteMethod, adminListDeposits, adminListMethods, adminReviewDeposit, adminSaveFundSettings,
  adminSaveMethod, adminToggleMethod, adminUploadLogo,
} from "@/lib/admin-funds.functions";
import { Card, Copyable, Empty, ErrorState, PageTitle, Spinner, StatusBadge, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MethodLogo } from "@/lib/brand";
import { fmtDate, money } from "@/lib/format";

export function AdminFunds() {
  const [view, setView] = useState<"requests" | "methods">("requests");
  return (
    <div className="space-y-4">
      <PageTitle>Add Funds</PageTitle>
      <div className="flex gap-2">
        {(["requests", "methods"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={view === v ? "btn-glow !py-2 text-sm" : "btn-ghost-glow !py-2 text-sm"}>
            {v === "requests" ? "Requests" : "Payment Methods"}
          </button>
        ))}
      </div>
      {view === "requests" ? <Requests /> : <Methods />}
    </div>
  );
}

/* ---------------- Requests ---------------- */

const TABS = [["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["cancelled", "Cancelled"]] as const;
type Tab = (typeof TABS)[number][0];
type Dep = Awaited<ReturnType<typeof adminListDeposits>>["rows"][number];
type Act = "approve" | "reject" | "reverse";

function Requests() {
  const list = useServerFn(adminListDeposits);
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [act, setAct] = useState<{ d: Dep; a: Act } | null>(null);
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-deposits", tab, term], queryFn: () => list({ data: { tab, q: term || undefined } }), refetchInterval: 5_000,
  });
  const c = data?.counts ?? {};
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["pending", "approved", "rejected", "cancelled"] as const).map((s) => (
          <Card key={s} className="!p-3 text-center">
            <div className="text-2xl font-bold">{c[s] ?? 0}</div>
            <div className="text-xs capitalize text-muted-foreground">{s}</div>
          </Card>
        ))}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Search add fund requests" placeholder="Search Add Fund ID, user, email, user ID or transaction ID" className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-full px-3 py-1 text-sm ${tab === id ? "bg-brand text-primary-foreground" : "bg-accent"}`}>
            {label}{id !== "all" && ` (${c[id] ?? 0})`}
          </button>
        ))}
      </div>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !data!.rows.length ? <Empty text="No requests found." /> : (
        <div className="space-y-2">
          {data!.rows.map((d) => (
            <Card key={d.id} className="!p-4">
              <div className="flex flex-wrap items-start gap-3">
                <MethodLogo name={d.method_name} kind={d.method_kind} logo={d.logo_url} className="h-11 w-11" />
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold">{d.code}</span>
                    <StatusBadge status={d.status} />
                    <span className="text-xs text-muted-foreground">{fmtDate(d.created_at)}</span>
                  </div>
                  <div className="text-lg font-bold">{money(d.amount)}
                    {d.bdt_amount != null && <span className="ml-2 text-sm font-medium text-muted-foreground">৳{Number(d.bdt_amount).toLocaleString()} @ {Number(d.bdt_rate)}</span>}
                  </div>
                  <div className="text-muted-foreground">{d.method_name}</div>
                  <div>{d.user?.full_name || d.user?.username} · {d.user?.email} · <span className="font-mono">{d.user?.public_id}</span></div>
                  <div className="flex items-center gap-1">Txn: <Copyable value={d.txn_id} /></div>
                  {d.admin_note && <div className="text-xs text-muted-foreground">Note: {d.admin_note}</div>}
                </div>
                {d.screenshot_url && (
                  <button onClick={() => setImg(d.screenshot_url)} aria-label="View screenshot" className="h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
                    <img src={d.screenshot_url} alt="Payment screenshot" className="h-full w-full object-cover" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.status === "pending" ? (<>
                  <button onClick={() => setAct({ d, a: "approve" })} className="btn-glow !px-4 !py-1.5 text-sm"><Check className="h-4 w-4" /> Approve</button>
                  <button onClick={() => setAct({ d, a: "reject" })} className="btn-ghost-glow !px-4 !py-1.5 text-sm"><X className="h-4 w-4" /> Reject</button>
                </>) : (
                  <button onClick={() => setAct({ d, a: "reverse" })} className="btn-ghost-glow !px-4 !py-1.5 text-sm"><Undo2 className="h-4 w-4" /> Reverse</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!img} onOpenChange={(o) => !o && setImg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Payment screenshot</DialogTitle></DialogHeader>
          {img && <img src={img} alt="Payment screenshot" className="max-h-[75vh] w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
      {act && <ReviewDialog d={act.d} a={act.a} onClose={() => setAct(null)} />}
    </div>
  );
}

function ReviewDialog({ d, a, onClose }: { d: Dep; a: Act; onClose: () => void }) {
  const review = useServerFn(adminReviewDeposit);
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const target = a === "reverse" ? (d.status === "approved" ? "rejected (balance deducted)" : d.status === "rejected" ? "approved (balance credited)" : "pending") : "";
  const go = async () => {
    setBusy(true);
    try {
      await review({ data: { id: d.id, action: a, note: note.trim() || undefined } });
      toast.success(a === "approve" ? `Approved — ${money(d.amount)} credited` : a === "reject" ? "Rejected — user notified" : "Reversed");
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{a} {d.code}</DialogTitle>
          <DialogDescription>
            {a === "approve" ? `Credit ${money(d.amount)} to ${d.user?.full_name || d.user?.username}.`
              : a === "reject" ? "The user will be notified. No balance change."
              : `Change status from ${d.status} to ${target}.`}
          </DialogDescription>
        </DialogHeader>
        {a !== "approve" && (
          <div>
            <label className={labelCls} htmlFor="dep-note">{a === "reject" ? "Reason (optional)" : "Note (optional)"}</label>
            <textarea id="dep-note" rows={3} maxLength={500} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn-ghost-glow">Cancel</button>
          <button disabled={busy} onClick={go} className="btn-glow capitalize">{busy && <Spinner />} {a}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Payment methods ---------------- */

type MethodData = Awaited<ReturnType<typeof adminListMethods>>;
type PM = MethodData["methods"][number];
type Form = {
  id?: string; kind: "binance" | "usdt" | "p2p"; name: string; account: string; network: string; account_type: string;
  min_amount: string; max_amount: string; instructions: string; sort: string; active: boolean; logo_url: string | null;
};

function Methods() {
  const list = useServerFn(adminListMethods);
  const toggle = useServerFn(adminToggleMethod);
  const del = useServerFn(adminDeleteMethod);
  const qc = useQueryClient();
  const [tab, setTab] = useState<"crypto" | "p2p">("crypto");
  const [edit, setEdit] = useState<Form | null>(null);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-methods"], queryFn: () => list() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-methods"] });
  const rows = (data?.methods ?? []).filter((m) => (tab === "p2p" ? m.kind === "p2p" : m.kind !== "p2p"));
  const open = (m?: PM) => setEdit(m ? {
    id: m.id, kind: m.kind, name: m.name, account: m.account, network: m.network ?? "", account_type: m.account_type ?? "",
    min_amount: String(m.min_amount), max_amount: String(m.max_amount), instructions: m.instructions ?? "", sort: String(m.sort),
    active: m.active, logo_url: m.logo_url,
  } : {
    kind: tab === "p2p" ? "p2p" : "binance", name: "", account: tab === "p2p" ? "01700000000" : "", network: tab === "p2p" ? "" : "TRC20",
    account_type: tab === "p2p" ? "Personal" : "", min_amount: "1", max_amount: "10000", instructions: "",
    sort: String((data?.methods.length ?? 0) + 1), active: true, logo_url: null,
  });

  return (
    <div className="space-y-4">
      {data && <GlobalSettings s={data.settings} />}
      <div className="flex flex-wrap items-center gap-2">
        {(["crypto", "p2p"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-brand text-primary-foreground" : "bg-accent"}`}>
            {t === "crypto" ? "Crypto" : "BDT / P2P"}
          </button>
        ))}
        <button onClick={() => open()} className="btn-glow ml-auto !px-4 !py-1.5 text-sm"><Plus className="h-4 w-4" /> Add</button>
      </div>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !rows.length ? <Empty text="No methods yet." /> : (
        <div className="space-y-2">
          {rows.map((m) => (
            <Card key={m.id} className="!p-4">
              <div className="flex items-center gap-3">
                <MethodLogo name={m.name} kind={m.kind} logo={m.logo_url} className="h-11 w-11" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">{m.name} <span className="text-xs text-muted-foreground">#{m.sort}</span></div>
                  <div className="truncate font-mono text-xs">{m.account}{m.network ? ` · ${m.network}` : ""}{m.account_type ? ` · ${m.account_type}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{money(m.min_amount)} – {money(m.max_amount)}</div>
                </div>
                <Switch aria-label={`Turn ${m.name} ${m.active ? "off" : "on"}`} checked={m.active} onCheckedChange={async (v) => {
                  try { await toggle({ data: { id: m.id, active: v } }); toast.success(v ? "Method on" : "Method hidden from users"); refresh(); }
                  catch { toast.error("Could not update"); }
                }} />
                <button aria-label="Edit" onClick={() => open(m)} className="btn-ghost-glow !px-2.5 !py-1.5"><Pencil className="h-4 w-4" /></button>
                <button aria-label="Delete" onClick={async () => {
                  if (!confirm(`Delete ${m.name}? It can be restored from the database later.`)) return;
                  try { await del({ data: { id: m.id } }); toast.success("Deleted"); refresh(); } catch { toast.error("Could not delete"); }
                }} className="btn-ghost-glow !px-2.5 !py-1.5"><Trash2 className="h-4 w-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {edit && <MethodDialog initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </div>
  );
}

function GlobalSettings({ s }: { s: MethodData["settings"] }) {
  const save = useServerFn(adminSaveFundSettings);
  const qc = useQueryClient();
  const [f, setF] = useState({ bdt_rate: String(s.bdt_rate), deposit_min: String(s.deposit_min), deposit_max: String(s.deposit_max), require_screenshot: s.require_screenshot });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await save({ data: { bdt_rate: Number(f.bdt_rate), deposit_min: Number(f.deposit_min), deposit_max: Number(f.deposit_max), require_screenshot: f.require_screenshot } });
      toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["admin-methods"] });
    } catch { toast.error("Check the values — max must be at least min"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="!p-4">
      <h2 className="label-premium mb-3">Global settings</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["bdt_rate", "BDT rate per USD"], ["deposit_min", "Global min (USD)"], ["deposit_max", "Global max (USD)"]] as const).map(([k, l]) => (
          <div key={k}>
            <label className={labelCls} htmlFor={`gs-${k}`}>{l}</label>
            <input id={`gs-${k}`} type="number" step="0.01" className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={f.require_screenshot} onCheckedChange={(v) => setF({ ...f, require_screenshot: v })} /> Require payment screenshot
        </label>
        <button disabled={busy} onClick={go} className="btn-glow !px-4 !py-2 text-sm">{busy && <Spinner />} Save</button>
      </div>
    </Card>
  );
}

function MethodDialog({ initial, onClose, onSaved }: { initial: Form; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminSaveMethod);
  const upload = useServerFn(adminUploadLogo);
  const [f, setF] = useState<Form>(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const p2p = f.kind === "p2p";
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const onLogo = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 1024 * 1024) { toast.error("Logo must be PNG/JPG/WEBP/SVG under 1 MB"); return; }
    setUploading(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const { path } = await upload({ data: { base64: btoa(bin), type: file.type as "image/png" } });
      setF((x) => ({ ...x, logo_url: path }));
    } catch { toast.error("Logo upload failed"); }
    finally { setUploading(false); }
  };

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = Number(f.min_amount), max = Number(f.max_amount);
    if (!f.name.trim() || !f.account.trim()) { toast.error("Name and account are required"); return; }
    if (!(max >= min)) { toast.error("Max must be at least min"); return; }
    setBusy(true);
    try {
      await save({ data: {
        id: f.id, kind: f.kind, name: f.name, account: f.account, network: p2p ? null : f.network || null,
        account_type: p2p ? f.account_type || null : null, min_amount: min, max_amount: max,
        instructions: f.instructions, sort: Math.max(0, Math.floor(Number(f.sort) || 0)), active: f.active, logo_url: f.logo_url,
      } });
      toast.success("Saved"); onSaved();
    } catch { toast.error("Could not save — check the fields"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit" : "Add"} {p2p ? "BDT / P2P" : "crypto"} method</DialogTitle></DialogHeader>
        <form onSubmit={go} className="space-y-3">
          {!p2p && (
            <div>
              <label className={labelCls} htmlFor="m-kind">Type</label>
              <select id="m-kind" className={inputCls} value={f.kind} onChange={set("kind")}>
                <option value="binance">Binance (Pay ID)</option>
                <option value="usdt">USDT / wallet address</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-3">
            <MethodLogo name={f.name || "?"} kind={f.kind} logo={f.logo_url} className="h-14 w-14" />
            <label className="btn-ghost-glow cursor-pointer !py-2 text-sm">
              {uploading ? <Spinner /> : <Upload className="h-4 w-4" />} Upload logo
              <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            {f.logo_url && <button type="button" onClick={() => setF({ ...f, logo_url: null })} className="text-xs text-muted-foreground underline">Remove</button>}
          </div>
          <Field id="m-name" label="Display name" placeholder={p2p ? "bKash Personal" : "Binance ID"} value={f.name} onChange={set("name")} />
          <Field id="m-acc" label={p2p ? "Receiving number" : f.kind === "binance" ? "Binance ID" : "Wallet address"} value={f.account} onChange={set("account")} />
          {p2p
            ? <Field id="m-type" label="Account type label" placeholder="Personal" value={f.account_type} onChange={set("account_type")} />
            : <Field id="m-net" label="Network" placeholder="TRC20" value={f.network} onChange={set("network")} />}
          <div className="grid grid-cols-3 gap-2">
            <Field id="m-min" label="Min (USD)" type="number" value={f.min_amount} onChange={set("min_amount")} />
            <Field id="m-max" label="Max (USD)" type="number" value={f.max_amount} onChange={set("max_amount")} />
            <Field id="m-sort" label="Order" type="number" value={f.sort} onChange={set("sort")} />
          </div>
          <div>
            <label className={labelCls} htmlFor="m-ins">Instructions</label>
            <textarea id="m-ins" rows={3} maxLength={2000} className={inputCls} value={f.instructions} onChange={set("instructions")} />
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /> Visible to users</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className="btn-ghost-glow">Cancel</button>
            <button disabled={busy || uploading} className="btn-glow">{busy && <Spinner />} Save</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={labelCls} htmlFor={id}>{label}</label>
      <input id={id} step={rest.type === "number" ? "0.01" : undefined} className={inputCls} {...rest} />
    </div>
  );
}
