// Auto-verifies Binance Pay / USDT deposits against the owner's Binance account (read-only API key).
type Match = { found: boolean; amount: number };

async function signedGet(path: string, params: Record<string, string>) {
  const key = process.env["BINANCE_API_KEY"];
  const secret = process.env["BINANCE_API_SECRET"];
  if (!key || !secret) throw new Error("BINANCE_NOT_CONFIGURED");
  const qs = new URLSearchParams({ ...params, recvWindow: "10000", timestamp: String(Date.now()) }).toString();
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(qs))))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  // Binance's main host sometimes refuses (403) requests from the live server's
  // network, so fall back through its official alternative hosts.
  const hosts = ["api.binance.com", "api-gcp.binance.com", "api1.binance.com", "api2.binance.com", "api3.binance.com", "api4.binance.com"];
  let last = "";
  for (const h of hosts) {
    try {
      const res = await fetch(`https://${h}${path}?${qs}&signature=${sig}`, { headers: { "X-MBX-APIKEY": key } });
      if (res.ok) return res.json() as Promise<unknown>;
      last = `BINANCE_HTTP_${res.status} ${h} ${(await res.text()).slice(0, 160)}`;
      if (res.status !== 403 && res.status !== 451 && res.status < 500) break;
    } catch (e) {
      last = `BINANCE_FETCH ${h} ${e instanceof Error ? e.message : e}`;
    }
  }
  throw new Error(last);
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

async function findOnChain(txn: string): Promise<Match> {
  const rows = (await signedGet("/sapi/v1/capital/deposit/hisrec", { coin: "USDT", limit: "1000" })) as Array<Record<string, unknown>>;
  const t = norm(txn);
  const hit = rows.find((r) => norm(r["txId"]) === t || norm(r["txId"]).replace(/^0x/, "") === t.replace(/^0x/, ""));
  // status 1 = success, 6 = credited but not yet withdrawable
  if (!hit || ![1, 6].includes(Number(hit["status"]))) return { found: false, amount: 0 };
  return { found: true, amount: Number(hit["amount"]) };
}

async function findPay(txn: string): Promise<Match> {
  const r = (await signedGet("/sapi/v1/pay/transactions", { limit: "100" })) as { data?: Array<Record<string, unknown>> };
  const t = norm(txn);
  const hit = (r.data ?? []).find((x) => norm(x["orderId"]) === t || norm(x["transactionId"]) === t);
  if (!hit) return { found: false, amount: 0 };
  const amt = Number(hit["amount"]);
  if (!(amt > 0) || !["usdt", "usdc", "fdusd"].includes(norm(hit["currency"]))) return { found: false, amount: 0 };
  return { found: true, amount: amt };
}

/** Returns the outcome; never throws. Only touches deposits of kind binance/usdt that are still pending. */
export async function autoVerifyDeposit(code: string, opts: { quick?: boolean } = {}): Promise<"approved" | "rejected" | "pending"> {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data: dep } = await db.from("deposits").select("id, status, amount, txn_id, method_kind").eq("code", code).maybeSingle();
  if (!dep || dep.status !== "pending" || !["binance", "usdt"].includes(String(dep.method_kind))) return "pending";
  try {
    // A transaction ID can only ever be credited once.
    const { count } = await db.from("deposits").select("id", { count: "exact", head: true })
      .ilike("txn_id", dep.txn_id).eq("status", "approved").neq("id", dep.id);
    if ((count ?? 0) > 0) {
      await db.rpc("admin_review_deposit", { _deposit_id: dep.id, _action: "reject", _note: "Auto: transaction ID already used" });
      return "rejected";
    }
    let m: Match = { found: false, amount: 0 };
    // Binance can take a few seconds to list a fresh payment; the minute-by-minute
    // background check (/api/public/deposit-auto-verify) catches anything slower.
    const attempts = opts.quick ? 1 : 4;
    for (let i = 0; i < attempts && !m.found; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 3000));
      m = dep.method_kind === "usdt" ? await findOnChain(dep.txn_id) : await findPay(dep.txn_id);
      if (!m.found && dep.method_kind === "binance") m = await findOnChain(dep.txn_id).catch(() => m);
    }
    if (!m.found) return "pending"; // not yet visible — the background check retries every minute
    if (m.amount + 0.01 < Number(dep.amount)) {
      await db.rpc("admin_review_deposit", { _deposit_id: dep.id, _action: "reject", _note: `Auto: received ${m.amount} USDT, less than claimed ${dep.amount}` });
      return "rejected";
    }
    await db.rpc("admin_review_deposit", { _deposit_id: dep.id, _action: "approve", _note: "Auto-verified via Binance" });
    return "approved";
  } catch (e) {
    console.error("binance auto-verify failed", code, e instanceof Error ? e.message : e);
    return "pending";
  }
}
