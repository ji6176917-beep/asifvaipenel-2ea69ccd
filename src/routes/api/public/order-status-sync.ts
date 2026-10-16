import { createFileRoute } from '@tanstack/react-router'
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth'

export const Route = createFileRoute('/api/public/order-status-sync')({
  server: { handlers: { POST: async ({ request }) => {
    const authFailure = await authenticateCronRequest(request)
    if (authFailure) return authFailure
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
    const { data: providers } = await db.from('service_providers').select('id').is('deleted_at', null)
    const { refreshProviderOrders } = await import('@/lib/providers.server')
    const results: Record<string, number | string> = {}
    for (const p of providers ?? []) {
      try { results[p.id] = (await refreshProviderOrders(p.id, { statusOnly: true })).updated }
      catch (e) { results[p.id] = 'failed'; console.error('order status sync failed', p.id, e instanceof Error ? e.message : e) }
    }
    return Response.json({ results })
  } } },
})