import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, ChevronRight, History, Pencil, Power, Save } from 'lucide-react'
import { toast } from 'sonner'
import { adminCategoryServices, adminRestoreSnapshot, adminSetCategorySource, adminSetProviderScope, adminSetScopeMarkup, adminSourceBulk, adminSourceOverview } from '@/lib/admin-sources.functions'
import { adminEditProviderService, adminPickService } from '@/lib/admin-providers.functions'
import { Card, ErrorState } from '@/components/ui-kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformIcon } from '@/lib/brand'
import { fmtDate, money, rateMoney } from "@/lib/format"

type Svc = Awaited<ReturnType<typeof adminCategoryServices>>[number]

/** Provider 1 / 2 / 3 tabs → platform → category ON/OFF (other panels auto-off) → services with edit and panel switch. */
export function ProviderCompare() {
  const load = useServerFn(adminSourceOverview), setScope = useServerFn(adminSetProviderScope), setSource = useServerFn(adminSetCategorySource)
  const markup = useServerFn(adminSetScopeMarkup), bulk = useServerFn(adminSourceBulk), restore = useServerFn(adminRestoreSnapshot)
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
  const pid = provider ?? data.providers[0]!.id
  const cats = data.categories.filter((c) => c.providers[pid])
  const plats = data.platforms.filter((p) => cats.some((c) => c.platform_id === p.id))
  const plat = platform && plats.some((p) => p.id === platform) ? platform : plats[0]?.id
  const shown = cats.filter((c) => c.platform_id === plat)
  const sum = (list: typeof cats) => list.reduce((a, c) => { const m = c.providers[pid]!; return { on: a.on + m.on, total: a.total + m.total } }, { on: 0, total: 0 })
  const apiSum = sum(cats), platSum = sum(shown)
  const status = (s: { on: number; total: number }) => s.on === 0 ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">বন্ধ</span>
    : s.on === s.total ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">চালু</span>
    : <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">কিছু চালু ({s.on}/{s.total})</span>
  const scope = (sc: 'all' | 'platform' | 'category', id: string | null, on: boolean, ok: string) => void run(() => setScope({ data: { provider: pid, scope: sc, id, on } }), ok)
  const pName = data.providers.findIndex((p) => p.id === pid) + 1

  if (openCat) return <CategoryServices cat={openCat} provider={pid} onBack={() => setOpenCat(null)} />

  return <div className="space-y-4">
    <Card className="!p-4 space-y-3">
      <p className="text-sm text-muted-foreground">প্রতিটা প্রোভাইডার আলাদাভাবে চলে। একটায় কিছু চালু/বন্ধ করলে অন্য প্রোভাইডারে কিছুই বদলাবে না। ক্যাটাগরির নামে চাপলে ভিতরের সার্ভিস দেখবেন — নাম, দাম বদলানো যাবে।</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => confirm('সব প্রোভাইডারের সব এপিআই সার্ভিস বন্ধ করবেন? (নিজের সার্ভিস বদলাবে না)') && void run(() => bulk({ data: { action: 'all_off' } }), 'সব বন্ধ হয়েছে')}><Power />সব প্রোভাইডার বন্ধ</Button>
        <Button variant="outline" disabled={busy} onClick={() => void run(() => bulk({ data: { action: 'save' } }), 'এখনকার অবস্থা সংরক্ষিত')}><Save />এখনকার অবস্থা সংরক্ষণ</Button>
      </div>
      {data.snapshots.length > 0 && <details><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />আগের অবস্থায় ফিরে যান (প্রতিটা পরিবর্তনের আগে নিজে থেকেই সংরক্ষণ হয়)</summary>
        <div className="mt-2 space-y-1">{data.snapshots.map((s) => <div key={s.id} className="flex items-center gap-2 border-b border-border py-1 text-sm"><span className="flex-1">{fmtDate(s.created_at)} · {s.label}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm('এই সময়ের অবস্থায় ফিরে যাবেন?') && void run(() => restore({ data: { id: s.id } }), 'আগের অবস্থায় ফিরেছে')}>ফিরে যান</Button></div>)}</div>
      </details>}
    </Card>

    <div className="flex flex-wrap gap-2">{data.providers.map((p, i) => <Button key={p.id} variant={p.id === pid ? 'default' : 'outline'} onClick={() => { setProvider(p.id); setPlatform(null) }}>প্রোভাইডার {i + 1}: {p.name}{!p.active && ' (বন্ধ)'}</Button>)}</div>
    {!plats.length ? <Card>এই প্যানেলে কোনো সার্ভিস নেই।</Card> : <>
      <Card className="!p-3 flex flex-wrap items-center gap-2">
        <span className="flex-1 text-sm font-semibold">পুরো প্রোভাইডার {pName} এপিআই: {status(apiSum)}</span>
        <Button size="sm" disabled={busy} onClick={() => confirm('এই প্রোভাইডারের সব সার্ভিস চালু করবেন?') && scope('all', null, true, 'পুরো এপিআই চালু')}>পুরো এপিআই চালু</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => confirm('এই প্রোভাইডারের সব সার্ভিস বন্ধ করবেন?') && scope('all', null, false, 'পুরো এপিআই বন্ধ')}>পুরো এপিআই বন্ধ</Button>
      </Card>
      <div className="flex flex-wrap gap-2">{plats.map((p) => <Button key={p.id} variant={p.id === plat ? 'default' : 'outline'} size="sm" onClick={() => setPlatform(p.id)}><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-4 w-4" />{p.name}</Button>)}</div>
      {shown.length > 0 && <Card className="!p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1 text-sm font-semibold">{plats.find((p) => p.id === plat)?.name} (এই প্রোভাইডারে): {status(platSum)}</span>
          <Button size="sm" disabled={busy} onClick={() => scope('platform', plat!, true, 'চালু হয়েছে')}>সব চালু</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => scope('platform', plat!, false, 'বন্ধ হয়েছে')}>সব বন্ধ</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => setSource({ data: { ids: shown.map((c) => c.id), manual: true } }), 'সবগুলো এখন নিজে কন্ট্রোলে')}>সব নিজে কন্ট্রোল</Button>
        </div>
        <MarkupBox label={`পুরো ${plats.find((p) => p.id === plat)?.name ?? ''}-এর দাম: কেনা দাম +`} busy={busy} onApply={(mode, value) => void run(() => markup({ data: { provider: pid, scope: 'platform', id: plat!, mode, value } }), 'দাম বসানো হয়েছে')} />
      </Card>}
      <div className="space-y-2">{shown.map((c) => {
        const mine = c.providers[pid] ?? { total: 0, on: 0, min: 0 }
        return <Card key={c.id} className="!p-3">
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex w-full min-w-0 items-center gap-1 text-left font-semibold hover:underline sm:w-auto sm:flex-1" onClick={() => setOpenCat({ id: c.id, name: c.name })}>
              <span className="break-words">{c.name}</span><ChevronRight className="h-4 w-4 shrink-0" />
            </button>
            {status(mine)}
            <span className="text-xs text-muted-foreground">শুরু {rateMoney(mine.min)}</span>
            <label className="flex items-center gap-2 text-sm"><Switch checked={mine.on > 0} disabled={busy} onCheckedChange={(v) => scope('category', c.id, v, v ? 'চালু হয়েছে' : 'বন্ধ হয়েছে')} />এপিআই</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={c.manual_control} disabled={busy} onCheckedChange={(v) => void run(() => setSource({ data: { ids: [c.id], manual: v } }), v ? 'এই ক্যাটাগরির অর্ডার আপনি নিজে সামলাবেন' : 'অর্ডার প্যানেলে যাবে')} />নিজে কন্ট্রোল</label>
          </div>
        </Card>
      })}</div>
    </>}
  </div>
}

function CategoryServices({ cat, provider, onBack }: { cat: { id: string; name: string }; provider: string; onBack: () => void }) {
  const markup = useServerFn(adminSetScopeMarkup)
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
    <Card className="!p-3"><MarkupBox label="এই ক্যাটাগরির (এই প্রোভাইডারের) সব দাম: কেনা দাম +" busy={busy} onApply={(mode, value) => void run(() => markup({ data: { provider, scope: 'category', id: cat.id, mode, value } }), 'দাম বসানো হয়েছে')} /></Card>
    {isError ? <ErrorState /> : isLoading || !data ? <Skeleton className="h-40" /> : !data.length ? <Card>কোনো সার্ভিস নেই।</Card> :
      [...groups.entries()].map(([prov, list]) => <Card key={prov} className="!p-3 space-y-2">
        <div className="font-semibold">{prov}</div>
        {list.map((s) => {
          const others = (data ?? []).filter((o) => o.provider_id !== s.provider_id && o.active).map((o) => o.id)
          return <div key={s.id} className="space-y-2 border-t border-border pt-2">
            {editing === s.id ? <EditRow s={s} busy={busy} onCancel={() => setEditing(null)} onSave={(name, rate) => void run(async () => { await edit({ data: { id: s.id, name, rate } }); setEditing(null) }, 'সংরক্ষিত')} /> :
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-full min-w-0 break-words sm:w-auto sm:flex-1">#{s.service_no ?? '—'} {s.name}{!s.provider_available && <span className="text-destructive"> (প্যানেলে নেই)</span>}</span>
                <span className="font-semibold">{rateMoney(s.rate)}/{s.rate_per}</span>
                {s.provider_rate != null && <span className="text-xs text-muted-foreground">আসল এপিআই দাম {rateMoney(s.provider_rate)} · {ruleText(s)}</span>}
                {s.provider_rate != null && s.price_mode !== 'base' && <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm('এই সার্ভিসের দাম আসল এপিআই দামে রিসেট করবেন?') && void run(() => edit({ data: { id: s.id, reset: true } }), 'দাম রিসেট হয়েছে')}>দাম রিসেট</Button>}
                <Button size="sm" variant="ghost" onClick={() => setEditing(s.id)}><Pencil />নাম/দাম এডিট</Button>
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
  return <div className="space-y-2 rounded-lg border border-border p-3">
    <label className="block text-sm font-semibold">সার্ভিসের নাম (কাস্টমার যা দেখবে)
      <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
    </label>
    <label className="block text-sm font-semibold">বিক্রয় দাম ($) — প্রতি {s.rate_per}টির জন্য
      <Input className="mt-1 w-40" type="number" step="0.0001" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
    </label>
    <p className="text-xs text-muted-foreground">
      {s.provider_rate != null && <>প্রোভাইডারের কেনা দাম: {rateMoney(s.provider_rate)} প্রতি {s.rate_per}টি{r > 0 && <> · আপনার লাভ: {rateMoney(r - s.provider_rate)}</>} · </>}
      সর্বনিম্ন {s.min_qty} · সর্বোচ্চ {s.max_qty} (প্রোভাইডার অনুযায়ী, বদলাবে না)<br />যে লাভ বসাবেন, এপিআই দাম বদলালেও সেই পরিমাণ লাভ অটো যোগ থাকবে।
    </p>
    <div className="flex gap-2">
      <Button size="sm" disabled={busy || !name.trim() || !(r > 0)} onClick={() => onSave(name.trim(), r)}>সংরক্ষণ</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>বাতিল</Button>
    </div>
  </div>
}

function ruleText(s: Svc) {
  if (s.price_mode === 'percent') return `অটো: +${s.price_value}%`
  if (s.price_mode === 'fixed') return `অটো: ${s.price_value >= 0 ? '+' : ''}${rateMoney(s.price_value)}`
  if (s.price_mode === 'base') return 'আসল দামে'
  return 'পুরোনো নিয়ম'
}

export function MarkupBox({ label, busy, onApply }: { label: string; busy: boolean; onApply: (mode: 'percent' | 'fixed' | 'base', value: number) => void }) {
  const [p, setP] = useState(''), [mode, setMode] = useState<'percent' | 'fixed'>('percent')
  const n = Number(p)
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <span className="w-full sm:w-auto">{label}</span>
    <Input className="w-24" type="number" min="0" step="0.01" placeholder="যেমন 20" value={p} onChange={(e) => setP(e.target.value)} />
    <select className="h-9 rounded-md border border-input bg-background px-2" value={mode} onChange={(e) => setMode(e.target.value as 'percent' | 'fixed')}>
      <option value="percent">% বেশি</option>
      <option value="fixed">$ বেশি</option>
    </select>
    <Button size="sm" variant="outline" disabled={busy || p === '' || !(n >= 0)} onClick={() => confirm(`আসল এপিআই দামের উপর ${mode === 'percent' ? n + '%' : '$' + n} বেশি বসাবেন? এপিআই দাম বদলালে আপনার দামও অটো বদলাবে।`) && onApply(mode, n)}>দাম বসান</Button>
    <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm('সব দাম আসল এপিআই দামে রিসেট করবেন?') && onApply('base', 0)}>সব দাম রিসেট</Button>
  </div>
}
