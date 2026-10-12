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
    return { result: deposit, error: null }
  })