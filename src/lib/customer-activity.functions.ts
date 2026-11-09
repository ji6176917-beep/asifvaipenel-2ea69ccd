import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export const submitCustomerOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ serviceId: z.string().uuid(), link: z.string().trim().min(1).max(500), quantity: z.number().int().positive(), idempotencyKey: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('place_order', { _service_id: data.serviceId, _link: data.link, _quantity: data.quantity, _idem: data.idempotencyKey })
    if (error) return { result: null, error: error.message }
    const order = z.object({ order_code: z.string(), charge: z.number() }).parse(result)
    const { dispatchProviderOrder } = await import('./providers.server')
    await dispatchProviderOrder(order.order_code, context.userId)
    const { sendAdminActivityAlert } = await import('./admin-alerts.server')
    await sendAdminActivityAlert('order', order.order_code, context.userId)
    return { result: order, error: null }
  })

export const submitCustomerDeposit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ methodId: z.string().uuid(), amount: z.number().finite().positive(), transactionId: z.string().trim().min(4).max(100), screenshotPath: z.string().max(500).nullable(), idempotencyKey: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc('create_deposit', { _method_id: data.methodId, _amount: data.amount, _txn: data.transactionId, _screenshot: data.screenshotPath as string, _idem: data.idempotencyKey })
    if (error) return { result: null, error: error.message }
    const deposit = z.object({ code: z.string() }).parse(result)
    const { sendAdminActivityAlert } = await import('./admin-alerts.server')
    await sendAdminActivityAlert('deposit', deposit.code, context.userId)
    const { autoVerifyDeposit } = await import('./binance-verify.server')
    const autoStatus = await autoVerifyDeposit(deposit.code)
    return { result: { ...deposit, autoStatus }, error: null }
  })
export const startAutoPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ methodId: z.string().uuid(), amount: z.number().finite().positive(), origin: z.string().url().max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    if (!/^(https:\/\/|http:\/\/localhost)/.test(data.origin)) return { url: null, error: 'INVALID_ORIGIN' }
    const [{ data: m }, { data: s }, { data: p }] = await Promise.all([
      context.supabase.from('payment_methods').select('id, kind, min_amount, max_amount, active, deleted_at').eq('id', data.methodId).maybeSingle(),
      context.supabase.from('site_settings').select('bdt_rate, deposit_min, deposit_max').eq('id', 1).maybeSingle(),
      context.supabase.from('profiles').select('full_name, username, email, banned').eq('id', context.userId).maybeSingle(),
    ])
    if (!m || m.kind !== 'p2p' || !m.active || m.deleted_at) return { url: null, error: 'METHOD_UNAVAILABLE' }
    if (!s || !p || p.banned) return { url: null, error: 'ACCOUNT_SUSPENDED' }
    const usd = Math.round(data.amount * 100) / 100
    if (usd < Math.max(Number(m.min_amount), Number(s.deposit_min)) || usd > Math.min(Number(m.max_amount), Number(s.deposit_max))) return { url: null, error: 'AMOUNT_OUT_OF_RANGE' }
    const email = p.email || (context.claims as { email?: string }).email || `${p.username}@apexsmmworld.com`
    try {
      const { createCheckout } = await import('./paymently.server')
      const url = await createCheckout({ userId: context.userId, fullName: p.full_name || p.username, email, methodId: m.id, usd, bdt: Math.round(usd * Number(s.bdt_rate) * 100) / 100, origin: data.origin.replace(/\/+$/, '') })
      return { url, error: null }
    } catch (e) {
      console.error('paymently checkout failed', e instanceof Error ? e.message : e)
      return { url: null, error: 'GATEWAY_UNAVAILABLE' }
    }
  })

export const confirmAutoPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ invoiceId: z.string().trim().min(4).max(100) }).parse(data))
  .handler(async ({ data, context }) => {
    try {
      const { settleInvoice } = await import('./paymently.server')
      return await settleInvoice(data.invoiceId, context.userId)
    } catch (e) {
      console.error('paymently confirm failed', e instanceof Error ? e.message : e)
      return { status: 'pending' as const, message: 'CHECK_LATER' }
    }
  })
