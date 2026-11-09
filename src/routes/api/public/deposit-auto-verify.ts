import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'

// Re-checks pending Binance / USDT deposits every minute, because Binance often
// shows a payment in its history only some time after the customer submits it.
export const Route = createFileRoute('/api/public/deposit-auto-verify')({
  server: { handlers: { POST: async ({ request }) => {
    const authFailure = await authenticateCronRequest(request)
    if (authFailure) return authFailure
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
    const since = new Date(Date.now() - 48 * 3600_000).toISOString()
    const { data: rows } = await db.from('deposits').select('code')
      .eq('status', 'pending').in('method_kind', ['binance', 'usdt']).is('deleted_at', null)
      .gte('created_at', since).order('created_at', { ascending: true }).limit(25)
    const { autoVerifyDeposit } = await import('@/lib/binance-verify.server')
    const results: Record<string, string> = {}
    for (const r of rows ?? []) results[r.code] = await autoVerifyDeposit(r.code, { quick: true })
    return Response.json({ checked: rows?.length ?? 0, results })
  } } },
})
