import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function ctx() {
  const s = await import("./admin.server");
  await s.requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { s, db: supabaseAdmin as any };
}

// Secrets (password hashes, sessions, bot token) are excluded from backups.
const BACKUP_TABLES = [
  "profiles", "user_roles", "platforms", "categories", "services", "orders", "order_status_history",
  "deposits", "payment_methods", "wallet_ledger", "notifications", "broadcasts", "menu_items", "pages",
  "page_versions", "qna", "songs", "site_settings", "ui_labels", "ui_icons", "sign_ins", "admin_log",
] as const;

const TRASH_TABLES = {
  platforms: { label: "Platforms", name: "name" },
  categories: { label: "Categories", name: "name" },
  services: { label: "Services", name: "name" },
  payment_methods: { label: "Payment methods", name: "name" },
  qna: { label: "QnA", name: "question" },
  menu_items: { label: "Menu items", name: "label" },
  songs: { label: "Songs", name: "title" },
} as const;
type TrashTable = keyof typeof TRASH_TABLES;
const trashEnum = z.enum(Object.keys(TRASH_TABLES) as [TrashTable, ...TrashTable[]]);

async function fetchAll(db: any, table: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const adminBackup = createServerFn({ method: "POST" }).handler(async () => {
  const { s, db } = await ctx();
  const tables: Record<string, any[]> = {};
  for (const t of BACKUP_TABLES) tables[t] = await fetchAll(db, t);
  // Strip the plaintext API key column; hashes are enough to verify.
  tables["profiles"] = (tables["profiles"] as any[]).map(({ api_key, ...r }) => r);
  const at = new Date().toISOString();
  await db.from("site_settings").update({ last_backup_at: at }).eq("id", 1);
  await s.logAdmin("backup_downloaded", { tables: BACKUP_TABLES.length });
  return { at, tables };
});

export const adminHealth = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const t0 = Date.now();
  const counts: Record<string, number | null> = {};
  let ok = true;
  for (const t of BACKUP_TABLES) {
    const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
    if (error) ok = false;
    counts[t] = count ?? null;
  }
  const { data: storage } = await db.rpc("admin_storage_usage");
  const { data: set } = await db.from("site_settings").select("last_backup_at").eq("id", 1).maybeSingle();
  return { ok, latencyMs: Date.now() - t0, counts, storage: storage ?? [], lastBackupAt: set?.last_backup_at ?? null };
});

export const adminReconcile = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const { data, error } = await db.rpc("admin_reconcile_balances");
  if (error) throw new Error(error.message);
  return data as { user_id: string; username: string; balance: number; ledger_sum: number; diff: number }[];
});

export const adminActivityLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ q: z.string().max(100).default(""), action: z.string().max(60).default(""), limit: z.number().int().min(1).max(5000).default(200) }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    let q = db.from("admin_log").select("*").order("id", { ascending: false }).limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    if (data.q) {
      const v = data.q.replace(/[%,()]/g, "");
      q = q.or(`action.ilike.%${v}%,ip.ilike.%${v}%,detail::text.ilike.%${v}%,new_value::text.ilike.%${v}%,old_value::text.ilike.%${v}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const { data: acts } = await db.from("admin_log").select("action").order("id", { ascending: false }).limit(2000);
    return { rows: rows ?? [], actions: [...new Set((acts ?? []).map((a: any) => a.action))].sort() as string[] };
  });

export const adminTrashList = createServerFn({ method: "POST" }).handler(async () => {
  const { db } = await ctx();
  const out: { table: TrashTable; label: string; id: string; name: string; deleted_at: string }[] = [];
  for (const [t, m] of Object.entries(TRASH_TABLES)) {
    const { data } = await db.from(t).select(`id, ${m.name}, deleted_at`).not("deleted_at", "is", null).order("deleted_at", { ascending: false });
    for (const r of data ?? []) {
      const n = r[m.name];
      out.push({ table: t as TrashTable, label: m.label, id: r.id, deleted_at: r.deleted_at,
        name: typeof n === "string" ? n : n?.en ?? Object.values(n ?? {})[0] ?? "(untitled)" });
    }
  }
  return out;
});

export const adminTrashAction = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ table: trashEnum, id: z.string().uuid(), action: z.enum(["restore", "purge"]), confirm: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { s, db } = await ctx();
    const { data: row } = await db.from(data.table).select("*").eq("id", data.id).not("deleted_at", "is", null).maybeSingle();
    if (!row) throw new Error("Item not found in Trash");
    if (data.action === "restore") {
      const { error } = await db.from(data.table).update({ deleted_at: null }).eq("id", data.id);
      if (error) throw new Error(error.message);
      await s.logAdmin("trash_restore", { table: data.table, id: data.id }, { deleted_at: row.deleted_at }, { deleted_at: null });
    } else {
      if (data.confirm !== "DELETE") throw new Error('Type DELETE to confirm');
      const { error } = await db.from(data.table).delete().eq("id", data.id);
      if (error) throw new Error(error.code === "23503" ? "This item is still used by orders or other records, so it can't be purged. It stays in Trash." : error.message);
      await s.logAdmin("trash_purge", { table: data.table, id: data.id }, row, null);
    }
    return { ok: true };
  });
