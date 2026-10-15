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
    let input: { id?: string | undefined; all?: boolean | undefined }
    try { input = z.object({ id: z.string().uuid().optional(), all: z.boolean().optional() }).refine((v) => v.id || v.all).parse(await request.json()) }
    catch { return new Response('Invalid request', { status: 400 }) }
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
    // Every connected provider syncs in the background, even when switched off for customers.
    let q = db.from('service_providers').select('id').is('deleted_at', null)
    if (input.id) q = q.eq('id', input.id)
    const { data: providers } = await q
    if (!providers?.length) return Response.json({ skipped: true })
    const { syncProvider } = await import('@/lib/providers.server')
    const results: Record<string, number | string> = {}
    let failed = false
    for (const p of providers) {
      try { results[p.id] = (await syncProvider(p.id)).count }
      catch (e) {
        failed = true
        const reason = e instanceof Error ? e.message.slice(0, 300) : 'unknown'
        results[p.id] = 'failed'
        console.error('provider catalog sync failed', p.id, reason)
        await db.from('admin_log').insert({ action: 'provider_catalog_sync_failed', detail: { provider: p.id, reason } })
      }
    }
    return Response.json({ results }, { status: failed ? 502 : 200 })
  } } },
})