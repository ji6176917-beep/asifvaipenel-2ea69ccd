import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ChevronRight, History, Pencil, Power, Save } from 'lucide-react'
import { toast } from 'sonner'
import { adminCategoryServices, adminRestoreSnapshot, adminSetCategorySource, adminSetProviderCategory, adminSourceBulk, adminSourceOverview } from '@/lib/admin-sources.functions'
import { adminEditProviderService, adminPickService } from '@/lib/admin-providers.functions'
import { Card, ErrorState } from '@/components/ui-kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformIcon } from '@/lib/brand'
import { fmtDate, money } from '@/lib/format'

type Svc = Awaited<ReturnType<typeof adminCategoryServices>>[number]

/** Provider 1 / 2 / 3 tabs → platform → category ON/OFF (other panels auto-off) → services with edit and panel switch. */
export function ProviderCompare() {
  const load = useServerFn(adminSourceOverview), setCat = useServerFn(adminSetProviderCategory), setSource = useServerFn(adminSetCategorySource)
  const bulk = useServerFn(adminSourceBulk), restore = useServerFn(adminRestoreSnapshot)
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery({ queryKey: ['source-overview'], queryFn: () => load() })
  const [provider, setProvider] = useState<string | null>(null)
  const [platform, setPlatform] = useState<string | null>(null)
  const [openCat, setOpenCat] = useState<{ id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); toast.success(ok); await qc.invalidateQueries() } catch { toast.error('পরিবর্তন করা যায়নি') } finally { setBusy(false) }
  }
  if (isError) return <ErrorState />
  if (isLoading || !data) return <Skeleton className="h-60" />
  if (!data.providers.length) return <Card>কোনো এপিআই প্যানেল যুক্ত নেই। আগে "এপিআই সার্ভিস" থেকে প্যানেল যোগ করুন।</Card>
  const names = new Map(data.providers.map((p) => [p.id, p.name]))
  const pid = provider ?? data.providers[0].id
  const cats = data.categories.filter((c) => c.providers[pid])
  const plats = data.platforms.filter((p) => cats.some((c) => c.platform_id === p.id))
  const plat = platform && plats.some((p) => p.id === platform) ? platform : plats[0]?.id
  const shown = cats.filter((c) => c.platform_id === plat)

  if (openCat) return <CategoryServices cat={openCat} onBack={() => setOpenCat(null)} />

  return <div className="space-y-4">
    <Card className="!p-4 space-y-3">
      <p className="text-sm text-muted-foreground">উপরে প্যানেল বাছুন, তারপর ক্যাটাগরি চালু করুন। একটা প্যানেলে কোনো ক্যাটাগরি চালু করলে অন্য প্যানেলের একই ক্যাটাগরি নিজে থেকেই বন্ধ হবে। ক্যাটাগরির নামে চাপলে ভিতরের সার্ভিস দেখবেন — নাম, দাম বদলানো ও প্যানেল বদলানো যাবে।</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => confirm('সব এপিআই সার্ভিস বন্ধ করবেন? (নিজের সার্ভিস বদলাবে না)') && void run(() => bulk({ data: { action: 'all_off' } }), 'সব বন্ধ হয়েছে')}><Power />সব এপিআই সার্ভিস বন্ধ</Button>
        <Button variant="outline" disabled={busy} onClick={() => void run(() => bulk({ data: { action: 'save' } }), 'এখনকার অবস্থা সংরক্ষিত')}><Save />এখনকার অবস্থা সংরক্ষণ</Button>
      </div>
      {data.snapshots.length > 0 && <details><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />আগের অবস্থায় ফিরে যান (প্রতিটা পরিবর্তনের আগে নিজে থেকেই সংরক্ষণ হয়)</summary>
        <div className="mt-2 space-y-1">{data.snapshots.map((s) => <div key={s.id} className="flex items-center gap-2 border-b border-border py-1 text-sm"><span className="flex-1">{fmtDate(s.created_at)} · {s.label}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm('এই সময়ের অবস্থায় ফিরে যাবেন?') && void run(() => restore({ data: { id: s.id } }), 'আগের অবস্থায় ফিরেছে')}>ফিরে যান</Button></div>)}</div>
      </details>}
    </Card>

    <div className="flex flex-wrap gap-2">{data.providers.map((p, i) => <Button key={p.id} variant={p.id === pid ? 'default' : 'outline'} onClick={() => { setProvider(p.id); setPlatform(null) }}>প্রোভাইডার {i + 1}: {p.name}{!p.active && ' (বন্ধ)'}</Button>)}</div>
    {!plats.length ? <Card>এই প্যানেলে কোনো সার্ভিস নেই।</Card> : <>
      <div className="flex flex-wrap gap-2">{plats.map((p) => <Button key={p.id} variant={p.id === plat ? 'default' : 'outline'} size="sm" onClick={() => setPlatform(p.id)}><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-4 w-4" />{p.name}</Button>)}</div>
      <div className="space-y-2">{shown.map((c) => {
        const mine = c.providers[pid]
        const on = mine.on > 0
        const others = Object.entries(c.providers).filter(([k, v]) => k !== pid && v.on > 0).map(([k]) => names.get(k) ?? 'অন্য প্যানেল')
        return <Card key={c.id} className="!p-3">
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex min-w-0 flex-1 items-center gap-1 text-left font-semibold hover:underline" onClick={() => setOpenCat({ id: c.id, name: c.name })}>
              <span className="break-words">{c.name}</span><ChevronRight className="h-4 w-4 shrink-0" />
            </button>
            <span className="text-xs text-muted-foreground">{mine.on}/{mine.total} চালু · শুরু {money(mine.min)}</span>
            <label className="flex items-center gap-2 text-sm"><Switch checked={on} disabled={busy} onCheckedChange={(v) => void run(() => setCat({ data: { provider: pid, category_id: c.id, on: v } }), v ? 'চালু হয়েছে, অন্য প্যানেলেরটা বন্ধ' : 'বন্ধ হয়েছে')} />{on ? 'চালু' : 'বন্ধ'}</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={c.manual_control} disabled={busy} onCheckedChange={(v) => void run(() => setSource({ data: { ids: [c.id], manual: v } }), v ? 'এই ক্যাটাগরির অর্ডার আপনি নিজে সামলাবেন' : 'অর্ডার প্যানেলে যাবে')} />নিজে কন্ট্রোল</label>
          </div>
          {others.length > 0 && <p className="mt-1 text-xs text-muted-foreground">এখন চালু আছে: {others.join(', ')}</p>}
        </Card>
      })}</div>
    </>}
  </div>
}

function CategoryServices({ cat, onBack }: { cat: { id: string; name: string }; onBack: () => void }) {
  const load = useServerFn(adminCategoryServices), edit = useServerFn(adminEditProviderService), pick = useServerFn(adminPickService)
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery({ queryKey: ['category-services', cat.id], queryFn: () => load({ data: { category_id: cat.id } }) })
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); toast.success(ok); await qc.invalidateQueries() } catch { toast.error('পরিবর্তন করা যায়নি') } finally { setBusy(false) }
  }
  const groups = new Map<string, Svc[]>()
  for (const s of data ?? []) groups.set(s.provider, [...(groups.get(s.provider) ?? []), s])

  return <div className="space-y-3">
    <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft />ফিরে যান</Button>
    <h3 className="break-words text-lg font-bold">{cat.name}</h3>
    <p className="text-sm text-muted-foreground">সুইচ দিয়ে যেকোনো সার্ভিস চালু/বন্ধ করুন। "এটা চালু, অন্যগুলো বন্ধ" চাপলে অন্য প্যানেলের একই সার্ভিস বন্ধ হয়ে শুধু এটা চলবে।</p>
    {isError ? <ErrorState /> : isLoading || !data ? <Skeleton className="h-40" /> : !data.length ? <Card>কোনো সার্ভিস নেই।</Card> :
      [...groups.entries()].map(([prov, list]) => <Card key={prov} className="!p-3 space-y-2">
        <div className="font-semibold">{prov}</div>
        {list.map((s) => {
          const others = (data ?? []).filter((o) => o.provider_id !== s.provider_id && o.active).map((o) => o.id)
          return <div key={s.id} className="space-y-2 border-t border-border pt-2">
            {editing === s.id ? <EditRow s={s} busy={busy} onCancel={() => setEditing(null)} onSave={(name, rate) => void run(async () => { await edit({ data: { id: s.id, name, rate } }); setEditing(null) }, 'সংরক্ষিত')} /> :
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 break-words">#{s.service_no ?? '—'} {s.name}{!s.provider_available && <span className="text-destructive"> (প্যানেলে নেই)</span>}</span>
                <span className="font-semibold">{money(s.rate)}/{s.rate_per}</span>
                {s.provider_rate != null && <span className="text-xs text-muted-foreground">কেনা {money(s.provider_rate)}</span>}
                <Button size="sm" variant="ghost" onClick={() => setEditing(s.id)}><Pencil />এডিট</Button>
                <Switch checked={s.active} disabled={busy} onCheckedChange={(v) => void run(() => edit({ data: { id: s.id, active: v } }), v ? 'চালু' : 'বন্ধ')} />
                {others.length > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => pick({ data: { keep: s.id, off: others } }), 'প্যানেল বদলানো হয়েছে')}>এটা চালু, অন্যগুলো বন্ধ</Button>}
              </div>}
          </div>
        })}
      </Card>)}
  </div>
}

function EditRow({ s, busy, onSave, onCancel }: { s: Svc; busy: boolean; onSave: (name: string, rate: number) => void; onCancel: () => void }) {
  const [name, setName] = useState(s.name), [rate, setRate] = useState(String(s.rate))
  const r = Number(rate)
  return <div className="flex flex-wrap items-center gap-2">
    <Input className="min-w-48 flex-1" value={name} onChange={(e) => setName(e.target.value)} aria-label="সার্ভিসের নাম" />
    <Input className="w-28" type="number" step="0.0001" value={rate} onChange={(e) => setRate(e.target.value)} aria-label={`দাম প্রতি ${s.rate_per}`} />
    <Button size="sm" disabled={busy || !name.trim() || !(r > 0)} onClick={() => onSave(name.trim(), r)}>সংরক্ষণ</Button>
    <Button size="sm" variant="ghost" onClick={onCancel}>বাতিল</Button>
  </div>
}
