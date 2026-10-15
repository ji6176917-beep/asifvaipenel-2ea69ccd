import { normalizeProviderServices, providerOrderStatus, validateProviderUrl } from './provider-utils'

export async function providerRequest(provider: { api_url: string; api_key: string }, params: Record<string, string>) {
  const url = validateProviderUrl(provider.api_url)
  let response: Response
  try {
    response = await fetch(url, { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...params, key: provider.api_key }), signal: AbortSignal.timeout(20000) })
  } catch { throw new Error('প্রোভাইডারের উত্তর পাওয়া যায়নি') }
  if (!response.ok) throw new Error('প্রোভাইডার অনুরোধ গ্রহণ করেনি')
  try { return await response.json() as unknown } catch { throw new Error('প্রোভাইডারের উত্তর সঠিক নয়') }
}

export async function syncProvider(id: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: provider, error } = await db.from('service_providers').select('*').eq('id', id).is('deleted_at', null).single()
  if (error || !provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  const { rows, skipped } = normalizeProviderServices(await providerRequest(provider, { action: 'services' }))
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
  } catch {
    await db.from('orders').update({ dispatch_state: 'review', provider_error: 'প্রোভাইডারে যাচাই করুন; একই অর্ডার পুনরায় পাঠাবেন না' }).eq('id', order.id).eq('dispatch_state', 'sending')
  }
}

export async function refreshProviderOrders(providerId: string) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  const { data: provider } = await db.from('service_providers').select('*').eq('id', providerId).is('deleted_at', null).single()
  if (!provider) throw new Error('প্রোভাইডার পাওয়া যায়নি')
  const { data: orders, error } = await db.from('orders').select('id,order_code,user_id,provider_order_id,status,quantity').eq('provider_id', providerId).eq('dispatch_state', 'sent').in('status', ['pending', 'processing']).limit(100)
  if (error) throw new Error('অর্ডার তালিকা পাওয়া যায়নি')
  let updated = 0
  for (const order of orders ?? []) {
    if (!order.provider_order_id) continue
    const result = await providerRequest(provider, { action: 'status', order: order.provider_order_id })
    if (!result || typeof result !== 'object' || !('status' in result)) continue
    const target = providerOrderStatus(String(result.status), order.quantity, 'remains' in result ? result.remains : undefined)
    if (order.status === 'pending') {
      const { error: acceptedError } = await db.rpc('admin_update_order_status', { _order_id: order.id, _status: 'processing', _delivered: 0, _note: '' })
      if (acceptedError) continue
    }
    if (!target) continue
    const { error: updateError } = await db.rpc('admin_update_order_status', { _order_id: order.id, _status: target.status, _delivered: target.delivered, _note: '' })
    if (!updateError) updated++
  }
  return { updated }
}