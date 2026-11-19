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
export async function dispatchProviderOrder(code: string, userId: string, options: { fromStates?: string[] } = {}) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: order } = await db.from('orders').update({ dispatch_state: 'sending' }).eq('order_code', code).eq('user_id', userId).eq('status', 'pending').in('dispatch_state', options.fromStates ?? ['queued']).select('*').maybeSingle()
  if (!order?.provider_id || !order.provider_service_id) return
  const { data: provider } = await db.from('service_providers').select('*').eq('id', order.provider_id).single()
  if (!provider) {
    await db.from('orders').update({ dispatch_state: 'review', provider_error: 'প্রোভাইডার পাওয়া যায়নি' }).eq('id', order.id)
    return
  }
  try {
    const params: Record<string, string> = { action: 'add', service: order.provider_service_id.split('#')[0] ?? order.provider_service_id, [provider.link_parameter]: order.link, quantity: String(order.quantity) }
    // Services needing custom comments (e.g. emoji comments) send `quantity` lines from the service template.
    const { data: svc } = await db.from('services').select('comments_template').eq('id', order.service_id).maybeSingle()
    if (svc?.comments_template) {
      const pool = svc.comments_template.split('\n').map((c: string) => c.trim()).filter(Boolean)
      if (pool.length) params['comments'] = Array.from({ length: order.quantity }, (_, i) => pool[i % pool.length]).join('\n')
    }
    const result = await providerRequest(provider, params)
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

/** Refunds pending orders that never got a provider confirmation within `minutes`. */
export async function sweepStuckDispatches(providerId: string | null, minutes: number) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString()
  let q = db.from('orders').select('id').not('provider_id', 'is', null).eq('status', 'pending').in('dispatch_state', ['queued', 'sending', 'review']).is('provider_order_id', null).lt('created_at', cutoff).limit(50)
  if (providerId) q = q.eq('provider_id', providerId)
  const { data: stuck } = await q
  let closed = 0
  for (const s of stuck ?? []) {
    const { data: claimed } = await db.from('orders').update({ dispatch_state: 'failed', provider_error: 'Auto-closed: provider did not confirm' }).eq('id', s.id).in('dispatch_state', ['queued', 'sending', 'review']).select('id').maybeSingle()
    if (claimed) { await db.rpc('admin_update_order_status', { _order_id: s.id, _status: 'rejected', _delivered: 0, _note: 'Service temporarily unavailable. Full amount refunded.' }); closed++ }
  }
  return closed
}

export async function refreshProviderOrders(providerId: string, options: { statusOnly?: boolean } = {}) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: provider } = await db.from('service_providers').select('*').eq('id', providerId).is('deleted_at', null).single()
  if (!provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  // Sweep: orders left in queued/sending/review for over 3 minutes are refunded so nothing stays stuck.
  if (!options.statusOnly) await sweepStuckDispatches(providerId, 3)
  const { data: orders, error } = await db.from('orders').select('id,order_code,user_id,provider_order_id,status,quantity').eq('provider_id', providerId).in('dispatch_state', ['sent', 'canceling']).in('status', ['pending', 'processing']).is('deleted_at', null).order('updated_at', { ascending: true }).limit(100)
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
    if (await applyProviderTarget(db, order, target)) updated++
    } catch { console.error('provider order status unavailable', order.order_code) }
  }
  return { updated }
}

type Db = Awaited<typeof import('@/integrations/supabase/client.server')>['supabaseAdmin']
type Target = NonNullable<ReturnType<typeof providerOrderStatus>>

/** Applies a provider-confirmed state. Canceled maps to a full-refund rejection (valid from pending and processing). */
async function applyProviderTarget(db: Db, order: { id: string; status: string }, target: Target) {
  const status: string = target.status === 'canceled' ? 'rejected' : target.status
  // pending → completed/partial must pass through processing first.
  if (order.status === 'pending' && (status === 'completed' || status === 'partial')) {
    const { error } = await db.rpc('admin_update_order_status', { _order_id: order.id, _status: 'processing', _delivered: 0, _note: '' })
    if (error) return false
  }
  if (status === 'pending' || (status === 'processing' && order.status === 'processing')) return false
  const note = target.status === 'canceled' ? 'Order canceled. Full amount refunded.' : ''
  const { error } = await db.rpc('admin_update_order_status', { _order_id: order.id, _status: status as Target['status'], _delivered: target.delivered, _note: note })
  if (!error && ['rejected', 'completed', 'partial'].includes(status)) await db.from('orders').update({ dispatch_state: 'sent' }).eq('id', order.id).eq('dispatch_state', 'canceling')

  return !error
}

/**
 * Admin cancel for provider orders: asks the provider to cancel, then confirms the live status.
 * Refund happens only when the provider confirms cancel; completed stays completed; otherwise "canceling".
 */
export async function cancelProviderOrder(orderId: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: order } = await db.from('orders').select('id,status,quantity,provider_id,provider_order_id,dispatch_state').eq('id', orderId).maybeSingle()
  if (!order?.provider_id) throw new Error('এটি প্রোভাইডার অর্ডার নয়')
  if (!['pending', 'processing'].includes(order.status)) throw new Error('এই অর্ডার আর বাতিল করা যাবে না')
  if (!order.provider_order_id) throw new Error('প্রোভাইডার অর্ডার নম্বর নেই; কিছুক্ষণ পর আবার চেষ্টা করুন')
  const { data: provider } = await db.from('service_providers').select('*').eq('id', order.provider_id).single()
  if (!provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  await db.from('orders').update({ dispatch_state: 'canceling' }).eq('id', order.id).in('dispatch_state', ['sent', 'canceling'])
  try { await providerRequest(provider, { action: 'cancel', orders: order.provider_order_id }) } catch { /* status check decides */ }
  let target: Target | null = null
  try {
    const result = await providerRequest(provider, { action: 'status', order: order.provider_order_id })
    if (result && typeof result === 'object' && 'status' in result) target = providerOrderStatus(String(result.status), order.quantity, 'remains' in result ? result.remains : undefined)
  } catch { /* unconfirmed */ }
  if (target && ['canceled', 'rejected', 'completed', 'partial'].includes(target.status)) {
    await applyProviderTarget(db, order, target)
    const { data: after } = await db.from('orders').select('status, refunded').eq('id', order.id).single()
    return { result: target.status === 'canceled' || target.status === 'rejected' ? 'canceled' as const : target.status === 'completed' ? 'completed' as const : 'partial' as const, refund: Number(after?.refunded ?? 0) }
  }
  return { result: 'canceling' as const, refund: 0 }
}
const REFILL_ACTIVE = ['pending', 'in progress', 'processing']
export const normalizeRefillStatus = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/_/g, ' ') || 'pending'

/** Customer refill: sends the provider's `refill` action for a completed provider order the caller owns. */
export async function requestProviderRefill(orderId: string, userId: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: order } = await db.from('orders').select('id,status,provider_id,provider_order_id,service_id,refill_status,refill_requested_at').eq('id', orderId).eq('user_id', userId).is('deleted_at', null).maybeSingle()
  if (!order) throw new Error('Order not found')
  if (!['completed', 'partial'].includes(order.status) || !order.provider_id || !order.provider_order_id) throw new Error('Refill is not available for this order')
  const { data: svc } = await db.from('services').select('refill_info').eq('id', order.service_id).maybeSingle()
  if (!svc?.refill_info?.trim()) throw new Error('This service has no refill guarantee')
  if (order.refill_status && REFILL_ACTIVE.includes(order.refill_status)) throw new Error('A refill is already in progress')
  if (order.refill_requested_at && Date.now() - new Date(order.refill_requested_at).getTime() < 24 * 3600 * 1000) throw new Error('You can request a refill once every 24 hours')
  const { data: provider } = await db.from('service_providers').select('*').eq('id', order.provider_id).single()
  if (!provider) throw new Error('Refill is not available for this order')
  // Claim first so double taps cannot send two refills.
  const { data: claimed } = await db.from('orders').update({ refill_requested_at: new Date().toISOString(), refill_status: 'sending', refill_error: null }).eq('id', order.id).or('refill_status.is.null,refill_status.not.in.(pending,in progress,processing,sending)').select('id').maybeSingle()
  if (!claimed) throw new Error('A refill is already in progress')
  let result: unknown
  try { result = await providerRequest(provider, { action: 'refill', order: order.provider_order_id }) } catch (e) {
    await db.from('orders').update({ refill_status: 'failed', refill_error: (e as Error).message.slice(0, 200), refill_requested_at: null }).eq('id', order.id)
    throw new Error('Provider did not respond, please try again later')
  }
  const r = result as Record<string, unknown> | null
  const id = r && typeof r === 'object' ? (r['refill'] ?? r['id']) : undefined
  if (!id || typeof id === 'object') {
    const reason = String(r?.['error'] ?? 'Refill rejected by provider').slice(0, 200)
    await db.from('orders').update({ refill_status: 'rejected', refill_error: reason }).eq('id', order.id)
    throw new Error(reason)
  }
  await db.from('orders').update({ refill_id: String(id).slice(0, 100), refill_status: 'pending' }).eq('id', order.id)
  return { refillId: String(id), status: 'pending' }
}

/** Refreshes live refill status for the caller's active refills (or every active refill when userId is null). */
export async function refreshProviderRefills(userId: string | null) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  let q = db.from('orders').select('id,provider_id,refill_id').not('refill_id', 'is', null).in('refill_status', REFILL_ACTIVE).limit(50)
  if (userId) q = q.eq('user_id', userId)
  const { data: rows } = await q
  const providers = new Map<string, { api_url: string; api_key: string } | null>()
  for (const o of rows ?? []) {
    if (!o.provider_id || !o.refill_id) continue
    if (!providers.has(o.provider_id)) { const { data } = await db.from('service_providers').select('api_url,api_key').eq('id', o.provider_id).maybeSingle(); providers.set(o.provider_id, data) }
    const p = providers.get(o.provider_id)
    if (!p) continue
    try {
      const r = await providerRequest(p, { action: 'refill_status', refill: o.refill_id }) as Record<string, unknown> | null
      if (r && typeof r === 'object' && 'status' in r) await db.from('orders').update({ refill_status: normalizeRefillStatus(r['status']).slice(0, 40) }).eq('id', o.id)
    } catch { /* keep last known status */ }
  }
}
