import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { timingSafeEqual } from 'node:crypto'

export const Route = createFileRoute('/api/public/provider-catalog-sync')({
  server: { handlers: { POST: async ({ request }) => {
    const expected = process.env['LOVABLE_CRON_SECRET']
    const supplied = request.headers.get('authorization')?.replace(/^Bearer /, '')
    if (!expected || !supplied) return new Response('Unauthorized', { status: 401 })
    const a = new TextEncoder().encode(expected)
    const b = new TextEncoder().encode(supplied)
    if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) return new Response('Unauthorized', { status: 401 })
    let input: { id: string }
    try { input = z.object({ id: z.string().uuid() }).parse(await request.json()) }
    catch { return new Response('Invalid request', { status: 400 }) }
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
    const { data: provider } = await db.from('service_providers').select('id,active').eq('id', input.id).is('deleted_at', null).maybeSingle()
    if (!provider?.active) return Response.json({ skipped: true })
    try {
      const { syncProvider } = await import('@/lib/providers.server')
      const result = await syncProvider(input.id)
      return Response.json({ count: result.count })
    } catch {
      await db.from('admin_log').insert({ action: 'provider_catalog_sync_failed', detail: { provider: input.id } })
      return Response.json({ error: 'Sync failed; existing catalog preserved' }, { status: 502 })
    }
  } } },
})