import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { Pencil, Plus, RefreshCw, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminProviderAction, adminSaveProvider, adminListProviders, adminProviderServices, adminEditProviderService } from '@/lib/admin-providers.functions'
import { useQuery } from '@tanstack/react-query'
import { Card, Empty, inputCls, labelCls, ErrorState } from '@/components/ui-kit'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { fmtDate, money } from '@/lib/format'

type Provider = Awaited<ReturnType<typeof adminListProviders>>['providers'][number]
export function AdminProviders({ providers }: { providers: Provider[] }) {
  const action = useServerFn(adminProviderAction)
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Provider | 'new' | null>(null)
  const [services, setServices] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-providers'] }); qc.invalidateQueries({ queryKey: ['provider-services'] }); qc.invalidateQueries({ queryKey: ['adm-catalog'] }); qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['catalog'] }) }
  const run = async (id: string, mode: 'on' | 'off' | 'sync' | 'status') => {
    setBusy(id)
    try {
      const result = await action({ data: { id, action: mode } })
      toast.success('count' in result ? `${result.count}টি সার্ভিস এসেছে; ${result.skipped}টি বিশেষ ধরনের সার্ভিস বাদ` : 'updated' in result ? `${result.updated}টি অর্ডার আপডেট হয়েছে` : 'পরিবর্তন সংরক্ষিত')
      refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'অনুরোধ ব্যর্থ হয়েছে') }
    finally { setBusy(null) }
  }
  return <div className="space-y-4">
    <Button onClick={() => setEditing('new')}><Plus />এপিআই যোগ করুন</Button>
    {editing && <ProviderForm key={editing === 'new' ? 'new' : editing.id} provider={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    {!providers.length && !editing && <Empty text="কোনো প্রোভাইডার যোগ করা হয়নি" />}
    {providers.map((p) => <Card key={p.id} className="!p-4 space-y-3">
      <div className="flex items-center gap-3"><h3 className="min-w-0 flex-1 break-words font-semibold">{p.name}</h3><Switch aria-label={`${p.name} অন/অফ`} disabled={busy === p.id} checked={p.active} onCheckedChange={(v) => void run(p.id, v ? 'on' : 'off')} /><Button variant="ghost" size="icon" aria-label="সম্পাদনা" title="সম্পাদনা" onClick={() => setEditing(p)}><Pencil /></Button></div>
      <div className="break-all text-xs text-muted-foreground">{p.api_url}</div>
      <div className="flex flex-wrap gap-3 text-sm"><span>দাম বৃদ্ধি: {p.markup}%</span><span className="text-muted-foreground">সর্বশেষ: {p.last_synced_at ? fmtDate(p.last_synced_at) : 'এখনও সার্ভিস আনা হয়নি'}</span></div>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy === p.id} onClick={() => void run(p.id, 'sync')}><RefreshCw className={busy === p.id ? 'animate-spin' : ''} />সার্ভিস আনুন</Button><Button variant="outline" disabled={busy === p.id} onClick={() => void run(p.id, 'status')}><RefreshCw />অর্ডার আপডেট</Button><Button variant="outline" onClick={() => setServices(services === p.id ? null : p.id)}>সার্ভিস ও দাম</Button></div>
      {services === p.id && <ProviderServices id={p.id} />}
    </Card>)}
  </div>
}
function ProviderForm({ provider, onClose, onSaved }: { provider?: Provider; onClose: () => void; onSaved: () => void }) {
  const save = useServerFn(adminSaveProvider)
  const [name, setName] = useState(provider?.name ?? 'Royal SMM World')
  const [url, setUrl] = useState(provider?.api_url ?? 'https://royalsmmworld.com/api/v2')
  const [key, setKey] = useState('')
  const [markup, setMarkup] = useState(String(provider?.markup ?? 0))
  const [parameter, setParameter] = useState<'link' | 'url'>(provider?.link_parameter === 'link' ? 'link' : 'url')
  const [busy, setBusy] = useState(false)
  return <form className="space-y-3 border-y border-border py-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true)
    try {
      const result = await save({ data: { id: provider?.id, name, api_url: url, api_key: key || undefined, markup: Number(markup), link_parameter: parameter } })
      setKey(''); onSaved()
      if (result.syncError) toast.warning(result.syncError)
      else toast.success(`${result.count}টি সার্ভিস এসেছে; ${result.skipped}টি বিশেষ ধরনের সার্ভিস বাদ`)
      onClose()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'সংরক্ষণ করা যায়নি') }
    finally { setBusy(false) }
  }}>
    <div className="flex items-center justify-between"><h3 className="font-semibold">{provider ? 'এপিআই সম্পাদনা' : 'নতুন এপিআই'}</h3><Button type="button" variant="ghost" size="icon" aria-label="বন্ধ করুন" onClick={onClose}><X /></Button></div>
    <label className={labelCls}>প্রোভাইডারের নাম<input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label className={labelCls}>এপিআই ঠিকানা<input className={inputCls} type="url" required value={url} onChange={(e) => setUrl(e.target.value)} /></label>
    <label className={labelCls}>গোপন এপিআই কী{provider && ' (অপরিবর্তিত রাখতে ফাঁকা রাখুন)'}<input className={inputCls} type="password" autoComplete="new-password" required={!provider} value={key} onChange={(e) => setKey(e.target.value)} /></label>
    <div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>সব সার্ভিসের দাম বৃদ্ধি (%)<input className={inputCls} type="number" min="0" max="10000" step="0.01" required value={markup} onChange={(e) => setMarkup(e.target.value)} /></label><label className={labelCls}>প্রোভাইডারের লিংক ঘর<select className={inputCls} value={parameter} onChange={(e) => setParameter(e.target.value === 'url' ? 'url' : 'link')}><option value="url">url (Royal SMM World)</option><option value="link">link (অন্যান্য প্যানেল)</option></select></label></div>
    <Button disabled={busy} type="submit"><Save />{busy ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ ও সার্ভিস আনুন'}</Button>
  </form>
}
function ProviderServices({ id }: { id: string }) {
  const list = useServerFn(adminProviderServices)
  const save = useServerFn(adminEditProviderService)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [edit, setEdit] = useState<{ id: string; name: string; rate: string } | null>(null)
  const { data, isError } = useQuery({ queryKey: ['provider-services', id, page, query], queryFn: () => list({ data: { id, page, q: query } }) })
  const update = async (values: { id: string; name?: string; rate?: number; active?: boolean }) => {
    try { await save({ data: values }); qc.invalidateQueries(); setEdit(null); toast.success('সংরক্ষিত হয়েছে') } catch { toast.error('সংরক্ষণ করা যায়নি') }
  }
  return <div className="space-y-2 border-t border-border pt-3"><input aria-label="সার্ভিস খুঁজুন" placeholder="সার্ভিস খুঁজুন" className={inputCls} value={query} onChange={(e) => { setQuery(e.target.value); setPage(0) }} />
    {isError && <ErrorState />}
    {data?.map((s) => <div key={s.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2">
      {edit?.id === s.id ? <form className="flex w-full flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void update({ id: s.id, name: edit.name, rate: Number(edit.rate) }) }}><input aria-label="সার্ভিসের নাম" className={`${inputCls} min-w-0 flex-1`} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /><input aria-label="দাম" className={`${inputCls} !w-28`} type="number" min="0.0001" step="0.0001" value={edit.rate} onChange={(e) => setEdit({ ...edit, rate: e.target.value })} /><Button type="submit" size="icon" title="সংরক্ষণ" aria-label="সংরক্ষণ"><Save /></Button><Button type="button" variant="ghost" size="icon" aria-label="বন্ধ" onClick={() => setEdit(null)}><X /></Button></form>
      : <><div className="min-w-0 flex-1"><div className="break-words font-semibold">#{s.service_no} {s.name}</div><div className="text-xs text-muted-foreground">{money(s.rate)} প্রতি {s.rate_per} · প্রোভাইডারের দাম {money(s.provider_rate ?? 0)}{!s.provider_available && ' · প্রোভাইডারে বন্ধ'}</div></div><Switch checked={s.active} aria-label={`${s.name} অন/অফ`} onCheckedChange={(active) => void update({ id: s.id, active })} /><Button variant="ghost" size="icon" aria-label="নাম ও দাম সম্পাদনা" title="নাম ও দাম সম্পাদনা" onClick={() => setEdit({ id: s.id, name: s.name, rate: String(s.rate) })}><Pencil /></Button></>}
    </div>)}
    <div className="flex justify-between"><Button variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>আগের</Button><Button variant="ghost" disabled={(data?.length ?? 0) < 50} onClick={() => setPage(page + 1)}>পরের</Button></div>
  </div>
}