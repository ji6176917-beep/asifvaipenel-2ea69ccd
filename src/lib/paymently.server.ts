// Paymently (UddoktaPay-compatible) auto gateway for bKash / Nagad / Rocket.
// Balance is credited only after the gateway itself confirms the invoice as COMPLETED.

function cfg() {
  const base = process.env["PAYMENTLY_BASE_URL"]?.replace(/\/+$/, "");
  const key = process.env["PAYMENTLY_API_KEY"];
  if (!base || !key) throw new Error("PAYMENTLY_NOT_CONFIGURED");
  return { base, key };
}

async function call(path: string, body: unknown) {
  const { base, key } = cfg();
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "RT-UDDOKTAPAY-API-KEY": key },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(text) as Record<string, unknown>; } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(`PAYMENTLY_HTTP_${res.status}: ${String(json["message"] ?? text).slice(0, 200)}`);
  return json;
}

export function webhookKeyValid(header: string | null) {
  try { return !!header && header === cfg().key; } catch { return false; }
}

export async function createCheckout(p: { userId: string; fullName: string; email: string; methodId: string; usd: number; bdt: number; origin: string }) {
  const r = await call("checkout-v2", {
    full_name: p.fullName || "Customer",
    email: p.email,
    amount: p.bdt.toFixed(2),
    metadata: { user_id: p.userId, method_id: p.methodId, usd: p.usd.toFixed(2) },
    redirect_url: `${p.origin}/add-funds?paymently=return`,
    return_type: "GET",
    cancel_url: `${p.origin}/add-funds?paymently=cancel`,
    webhook_url: `${p.origin}/api/public/paymently-webhook`,
  });
  const url = r["payment_url"];
  if (typeof url !== "string" || !/^https:\/\//.test(url)) throw new Error(String(r["message"] ?? "CHECKOUT_FAILED"));
  return url;
}

/** Verifies an invoice with the gateway and credits it exactly once. */
export async function settleInvoice(invoiceId: string, expectedUser?: string): Promise<{ status: "approved" | "pending" | "failed"; code?: string; message?: string }> {
  const v = await call("verify-payment", { invoice_id: invoiceId });
  const status = String(v["status"] ?? "").toUpperCase();
  if (status !== "COMPLETED") return { status: status === "PENDING" ? "pending" : "failed", message: status };
  const meta = (v["metadata"] ?? {}) as Record<string, unknown>;
  const userId = String(meta["user_id"] ?? "");
  const methodId = String(meta["method_id"] ?? "");
  const usd = Math.round(Number(meta["usd"]) * 100) / 100;
  if (!userId || !methodId || !(usd > 0)) return { status: "failed", message: "BAD_METADATA" };
  if (expectedUser && expectedUser !== userId) return { status: "failed", message: "WRONG_USER" };

  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [{ data: m }, { data: s }] = await Promise.all([
    db.from("payment_methods").select("id, name, kind").eq("id", methodId).maybeSingle(),
    db.from("site_settings").select("bdt_rate").eq("id", 1).maybeSingle(),
  ]);
  if (!m || m.kind !== "p2p") return { status: "failed", message: "BAD_METHOD" };
  const rate = Number(s?.bdt_rate ?? 0);
  const paid = Number(v["amount"] ?? v["charged_amount"] ?? 0);
  if (rate > 0 && paid + 1 < usd * rate) return { status: "failed", message: "UNDERPAID" };

  const txn = `PM-${invoiceId}`.slice(0, 100);
  let { data: dep } = await db.from("deposits").select("id, code, status").eq("method_id", methodId).ilike("txn_id", txn).maybeSingle();
  if (!dep) {
    const code = `ADD-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data: ins, error } = await db.from("deposits").insert({
      code, user_id: userId, method_id: methodId, method_name: m.name, method_kind: "p2p", amount: usd,
      bdt_rate: rate || null, bdt_amount: paid || null, txn_id: txn, idempotency_key: txn,
    }).select("id, code, status").single();
    if (error) {
      // Concurrent webhook + redirect: re-read the row the other path created.
      ({ data: dep } = await db.from("deposits").select("id, code, status").eq("method_id", methodId).ilike("txn_id", txn).maybeSingle());
      if (!dep) throw error;
    } else dep = ins;
  }
  if (dep.status === "pending") {
    const { error } = await db.rpc("admin_review_deposit", { _deposit_id: dep.id, _action: "approve", _note: "Auto-verified via Paymently" });
    if (error && !/INVALID_TRANSITION/.test(error.message)) throw error;
  }
  return { status: "approved", code: dep.code };
}
