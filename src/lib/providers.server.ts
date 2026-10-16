import { normalizeProviderServices, providerOrderStatus, validateProviderUrl } from './provider-utils'

export class ProviderError extends Error {
  constructor(message: string, readonly refused: boolean) { super(message) }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function providerRequest(provider: { api_url: string; api_key: string }, params: Record<string, string>) {
  const url = validateProviderUrl(provider.api_url)
  // Read-only actions are always safe to retry. 'add' retries only on fast connection failures
  // (request almost certainly never reached the provider), never after a slow/timeout failure.
  const readOnly = params['action'] !== 'add'
  let response: Response | undefined
  let lastError: unknown
  for (let attempt = 0; attempt < 3 && !response; attempt++) {
    const started = Date.now()
    try {
      response = await fetch(url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' }, body: new URLSearchParams({ ...params, key: provider.api_key }), signal: AbortSignal.timeout(45000) })
    } catch (e) {
      lastError = e
      const fast = Date.now() - started < 3000 && (e as Error)?.name !== 'TimeoutError' && (e as Error)?.name !== 'AbortError'
      if (!(readOnly || fast)) break
      if (attempt < 2) await wait(800 * (attempt + 1))
    }
  }
  if (!response) throw new ProviderError(`প্রোভাইডারের উত্তর পাওয়া যায়নি (${String((lastError as Error)?.name ?? lastError).slice(0, 60)})`, false)
  // HTTP refusal (blocked, auth, server error) means the order was never accepted upstream.
  if (!response.ok) throw new ProviderError(`প্রোভাইডার অনুরোধ গ্রহণ করেনি (HTTP ${response.status})`, true)
  const text = await response.text()
  try { return JSON.parse(text) as unknown } catch { throw new ProviderError(`প্রোভাইডারের উত্তর সঠিক নয়: ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}`, false) }
}

/** Detects the provider's account currency and returns provider-currency units per 1 USD (with a small safety margin). */
async function providerUsdRate(provider: { api_url: string; api_key: string; currency: string; usd_rate: number | string }) {
  let currency = provider.currency || 'USD'
  try {
    const bal = await providerRequest(provider, { action: 'balance' })
    if (bal && typeof bal === 'object' && 'currency' in bal && /^[A-Za-z]{3}$/.test(String(bal.currency))) currency = String(bal.currency).toUpperCase()
  } catch { /* keep stored currency */ }
  if (currency === 'USD' || currency === 'USDT') return { currency, rate: 1 }
  try {
    const fx = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(10000) })
    const json = await fx.json() as { rates?: Record<string, number> }
    const live = Number(json.rates?.[currency])
    // 2% fewer units per USD => USD cost rounds up, never a loss.
    if (live > 0) return { currency, rate: Math.round(live * 0.98 * 10000) / 10000 }
  } catch { /* fall through */ }
  const stored = Number(provider.usd_rate)
  if (provider.currency === currency && stored > 0 && stored !== 1) return { currency, rate: stored }
  throw new Error(`${currency} থেকে ডলার রেট পাওয়া যায়নি; পুরনো দাম অপরিবর্তিত আছে`)
}

export async function syncProvider(id: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: provider, error } = await db.from('service_providers').select('*').eq('id', id).is('deleted_at', null).single()
  if (error || !provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  const { rows: rawRows, skipped } = normalizeProviderServices(await providerRequest(provider, { action: 'services' }))
  const fx = await providerUsdRate(provider)
  const rows = fx.rate === 1 ? rawRows : rawRows.map((r) => ({ ...r, rate: Math.ceil((r.rate / fx.rate) * 10000) / 10000 }))
  await db.from('service_providers').update({ currency: fx.currency, usd_rate: fx.rate }).eq('id', id)
  const { data: count, error: syncError } = await db.rpc('sync_provider_catalog', { _provider: id, _rows: rows })
  if (syncError) throw new Error('সার্ভিস সংরক্ষণ করা যায়নি')
  return { count: count ?? 0, skipped }
}

/** Claim before external spending. Ambiguous failures never automatically re-send. */
export async function dispatchProviderOrder(code: string, userId: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: order } = await db.from('orders').update({ dispatch_state: 'sending' }).eq('order_code', code).eq('user_id', userId).eq('status', 'pending').eq('dispatch_state', 'queued').select('*').maybeSingle()
  if (!order?.provider_id || !order.provider_service_id) return
  const { data: provider } = await db.from('service_providers').select('*').eq('id', order.provider_id).single()
  if (!provider) {
    await db.from('orders').update({ dispatch_state: 'review', provider_error: 'প্রোভাইডার পাওয়া যায়নি' }).eq('id', order.id)
    return
  }
  try {
    const result = await providerRequest(provider, { action: 'add', service: order.provider_service_id, [provider.link_parameter]: order.link, quantity: String(order.quantity) })
    // Explicit rejection (e.g. provider balance empty, service off): nothing was spent upstream, so refund the customer automatically.
    if (result && typeof result === 'object' && 'error' in result && !('order' in result)) {
      const reason = String((result as { error: unknown }).error).slice(0, 200)
      await db.from('orders').update({ dispatch_state: 'failed', provider_error: reason }).eq('id', order.id).eq('dispatch_state', 'sending')
      await db.rpc('admin_update_order_status', { _order_id: order.id, _status: 'rejected', _delivered: 0, _note: 'Service temporarily unavailable. Full amount refunded.' })
      return
    }
    if (!result || typeof result !== 'object' || !('order' in result) || !/^[a-zA-Z0-9_-]{1,100}$/.test(String(result.order))) throw new Error('প্রোভাইডার অর্ডার নম্বর দেয়নি; ম্যানুয়াল যাচাই প্রয়োজন')
    const { error } = await db.from('orders').update({ provider_order_id: String(result.order), dispatch_state: 'sent', provider_error: null }).eq('id', order.id).eq('dispatch_state', 'sending')
    if (error) throw new Error('অর্ডার পাঠানো হয়েছে; সংরক্ষণ যাচাই প্রয়োজন')
    await db.rpc('admin_update_order_status', { _order_id: order.id, _status: 'processing', _delivered: 0, _note: '' })
  } catch (e) {
    const reason = (e instanceof Error ? e.message : String(e)).slice(0, 200)
    console.error('provider dispatch failed', code, reason)
    // Zero-stuck policy: any failure without a provider order ID closes the order with a full refund.
    const { data: claimed } = await db.from('orders').update({ dispatch_state: 'failed', provider_error: reason }).eq('id', order.id).eq('dispatch_state', 'sending').select('id').maybeSingle()
    if (claimed) await db.rpc('admin_update_order_status', { _order_id: order.id, _status: 'rejected', _delivered: 0, _note: 'Service temporarily unavailable. Full amount refunded.' })
  }
}

export async function refreshProviderOrders(providerId: string, options: { statusOnly?: boolean } = {}) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: provider } = await db.from('service_providers').select('*').eq('id', providerId).is('deleted_at', null).single()
  if (!provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  // Sweep: orders left in queued/sending/review for over 3 minutes are refunded so nothing stays stuck.
  if (!options.statusOnly) {
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString()
  const { data: stuck } = await db.from('orders').select('id').eq('provider_id', providerId).eq('status', 'pending').in('dispatch_state', ['queued', 'sending', 'review']).is('provider_order_id', null).lt('created_at', cutoff).limit(50)
  for (const s of stuck ?? []) {
    const { data: claimed } = await db.from('orders').update({ dispatch_state: 'failed', provider_error: 'Auto-closed: provider did not confirm' }).eq('id', s.id).in('dispatch_state', ['queued', 'sending', 'review']).select('id').maybeSingle()
    if (claimed) await db.rpc('admin_update_order_status', { _order_id: s.id, _status: 'rejected', _delivered: 0, _note: 'Service temporarily unavailable. Full amount refunded.' })
  }
  }
  const { data: orders, error } = await db.from('orders').select('id,order_code,user_id,provider_order_id,status,quantity').eq('provider_id', providerId).eq('dispatch_state', 'sent').in('status', ['pending', 'processing']).is('deleted_at', null).order('updated_at', { ascending: true }).limit(100)
  if (error) throw new Error('অর্ডার তালিকা পাওয়া যায়নি')
  let updated = 0
  for (const order of orders ?? []) {
    if (!order.provider_order_id) continue
    try {
    const result = await providerRequest(provider, { action: 'status', order: order.provider_order_id })
    if (!result || typeof result !== 'object' || !('status' in result)) continue
    const target = providerOrderStatus(String(result.status), order.quantity, 'remains' in result ? result.remains : undefined)
    if (!target) continue
    if (target.status === order.status) {
      await db.from('orders').update({ updated_at: new Date().toISOString() }).eq('id', order.id).eq('status', order.status)
      continue
    }
    const { error: updateError } = await db.rpc('admin_update_order_status', { _order_id: order.id, _status: target.status, _delivered: target.delivered, _note: '' })
    if (!updateError) updated++
    } catch { console.error('provider order status unavailable', order.order_code) }
  }
  return { updated }
}