import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { validateProviderUrl } from './provider-utils'
import type { Database } from '@/integrations/supabase/types'

async function context() {
  const admin = await import('./admin.server')
  await admin.requireAdmin()
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  return { admin, db }
}

export const adminListProviders = createServerFn({ method: 'POST' }).handler(async () => {
  const { db } = await context()
  const [{ data: providers, error }, { data: sources }] = await Promise.all([
    db.from('service_providers').select('id,name,api_url,active,markup,link_parameter,last_synced_at,currency,usd_rate').is('deleted_at', null).order('created_at'),
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
    // Editing keeps the admin's on/off choice; new providers start on.
    const values = { name: data.name, api_url, markup: data.markup, link_parameter: data.link_parameter, ...(data.api_key ? { api_key: data.api_key } : {}) }
    let id = data.id
    if (id) {
      const { data: before } = await db.from('service_providers').select('markup').eq('id', id).single()
      const { error } = await db.from('service_providers').update(values).eq('id', id).is('deleted_at', null)
      if (error) throw new Error('প্রোভাইডার সংরক্ষণ করা যায়নি')
      if (before?.markup !== data.markup) {
        const { error: markupError } = await db.rpc('set_provider_markup', { _provider: id, _markup: data.markup })
        if (markupError) throw new Error('দাম পরিবর্তন করা যায়নি')
      }
    } else {
      if (!data.api_key) throw new Error('প্রোভাইডারের গোপন কী দিন')
      const { data: saved, error } = await db.from('service_providers').insert({ ...values, active: true, api_key: data.api_key }).select('id').single()
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
    if (data.action === 'sync') {
      const { data: prov } = await db.from('service_providers').select('catalog_sync').eq('id', data.id).single()
      if (prov && prov.catalog_sync === false) throw new Error('এই প্রোভাইডারের ক্যাটালগ সিঙ্ক বন্ধ; সার্ভিস ম্যানুয়ালি যুক্ত করা')
      return worker.syncProvider(data.id)
    }
    if (data.action === 'status') return worker.refreshProviderOrders(data.id)
    // On/off is instant; background catalog sync keeps every provider fresh regardless.
    const { error } = await db.from('service_providers').update({ active: data.action === 'on' }).eq('id', data.id).is('deleted_at', null)
    if (error) throw new Error('পরিবর্তন করা যায়নি')
    const { data: settings } = await db.from('site_settings').select('content_version').eq('id', 1).single()
    await db.from('site_settings').update({ content_version: (settings?.content_version ?? 0) + 1 }).eq('id', 1)
    await admin.logAdmin(`provider_${data.action}`, { id: data.id })
    return { ok: true }
  })

export const adminSetServiceSource = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ source: z.enum(['own_enabled', 'api_enabled']), enabled: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const patch: Database['public']['Tables']['service_source_settings']['Insert'] = { id: 1 }
    patch[data.source] = data.enabled
    const { error } = await db.from('service_source_settings').upsert(patch)
    if (error) throw new Error('পরিবর্তন করা যায়নি')
    const { data: settings } = await db.from('site_settings').select('content_version').eq('id', 1).single()
    await db.from('site_settings').update({ content_version: (settings?.content_version ?? 0) + 1 }).eq('id', 1)
    await admin.logAdmin('service_source_updated', { source: data.source, enabled: data.enabled })
    return { ok: true }
  })

export const adminProviderServices = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ id: z.string().uuid(), page: z.number().int().min(0), q: z.string().max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await context()
    let query = db.from('services').select('id,service_no,name,rate,rate_per,provider_rate,active,provider_available').eq('provider_id', data.id).is('deleted_at', null).order('service_no').range(data.page * 50, data.page * 50 + 49)
    const q = data.q.replace(/[%,()*]/g, '')
    if (q) query = query.ilike('name', `%${q}%`)
    const { data: rows, error } = await query
    if (error) throw new Error('সার্ভিস পাওয়া যায়নি')
    return rows ?? []
  })

export const adminEditProviderService = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ id: z.string().uuid(), name: z.string().trim().min(1).max(200).optional(), rate: z.number().finite().positive().max(1000000).optional(), reset: z.boolean().optional(), active: z.boolean().optional() }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const { id, ...values } = data
    const patch: Database['public']['Tables']['services']['Update'] = {}
    if (values.name !== undefined) { patch.name = values.name; patch.custom_name = true }
    if (values.reset) { patch.price_mode = 'base'; patch.price_value = 0 }
    else if (values.rate !== undefined) {
      const { data: cur } = await db.from('services').select('provider_rate').eq('id', id).single()
      if (cur?.provider_rate != null) { patch.price_mode = 'fixed'; patch.price_value = Math.round((values.rate - Number(cur.provider_rate)) * 10000) / 10000 }
      else { patch.rate = values.rate; patch.custom_rate = true }
    }
    if (values.active !== undefined) patch.active = values.active
    const { error } = await db.from('services').update(patch).eq('id', id).not('provider_id', 'is', null)
    if (error) throw new Error('সার্ভিস সংরক্ষণ করা যায়নি')
    const { data: settings } = await db.from('site_settings').select('content_version').eq('id', 1).single()
    await db.from('site_settings').update({ content_version: (settings?.content_version ?? 0) + 1 }).eq('id', 1)
    await admin.logAdmin('provider_service_edited', { id, ...values })
    return { ok: true }
  })
/** Same-kind services from every connected provider, cheapest first, for side-by-side selection. */
export const adminCompareServices = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ q: z.string().trim().min(2).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { db } = await context()
    const words = data.q.replace(/[%,()*]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 5)
    const { data: providers } = await db.from('service_providers').select('id,name').is('deleted_at', null)
    let query = db.from('services').select('id,service_no,name,rate,rate_per,min_qty,max_qty,active,provider_available,provider_id,categories!inner(name,platforms!inner(name))').not('provider_id', 'is', null).is('deleted_at', null)
    for (const w of words) query = query.ilike('name', `%${w}%`)
    const { data: rows, error } = await query.order('rate').limit(200)
    if (error) throw new Error('সার্ভিস পাওয়া যায়নি')
    const names = new Map((providers ?? []).map((p) => [p.id, p.name]))
    return (rows ?? []).map((r) => ({ id: r.id, service_no: r.service_no, name: r.name, rate: Number(r.rate), rate_per: r.rate_per, min: r.min_qty, max: r.max_qty, active: r.active, available: r.provider_available, provider: names.get(r.provider_id ?? '') ?? '—', category: r.categories.name, platform: r.categories.platforms.name }))
  })

/** Keep exactly one chosen service on and switch off the other compared alternatives. */
export const adminPickService = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ keep: z.string().uuid(), off: z.array(z.string().uuid()).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const off = data.off.filter((id) => id !== data.keep)
    const { error } = await db.from('services').update({ active: true }).eq('id', data.keep).not('provider_id', 'is', null)
    if (error) throw new Error('পরিবর্তন করা যায়নি')
    if (off.length) await db.from('services').update({ active: false }).in('id', off).not('provider_id', 'is', null)
    const { data: settings } = await db.from('site_settings').select('content_version').eq('id', 1).single()
    await db.from('site_settings').update({ content_version: (settings?.content_version ?? 0) + 1 }).eq('id', 1)
    await admin.logAdmin('provider_service_picked', { keep: data.keep }, null, { off })
    return { ok: true }
  })

/** Manual-catalog providers (catalog_sync=false): attach an existing site service by its number to a provider service ID. */
export const adminLinkProviderService = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ provider: z.string().uuid(), service_no: z.number().int().positive(), provider_service_id: z.string().trim().regex(/^[a-zA-Z0-9_-]{1,50}$/), comments: z.string().max(5000).optional() }).parse(input))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const { data: svc } = await db.from('services').select('id,category_id').eq('service_no', data.service_no).is('deleted_at', null).maybeSingle()
    if (!svc) throw new Error('এই নম্বরের সার্ভিস পাওয়া যায়নি')
    const { error } = await db.from('services').update({ provider_id: data.provider, provider_service_id: data.provider_service_id, provider_type: 'api', provider_order_supported: true, provider_available: true, comments_template: data.comments?.trim() || null }).eq('id', svc.id)
    if (error) throw new Error(error.message.includes('duplicate') ? 'এই এপিআই সার্ভিস আইডি ইতিমধ্যে অন্য সার্ভিসে যুক্ত' : 'যুক্ত করা যায়নি')
    await db.from('categories').update({ manual_control: false }).eq('id', svc.category_id)
    await admin.logAdmin('provider_service_linked', data)
    return { ok: true }
  })
