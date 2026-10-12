import { supabaseAdmin as db } from '@/integrations/supabase/client.server'
import { sendTemplateEmail } from './email-templates/send-email'
import { ADMIN_ALERT_RECIPIENT, adminAlertKey, type AdminAlertData } from './email-templates/admin-alert-data'

const usd = (value: number | string) => `$${Number(value).toFixed(2)}`
const time = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })

/** Caller must have just created this event for the authenticated customer. */
export async function sendAdminActivityAlert(kind: 'order' | 'deposit', code: string, userId: string) {
  try {
    const { data: customer, error: profileError } = await db.from('profiles')
      .select('full_name, username, email, public_id, phone').eq('id', userId).single()
    if (profileError || !customer) throw new Error('Alert customer lookup failed')
    const common: AdminAlertData = { name: customer.full_name, username: customer.username, email: customer.email ?? undefined, publicId: customer.public_id, phone: customer.phone ?? undefined }
    let details: AdminAlertData
    let id: string
    if (kind === 'deposit') {
      const { data: deposit, error } = await db.from('deposits').select('id, code, amount, bdt_amount, method_name, method_id, txn_id, screenshot_path, created_at, status')
        .eq('code', code).eq('user_id', userId).is('deleted_at', null).single()
      if (error || !deposit) throw new Error('Alert deposit lookup failed')
      const { data: method } = await db.from('payment_methods').select('account, network').eq('id', deposit.method_id).maybeSingle()
      let screenshotUrl: string | undefined
      if (deposit.screenshot_path) {
        const { data: signed } = await db.storage.from('payment-proofs').createSignedUrl(deposit.screenshot_path, 86400)
        screenshotUrl = signed?.signedUrl
      }
      id = deposit.id
      details = { kind, code: deposit.code, amount: usd(deposit.amount), localAmount: deposit.bdt_amount == null ? undefined : `৳${Number(deposit.bdt_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} BDT`, method: deposit.method_name, transactionId: deposit.txn_id, paymentAccount: method?.account, network: method?.network ?? undefined, screenshotUrl, createdAt: time(deposit.created_at), status: deposit.status }
    } else {
      const { data: order, error } = await db.from('orders').select('id, order_code, charge, platform_name, category_name, service_name, service_id, quantity, link, source, created_at, status')
        .eq('order_code', code).eq('user_id', userId).is('deleted_at', null).single()
      if (error || !order) throw new Error('Alert order lookup failed')
      const { data: service } = await db.from('services').select('service_no').eq('id', order.service_id).maybeSingle()
      id = order.id
      details = { kind, code: order.order_code, amount: usd(order.charge), platform: order.platform_name, category: order.category_name, service: order.service_name, serviceId: service?.service_no == null ? undefined : String(service.service_no), quantity: order.quantity, link: order.link, source: order.source === 'api' ? 'Reseller API' : 'Website', createdAt: time(order.created_at), status: order.status }
    }
    const result = await sendTemplateEmail(kind === 'order' ? 'admin-order-alert' : 'admin-deposit-alert', ADMIN_ALERT_RECIPIENT, { templateData: { ...common, ...details }, idempotencyKey: adminAlertKey(kind, id) })
    return result
  } catch (error) {
    // A committed order/deposit must never be reported as failed because mail failed.
    const reason = error != null && typeof error === 'object' && 'code' in error ? String(error.code) : 'send_failed'
    console.error('Admin email alert failed', { kind, code, reason })
    try {
      await db.from('admin_log').insert({ action: 'admin_email_failed', detail: { kind, code, reason } })
    } catch { /* A log outage must not turn a committed purchase into a failure. */ }
    return { sent: false, reason: 'send_failed' as const }
  }
}