import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, RefreshCw, KeyRound, Ban, CheckCircle2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { adminApiUserAction, adminGetApiSettings, adminListApiUsers, adminSaveApiSettings } from "@/lib/admin-api.functions";
import { PlatformOrders } from "@/components/admin/AdminOrders";
import { Card, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { fmtDate, money } from "@/lib/format";

const VIEWS = [["settings", "Settings"], ["texts", "Texts"], ["users", "API Users"], ["orders", "API Orders"]] as const;
type View = (typeof VIEWS)[number][0];

export function AdminApi() {
  const [view, setView] = useState<View>("settings");
  return (
    <div className="space-y-4">
      <PageTitle>API (Reseller)</PageTitle>
      <div className="flex flex-wrap gap-2">
        {VIEWS.map(([id, l]) => (
          <button key={id} onClick={() => setView(id)} className={view === id ? "btn-glow !py-2 text-sm" : "btn-ghost-glow !py-2 text-sm"}>{l}</button>
        ))}
      </div>
      {view === "settings" ? <Settings /> : view === "texts" ? <Texts /> : view === "users" ? <ApiUsers /> : <PlatformOrders source="api" />}
    </div>
  );
}

function useApiSettings() {
  const get = useServerFn(adminGetApiSettings);
  return useQuery({ queryKey: ["admin-api-settings"], queryFn: () => get() });
}

function Settings() {
  const { data, isLoading, isError } = useApiSettings();
  if (isError) return <ErrorState />;
  if (isLoading || !data) return <Skeleton className="h-60 rounded-3xl" />;
  return <SettingsForm s={data} />;
}

function SettingsForm({ s }: { s: NonNullable<ReturnType<typeof useApiSettings>["data"]> }) {
  const save = useServerFn(adminSaveApiSettings);
  const qc = useQueryClient();
  const [f, setF] = useState({
    api_global_enabled: s.api_global_enabled, api_url: s.api_url, api_rate_per_min: String(s.api_rate_per_min),
    api_min_balance: String(s.api_min_balance), api_allow_new_keys: s.api_allow_new_keys,
  });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await save({ data: { ...f, api_rate_per_min: Math.floor(Number(f.api_rate_per_min)), api_min_balance: Number(f.api_min_balance) } });
      toast.success("API settings saved");
      qc.invalidateQueries({ queryKey: ["admin-api-settings"] }); qc.invalidateQueries({ queryKey: ["settings"] });
    } catch { toast.error("Check the values (URL must start with https://)"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="max-w-2xl space-y-4">
      <label className="flex items-center justify-between gap-3"><span className="font-semibold">API enabled</span>
        <Switch checked={f.api_global_enabled} onCheckedChange={(v) => setF({ ...f, api_global_enabled: v })} /></label>
      <label className="flex items-center justify-between gap-3"><span className="font-semibold">Allow new API keys</span>
        <Switch checked={f.api_allow_new_keys} onCheckedChange={(v) => setF({ ...f, api_allow_new_keys: v })} /></label>
      <div>
        <label className={labelCls} htmlFor="api-url">API URL (leave empty to use this website's address)</label>
        <input id="api-url" className={inputCls} placeholder="https://yourdomain.com/api/public/v2" value={f.api_url} onChange={(e) => setF({ ...f, api_url: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="api-rate">Rate limit (requests/minute)</label>
          <input id="api-rate" type="number" className={inputCls} value={f.api_rate_per_min} onChange={(e) => setF({ ...f, api_rate_per_min: e.target.value })} />
        </div>
        <div>
          <label className={labelCls} htmlFor="api-min">Minimum balance (USD, 0 = none)</label>
          <input id="api-min" type="number" step="0.01" className={inputCls} value={f.api_min_balance} onChange={(e) => setF({ ...f, api_min_balance: e.target.value })} />
        </div>
      </div>
      <button disabled={busy} onClick={go} className="btn-glow">{busy && <Spinner />} Save</button>
    </Card>
  );
}

const TEXTS = [
  ["api_docs", "API documentation"], ["api_instructions", "Instructions / rules"], ["api_examples", "Code examples"], ["api_policy", "API policy"],
] as const;

function Texts() {
  const { data, isLoading, isError } = useApiSettings();
  if (isError) return <ErrorState />;
  if (isLoading || !data) return <Skeleton className="h-60 rounded-3xl" />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Formatting: **bold**, *italic*, # Heading, - list, [link](https://…), and ``` for code blocks. Changes show on the user's API page right away.</p>
      {TEXTS.map(([k, l]) => <TextEditor key={k} field={k} label={l} initial={data[k] ?? ""} />)}
    </div>
  );
}

function TextEditor({ field, label, initial }: { field: (typeof TEXTS)[number][0]; label: string; initial: string }) {
  const save = useServerFn(adminSaveApiSettings);
  const qc = useQueryClient();
  const [v, setV] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await save({ data: { [field]: v } });
      toast.success(`${label} saved`);
      qc.invalidateQueries({ queryKey: ["admin-api-settings"] }); qc.invalidateQueries({ queryKey: ["settings"] });
    } catch { toast.error("Could not save"); }
    finally { setBusy(false); }
  };
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="label-premium">{label}</h3>
        <button onClick={() => setPreview(!preview)} className="text-xs text-primary">{preview ? "Edit" : "Preview"}</button>
      </div>
      {preview
        ? <div className="prose prose-sm max-w-none rounded-2xl border border-border p-3 dark:prose-invert"><ReactMarkdown>{v || "_Empty_"}</ReactMarkdown></div>
        : <textarea aria-label={label} rows={8} maxLength={20000} className={`${inputCls} font-mono text-xs`} value={v} onChange={(e) => setV(e.target.value)} />}
      <button disabled={busy || v === initial} onClick={go} className="btn-glow !py-2 text-sm">{busy && <Spinner />} Save</button>
    </Card>
  );
}

function ApiUsers() {
  const list = useServerFn(adminListApiUsers);
  const act = useServerFn(adminApiUserAction);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 350); return () => clearTimeout(t); }, [q]);
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin-api-users", term], queryFn: () => list({ data: { q: term || undefined } }), refetchInterval: 20_000,
  });
  const run = async (id: string, action: "enable" | "disable" | "revoke" | "regenerate") => {
    if ((action === "revoke" || action === "regenerate") && !confirm(action === "revoke" ? "Revoke this key? The user's API access stops immediately." : "Create a new key? The old key stops working.")) return;
    try { await act({ data: { id, action } }); toast.success("Done"); qc.invalidateQueries({ queryKey: ["admin-api-users"] }); }
    catch { toast.error("Action failed"); }
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search API users" placeholder="Search name, username, email or 8-digit ID" className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button aria-label="Refresh" onClick={() => refetch()} className="btn-ghost-glow !px-3"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /></button>
      </div>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !data?.length ? <Empty text="No API users yet." /> : data.map((u) => (
        <Card key={u.id} className="!p-4 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{u.full_name || u.username}</span>
            <span className="font-mono text-xs text-muted-foreground">{u.public_id}</span>
            <span className="text-xs text-muted-foreground">{u.email}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${u.api_enabled ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
              {u.api_enabled ? "Enabled" : u.has_key ? "Disabled" : "Revoked"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
            <div><span className="text-muted-foreground">Key: </span><span className="font-mono">{u.key_preview ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Requests: </span>{u.requests_24h} today · {u.requests_total} total</div>
            <div><span className="text-muted-foreground">Last used: </span>{u.last_used ? fmtDate(u.last_used) : "never"}</div>
            <div><span className="text-muted-foreground">Orders: </span>{u.api_orders} · {money(u.api_spend)}</div>
            <div><span className="text-muted-foreground">Balance: </span>{money(u.balance)}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {u.api_enabled
              ? <button onClick={() => run(u.id, "disable")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><Ban className="h-3.5 w-3.5" /> Disable</button>
              : <button onClick={() => run(u.id, "enable")} className="btn-glow !px-3 !py-1.5 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> Enable</button>}
            <button onClick={() => run(u.id, "regenerate")} className="btn-ghost-glow !px-3 !py-1.5 text-xs"><KeyRound className="h-3.5 w-3.5" /> Regenerate</button>
            {u.has_key && <button onClick={() => run(u.id, "revoke")} className="btn-ghost-glow !px-3 !py-1.5 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" /> Revoke</button>}
          </div>
        </Card>
      ))}
    </div>
  );
}
