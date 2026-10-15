import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { History, Power, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { adminRestoreSnapshot, adminSetCategorySource, adminSourceBulk, adminSourceOverview } from '@/lib/admin-sources.functions'
import { Card, ErrorState } from '@/components/ui-kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { PlatformIcon } from '@/lib/brand'
import { fmtDate, money } from '@/lib/format'

/** Category-by-category panel choice: one panel (or none) per category, plus manual order handling and undo. */
export function ProviderCompare() {
  const load = useServerFn(adminSourceOverview), setSource = useServerFn(adminSetCategorySource)
  const bulk = useServerFn(adminSourceBulk), restore = useServerFn(adminRestoreSnapshot)
  const qc = useQueryClient()
  const { data, isError, isLoading } = useQuery({ queryKey: ['source-overview'], queryFn: () => load() })
  const [platform, setPlatform] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try { await fn(); toast.success(ok); qc.invalidateQueries() } catch { toast.error('পরিবর্তন করা যায়নি') } finally { setBusy(false) }
  }
  if (isError) return <ErrorState />
  if (isLoading || !data) return <Skeleton className="h-60" />
  const names = new Map(data.providers.map((p) => [p.id, p.name]))
  const current = platform ?? data.platforms[0]?.id
  const cats = data.categories.filter((c) => c.platform_id === current)
  const choice = (c: (typeof cats)[number]) => {
    const on = Object.entries(c.providers).filter(([, v]) => v.on > 0).map(([k]) => k)
    return c.source_provider ?? (on.length === 0 ? 'off' : on.length === 1 ? on[0] : 'all')
  }
  const pick = (ids: string[], provider: string) => run(() => setSource({ data: { ids, provider } }), 'প্যানেল বদলানো হয়েছে')

  return <div className="space-y-4">
    <Card className="!p-4 space-y-3">
      <p className="text-sm text-muted-foreground">প্রতিটা ক্যাটাগরির পাশে কোন প্যানেলের সার্ভিস চলবে বেছে নিন। একটা বাছলে অন্য প্যানেলের একই ক্যাটাগরি নিজে থেকেই বন্ধ হবে। "নিজে কন্ট্রোল" চালু থাকলে ওই ক্যাটাগরির অর্ডার কোনো প্যানেলে যাবে না — আপনি অর্ডার পাতা থেকে নিজে সামলাবেন।</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => confirm('সব এপিআই সার্ভিস বন্ধ করবেন?') && void run(() => bulk({ data: { action: 'all_off' } }), 'সব বন্ধ হয়েছে')}><Power />সব বন্ধ</Button>
        <Button variant="outline" disabled={busy} onClick={() => confirm('সব আগের মতো (সব চালু) করবেন?') && void run(() => bulk({ data: { action: 'reset' } }), 'রিসেট হয়েছে')}><RotateCcw />রিসেট (সব চালু)</Button>
        <Button variant="outline" disabled={busy} onClick={() => void run(() => bulk({ data: { action: 'save' } }), 'বর্তমান অবস্থা সংরক্ষিত')}><Save />এখনকার অবস্থা সংরক্ষণ</Button>
      </div>
      {data.snapshots.length > 0 && <details><summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" />আগের অবস্থায় ফিরে যান</summary>
        <div className="mt-2 space-y-1">{data.snapshots.map((s) => <div key={s.id} className="flex items-center gap-2 border-b border-border py-1 text-sm"><span className="flex-1">{fmtDate(s.created_at)} · {s.label}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm('এই সময়ের অবস্থায় ফিরে যাবেন?') && void run(() => restore({ data: { id: s.id } }), 'আগের অবস্থায় ফিরেছে')}>ফিরে যান</Button></div>)}</div>
      </details>}
    </Card>
    <div className="flex flex-wrap gap-2">{data.platforms.map((p) => <Button key={p.id} variant={p.id === current ? 'default' : 'outline'} size="sm" onClick={() => setPlatform(p.id)}><PlatformIcon slug={p.slug} logo={p.logo_url} name={p.name} className="h-4 w-4" />{p.name}</Button>)}</div>
    {cats.length > 0 && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">এই প্ল্যাটফর্মের সব ক্যাটাগরি:</span>
      {data.providers.map((p) => <Button key={p.id} size="sm" variant="outline" disabled={busy} onClick={() => void pick(cats.map((c) => c.id), p.id)}>{p.name}</Button>)}
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void pick(cats.map((c) => c.id), 'off')}>সব বন্ধ</Button></div>}
    <div className="space-y-2">{cats.map((c) => {
      const value = choice(c)
      return <Card key={c.id} className="!p-3 space-y-2">
        <div className="break-words font-semibold">{c.name}</div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="প্যানেল বাছাই" disabled={busy} className="h-9 rounded-md border border-border bg-background px-2 text-sm" value={value} onChange={(e) => void pick([c.id], e.target.value)}>
            {Object.entries(c.providers).map(([id, v]) => <option key={id} value={id}>{names.get(id) ?? 'প্যানেল'} — {v.total}টি, শুরু {money(v.min)}</option>)}
            {value === 'all' && <option value="all">একাধিক প্যানেল চালু</option>}
            <option value="off">বন্ধ</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><Switch checked={c.manual_control} disabled={busy} onCheckedChange={(v) => void run(() => setSource({ data: { ids: [c.id], manual: v } }), v ? 'এখন নিজে কন্ট্রোল করবেন' : 'অর্ডার প্যানেলে যাবে')} />নিজে কন্ট্রোল</label>
        </div>
      </Card>
    })}</div>
  </div>
}
