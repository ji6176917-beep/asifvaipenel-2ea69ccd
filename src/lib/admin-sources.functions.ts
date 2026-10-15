import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

async function context() {
  const admin = await import('./admin.server')
  await admin.requireAdmin()
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server')
  return { admin, db }
}
type Db = Awaited<ReturnType<typeof context>>['db']

async function allApiServices(db: Db) {
  const rows: { id: string; category_id: string; provider_id: string | null; active: boolean; rate: number }[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('services').select('id,category_id,provider_id,active,rate').not('provider_id', 'is', null).is('deleted_at', null).order('id').range(from, from + 999)
    if (error) throw new Error('সার্ভিস পাওয়া যায়নি')
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < 1000) break
  }
  return rows
}
async function bump(db: Db) {
  const { data } = await db.from('site_settings').select('content_version').eq('id', 1).single()
  await db.from('site_settings').update({ content_version: (data?.content_version ?? 0) + 1 }).eq('id', 1)
}
/** Saves the current on/off + category choices so any change can be undone later. */
async function snapshot(db: Db, label: string) {
  const services = await allApiServices(db)
  const { data: cats } = await db.from('categories').select('id,source_provider,manual_control').is('deleted_at', null)
  await db.from('service_snapshots').insert({ label, data: { on: services.filter((s) => s.active).map((s) => s.id), off: services.filter((s) => !s.active).map((s) => s.id), cats: cats ?? [] } })
}
async function setActive(db: Db, ids: string[], active: boolean) {
  for (let i = 0; i < ids.length; i += 300) await db.from('services').update({ active }).in('id', ids.slice(i, i + 300))
}

export const adminSourceOverview = createServerFn({ method: 'POST' }).handler(async () => {
  const { db } = await context()
  const [services, { data: cats }, { data: platforms }, { data: providers }, { data: snaps }] = await Promise.all([
    allApiServices(db),
    db.from('categories').select('id,name,platform_id,source_provider,manual_control').is('deleted_at', null).order('sort'),
    db.from('platforms').select('id,name,slug,logo_url').is('deleted_at', null).order('sort'),
    db.from('service_providers').select('id,name,active').is('deleted_at', null).order('created_at'),
    db.from('service_snapshots').select('id,label,created_at').order('id', { ascending: false }).limit(20),
  ])
  const stats = new Map<string, Record<string, { total: number; on: number; min: number }>>()
  for (const s of services) {
    const c = stats.get(s.category_id) ?? {}
    const p = c[s.provider_id!] ?? { total: 0, on: 0, min: Infinity }
    p.total++; if (s.active) p.on++; p.min = Math.min(p.min, Number(s.rate))
    c[s.provider_id!] = p; stats.set(s.category_id, c)
  }
  const categories = (cats ?? []).filter((c) => stats.has(c.id)).map((c) => ({ ...c, providers: stats.get(c.id)! }))
  return { platforms: (platforms ?? []).filter((p) => categories.some((c) => c.platform_id === p.id)), categories, providers: providers ?? [], snapshots: snaps ?? [] }
})

export const adminSetCategorySource = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ ids: z.array(z.string().uuid()).min(1).max(2000), provider: z.union([z.string().uuid(), z.enum(['off', 'all'])]).optional(), manual: z.boolean().optional() }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    await snapshot(db, 'পরিবর্তনের আগে')
    if (data.manual !== undefined) for (let i = 0; i < data.ids.length; i += 300) await db.from('categories').update({ manual_control: data.manual }).in('id', data.ids.slice(i, i + 300))
    if (data.provider) {
      const chosen = data.provider === 'off' || data.provider === 'all' ? null : data.provider
      for (let i = 0; i < data.ids.length; i += 300) await db.from('categories').update({ source_provider: chosen }).in('id', data.ids.slice(i, i + 300))
      const set = new Set(data.ids)
      const rows = (await allApiServices(db)).filter((s) => set.has(s.category_id))
      const on = rows.filter((s) => data.provider === 'all' || s.provider_id === chosen).map((s) => s.id)
      const off = rows.filter((s) => !on.includes(s.id)).map((s) => s.id)
      await setActive(db, on, true); await setActive(db, off, false)
    }
    await bump(db)
    await admin.logAdmin('category_source_set', { count: data.ids.length, provider: data.provider ?? null, manual: data.manual ?? null })
    return { ok: true }
  })

export const adminSourceBulk = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ action: z.enum(['all_off', 'reset', 'save']) }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    await snapshot(db, data.action === 'save' ? 'নিজে সংরক্ষণ' : 'পরিবর্তনের আগে')
    if (data.action !== 'save') {
      const ids = (await allApiServices(db)).map((s) => s.id)
      await setActive(db, ids, data.action === 'reset')
      if (data.action === 'reset') await db.from('categories').update({ source_provider: null, manual_control: false }).not('id', 'is', null)
      await bump(db)
    }
    await admin.logAdmin(`source_${data.action}`, {})
    return { ok: true }
  })

export const adminRestoreSnapshot = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ id: z.number().int() }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    const { data: snap } = await db.from('service_snapshots').select('data').eq('id', data.id).single()
    if (!snap) throw new Error('সংরক্ষিত অবস্থা পাওয়া যায়নি')
    const s = snap.data as { on: string[]; off: string[]; cats: { id: string; source_provider: string | null; manual_control: boolean }[] }
    await snapshot(db, 'ফিরে যাওয়ার আগে')
    await setActive(db, s.on, true); await setActive(db, s.off, false)
    for (const c of s.cats) if (c.source_provider || c.manual_control) await db.from('categories').update({ source_provider: c.source_provider, manual_control: c.manual_control }).eq('id', c.id)
    const keep = new Set(s.cats.filter((c) => c.source_provider || c.manual_control).map((c) => c.id))
    const { data: now } = await db.from('categories').select('id').or('source_provider.not.is.null,manual_control.eq.true')
    const clear = (now ?? []).map((c) => c.id).filter((id) => !keep.has(id))
    if (clear.length) await db.from('categories').update({ source_provider: null, manual_control: false }).in('id', clear)
    await bump(db)
    await admin.logAdmin('source_restored', { id: data.id })
    return { ok: true }
  })

/** Categories that mean the same thing across panels: same platform and same name (case-insensitive). */
async function matchingCategories(db: Db, categoryId: string) {
  const { data: cat } = await db.from('categories').select('id,name,platform_id').eq('id', categoryId).single()
  if (!cat) throw new Error('ক্যাটাগরি পাওয়া যায়নি')
  const { data: all } = await db.from('categories').select('id,name').eq('platform_id', cat.platform_id).is('deleted_at', null)
  const key = cat.name.trim().toLowerCase()
  return (all ?? []).filter((c) => c.name.trim().toLowerCase() === key).map((c) => c.id)
}

/** Independent ON/OFF for one provider only: whole API, one platform, or one category. Other providers are never touched. */
export const adminSetProviderScope = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ provider: z.string().uuid(), scope: z.enum(['all', 'platform', 'category']), id: z.string().uuid().nullable(), on: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    if (data.scope !== 'all' && !data.id) throw new Error('missing id')
    await snapshot(db, 'পরিবর্তনের আগে')
    let catIds: Set<string> | null = null
    if (data.scope === 'category') catIds = new Set([data.id!])
    if (data.scope === 'platform') {
      const { data: cats } = await db.from('categories').select('id').eq('platform_id', data.id!)
      catIds = new Set((cats ?? []).map((c) => c.id))
    }
    const ids = (await allApiServices(db)).filter((s) => s.provider_id === data.provider && (!catIds || catIds.has(s.category_id))).map((s) => s.id)
    await setActive(db, ids, data.on)
    await bump(db)
    await admin.logAdmin('provider_scope_set', { ...data, count: ids.length })
    return { count: ids.length }
  })

/** Turn a provider's category on (other panels' same category switch off) or off. */
export const adminSetProviderCategory = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ provider: z.string().uuid(), category_id: z.string().uuid(), on: z.boolean() }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    await snapshot(db, 'পরিবর্তনের আগে')
    const ids = await matchingCategories(db, data.category_id)
    const set = new Set(ids)
    const rows = (await allApiServices(db)).filter((s) => set.has(s.category_id))
    const mine = rows.filter((s) => s.provider_id === data.provider).map((s) => s.id)
    if (data.on) {
      await setActive(db, mine, true)
      await setActive(db, rows.filter((s) => s.provider_id !== data.provider).map((s) => s.id), false)
      await db.from('categories').update({ source_provider: data.provider }).in('id', ids)
    } else {
      await setActive(db, mine, false)
      await db.from('categories').update({ source_provider: null }).in('id', ids).eq('source_provider', data.provider)
    }
    await bump(db)
    await admin.logAdmin('provider_category_set', { ...data, categories: ids.length })
    return { ok: true }
  })

/** All panels' services for one category (and its same-name twins), for editing and switching panel. */
export const adminCategoryServices = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ category_id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { db } = await context()
    const ids = await matchingCategories(db, data.category_id)
    const [{ data: rows, error }, { data: providers }] = await Promise.all([
      db.from('services').select('id,service_no,name,rate,rate_per,provider_rate,min_qty,max_qty,active,provider_available,provider_id').in('category_id', ids).not('provider_id', 'is', null).is('deleted_at', null).order('rate').limit(1000),
      db.from('service_providers').select('id,name').is('deleted_at', null),
    ])
    if (error) throw new Error('সার্ভিস পাওয়া যায়নি')
    const names = new Map((providers ?? []).map((p) => [p.id, p.name]))
    return (rows ?? []).map((r) => ({ ...r, rate: Number(r.rate), provider_rate: r.provider_rate == null ? null : Number(r.provider_rate), provider: names.get(r.provider_id ?? '') ?? 'প্যানেল' }))
  })

/** Set customer price = provider buy price + percent, for one provider's services in a platform or category. */
export const adminSetScopeMarkup = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ provider: z.string().uuid(), scope: z.enum(['platform', 'category']), id: z.string().uuid(), percent: z.number().finite().min(0).max(10000) }).parse(i))
  .handler(async ({ data }) => {
    const { admin, db } = await context()
    let catIds = [data.id]
    if (data.scope === 'platform') {
      const { data: cats } = await db.from('categories').select('id').eq('platform_id', data.id)
      catIds = (cats ?? []).map((c) => c.id)
    }
    if (!catIds.length) return { count: 0 }
    const { data: rows, error } = await db.from('services').select('id,provider_rate').eq('provider_id', data.provider).in('category_id', catIds).is('deleted_at', null).not('provider_rate', 'is', null).limit(5000)
    if (error) throw new Error('সার্ভিস পাওয়া যায়নি')
    let count = 0
    for (const r of rows ?? []) {
      const rate = Math.round(Number(r.provider_rate) * (1 + data.percent / 100) * 10000) / 10000
      if (!(rate > 0)) continue
      await db.from('services').update({ rate, custom_rate: true }).eq('id', r.id)
      count++
    }
    await bump(db)
    await admin.logAdmin('provider_scope_markup', { ...data, count })
    return { count }
  })
