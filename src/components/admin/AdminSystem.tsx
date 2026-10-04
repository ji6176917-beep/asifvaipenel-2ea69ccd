import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { zipSync, strToU8 } from "fflate";
import { Card, PageTitle, Spinner, inputCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { adminActivityLog, adminBackup, adminHealth, adminReconcile, adminTrashAction, adminTrashList } from "@/lib/admin-system.functions";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}
function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const fmtBytes = (b: number) => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

export function AdminBackupHealth() {
  const backup = useServerFn(adminBackup), health = useServerFn(adminHealth), recon = useServerFn(adminReconcile);
  const h = useQuery({ queryKey: ["adm-health"], queryFn: () => health() });
  const [busy, setBusy] = useState(false);
  const [mism, setMism] = useState<Awaited<ReturnType<typeof adminReconcile>> | null>(null);

  const doBackup = async () => {
    setBusy(true);
    try {
      const r = await backup();
      const files: Record<string, Uint8Array> = {};
      for (const [t, rows] of Object.entries(r.tables)) {
        files[`json/${t}.json`] = strToU8(JSON.stringify(rows, null, 1));
        files[`csv/${t}.csv`] = strToU8(csv(rows as Record<string, unknown>[]));
      }
      download(`backup-${r.at.slice(0, 19).replace(/[:T]/g, "-")}.zip`, zipSync(files) as BlobPart, "application/zip");
      toast.success("Backup downloaded"); h.refetch();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const last = h.data?.lastBackupAt ? new Date(h.data.lastBackupAt) : null;
  const stale = !last || Date.now() - last.getTime() > 7 * 864e5;

  return (
    <div className="space-y-4">
      <PageTitle>Backup & Health</PageTitle>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Backup</h3>
        <p className="text-sm text-muted-foreground">ZIP with a CSV and JSON file for every table. Passwords are never included (they aren't stored in readable form).</p>
        <p className="text-sm">Last backup: <b>{last ? last.toLocaleString() : "never"}</b></p>
        {stale && <p className="rounded-lg bg-destructive/10 p-2 text-sm text-destructive">It's been more than 7 days since the last backup — download one now.</p>}
        <Button onClick={doBackup} disabled={busy}>{busy ? "Preparing…" : "Download full backup"}</Button>
      </Card>
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between"><h3 className="font-semibold">Health</h3><Button variant="outline" size="sm" onClick={() => h.refetch()}>Refresh</Button></div>
        {h.isLoading ? <Spinner /> : h.data && <>
          <p className="text-sm">Database: <b className={h.data.ok ? "text-brand" : "text-destructive"}>{h.data.ok ? "Connected" : "Problem"}</b> · {h.data.latencyMs} ms</p>
          <div className="grid grid-cols-2 gap-1 text-sm sm:grid-cols-3">
            {Object.entries(h.data.counts).map(([t, c]) => <div key={t} className="flex justify-between rounded bg-muted/50 px-2 py-1"><span>{t}</span><b>{c ?? "?"}</b></div>)}
          </div>
          <p className="pt-2 text-sm font-medium">Storage</p>
          <div className="text-sm">{(h.data.storage as any[]).length === 0 ? "No files" : (h.data.storage as any[]).map((s) => <div key={s.bucket}>{s.bucket}: {s.files} files · {fmtBytes(Number(s.bytes))}</div>)}</div>
        </>}
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold">Reconcile balances</h3>
        <p className="text-sm text-muted-foreground">Compares each user's balance with the sum of their wallet history. Read-only — nothing is changed.</p>
        <Button variant="outline" onClick={async () => { try { setMism(await recon()); } catch (e) { toast.error((e as Error).message); } }}>Run check</Button>
        {mism && (mism.length === 0 ? <p className="text-sm text-brand">No mismatches.</p> :
          <div className="text-sm">{mism.map((m) => <div key={m.user_id}>{m.username}: balance {m.balance} vs history {m.ledger_sum} (diff {m.diff})</div>)}</div>)}
      </Card>
    </div>
  );
}

export function AdminActivityLog() {
  const fn = useServerFn(adminActivityLog);
  const [q, setQ] = useState(""), [action, setAction] = useState("");
  const r = useQuery({ queryKey: ["adm-log", q, action], queryFn: () => fn({ data: { q, action, limit: 300 } }) });
  const exportCsv = async () => {
    const d = await fn({ data: { q, action, limit: 5000 } });
    download("activity-log.csv", csv(d.rows), "text/csv");
  };
  return (
    <div className="space-y-4">
      <PageTitle>Activity Log</PageTitle>
      <div className="flex flex-wrap gap-2">
        <input className={`${inputCls} flex-1`} placeholder="Search action, target, value, IP" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={inputCls + " w-auto"} value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All actions</option>
          {r.data?.actions.map((a) => <option key={a}>{a}</option>)}
        </select>
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </div>
      {r.isLoading ? <Spinner /> : (
        <div className="space-y-2">
          {r.data?.rows.length === 0 && <p className="text-sm text-muted-foreground">No entries.</p>}
          {r.data?.rows.map((l: any) => (
            <Card key={l.id} className="p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2"><b>{l.action}</b><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()} · {l.ip ?? "—"}</span></div>
              {l.detail && Object.keys(l.detail).length > 0 && <div className="break-all text-muted-foreground">Target: {JSON.stringify(l.detail)}</div>}
              {(l.old_value != null || l.new_value != null) && <div className="break-all text-xs"><span className="text-destructive">{JSON.stringify(l.old_value)}</span> → <span className="text-brand">{JSON.stringify(l.new_value)}</span></div>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminTrash() {
  const list = useServerFn(adminTrashList), act = useServerFn(adminTrashAction);
  const qc = useQueryClient();
  const r = useQuery({ queryKey: ["adm-trash"], queryFn: () => list() });
  const [purge, setPurge] = useState<{ table: any; id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const run = async (table: any, id: string, action: "restore" | "purge") => {
    try {
      await act({ data: { table, id, action, confirm } });
      toast.success(action === "restore" ? "Restored" : "Permanently deleted");
      setPurge(null); setConfirm(""); qc.invalidateQueries();
    } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="space-y-4">
      <PageTitle>Trash</PageTitle>
      {r.isLoading ? <Spinner /> : r.data?.length === 0 ? <p className="text-sm text-muted-foreground">Trash is empty.</p> :
        r.data?.map((i) => (
          <Card key={i.table + i.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><div className="font-medium">{i.name}</div><div className="text-xs text-muted-foreground">{i.label} · deleted {new Date(i.deleted_at).toLocaleString()}</div></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => run(i.table, i.id, "restore")}>Restore</Button>
                <Button size="sm" variant="destructive" onClick={() => { setPurge(i); setConfirm(""); }}>Purge</Button>
              </div>
            </div>
            {purge?.id === i.id && (
              <div className="flex flex-wrap gap-2 rounded-lg bg-destructive/10 p-2">
                <input className={`${inputCls} flex-1`} placeholder='Type DELETE to confirm' value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                <Button size="sm" variant="destructive" disabled={confirm !== "DELETE"} onClick={() => run(i.table, i.id, "purge")}>Delete forever</Button>
                <Button size="sm" variant="ghost" onClick={() => setPurge(null)}>Cancel</Button>
              </div>
            )}
          </Card>
        ))}
    </div>
  );
}
