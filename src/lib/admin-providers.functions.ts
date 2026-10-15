import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { validateProviderUrl } from './provider-utils'

async function context() {
  const admin = await import('./admin.server')
  await admin.requireAdmin()
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  return { admin, db }
}

export const adminListProviders = createServerFn({ method: 'POST' }).handler(async () => {
  const { db } = await context()
  const [{ data: providers, error }, { data: sources }] = await Promise.all([
    db.from('service_providers').select('id,name,api_url,active,markup,link_parameter,last_synced_at').is('deleted_at', null).order('created_at'),
    db.from('service_source_settings').select('own_enabled,api_enabled').eq('id', 1).maybeSingle(),
  ])
  if (error) throw new Error('প্রোভাইডার তালিকা পাওয়া যায়নি')
  return { providers: providers ?? [], sources: sources ?? { own_enabled: true, api_enabled: true } }
})

export const adminSaveProvider = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1).max(100), api_url: z.string().max(300), api_key: z.string().trim().max(500).optional(), markup: z.number().finite().min(0).max(10000), link_parameter: z.enum(['link', 'url']) }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const api_url = validateProviderUrl(data.api_url)
    const values = { name: data.name, api_url, markup: data.markup, link_parameter: data.link_parameter, ...(data.api_key ? { api_key: data.api_key } : {}) }
    let id = data.id
    if (id) {
      const { error } = await db.from('service_providers').update(values).eq('id', id).is('deleted_at', null)
      if (error) throw new Error('প্রোভাইডার সংরক্ষণ করা যায়নি')
      const { error: markupError } = await db.rpc('set_provider_markup', { _provider: id, _markup: data.markup })
      if (markupError) throw new Error('দাম পরিবর্তন করা যায়নি')
    } else {
      if (!data.api_key) throw new Error('প্রোভাইডারের গোপন কী দিন')
      const { data: saved, error } = await db.from('service_providers').insert({ ...values, api_key: data.api_key }).select('id').single()
      if (error || !saved) throw new Error('প্রোভাইডার সংরক্ষণ করা যায়নি')
      id = saved.id
    }
    await admin.logAdmin('provider_saved', { id, credential_changed: Boolean(data.api_key) })
    const { syncProvider } = await import('./providers.server')
    try { return { id, ...await syncProvider(id), syncError: null } }
    catch { return { id, count: 0, skipped: 0, syncError: 'সংরক্ষিত হয়েছে, কিন্তু সার্ভিস আনা যায়নি; ঠিকানা/কী ও প্রোভাইডারের অনুমতি যাচাই করুন' } }
  })

export const adminProviderAction = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ id: z.string().uuid(), action: z.enum(['on', 'off', 'sync', 'status']) }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const worker = await import('./providers.server')
    if (data.action === 'sync') return worker.syncProvider(data.id)
    if (data.action === 'status') return worker.refreshProviderOrders(data.id)
    if (data.action === 'on') await worker.syncProvider(data.id)
    const { error } = await db.from('service_providers').update({ active: data.action === 'on' }).eq('id', data.id).is('deleted_at', null)
    if (error) throw new Error('পরিবর্তন করা যায়নি')
    await db.rpc('set_provider_markup', { _provider: data.id, _markup: (await db.from('service_providers').select('markup').eq('id', data.id).single()).data?.markup ?? 0 })
    await admin.logAdmin(`provider_${data.action}`, { id: data.id })
    return { ok: true }
  })

export const adminSetServiceSource = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ source: z.enum(['own_enabled', 'api_enabled']), enabled: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const { error } = await db.from('service_source_settings').upsert({ id: 1, [data.source]: data.enabled })
    if (error) throw new Error('পরিবর্তন করা যায়নি')
    const { data: settings } = await db.from('site_settings').select('content_version').eq('id', 1).single()
    await db.from('site_settings').update({ content_version: (settings?.content_version ?? 0) + 1 }).eq('id', 1)
    await admin.logAdmin('service_source_updated', { source: data.source, enabled: data.enabled })
    return { ok: true }
  })