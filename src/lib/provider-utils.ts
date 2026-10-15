import { z } from 'zod'

export function validateProviderUrl(value: string) {
  const url = new URL(value)
  const host = url.hostname.toLowerCase()
  if (url.protocol !== 'https:' || url.username || url.password || url.port || host === 'localhost' || !host.includes('.') || /^(\d+\.){3}\d+$/.test(host) || host.includes(':') || /\.(local|internal|localhost)$/.test(host)) throw new Error('শুধু প্রকাশ্য HTTPS এপিআই ঠিকানা ব্যবহার করুন')
  return url.toString()
}

export const markedUpRate = (rate: number, percent: number) => Math.ceil(rate * (1 + percent / 100) * 10000 - 1e-8) / 10000

const remoteService = z.object({
  service: z.union([z.string(), z.number()]).transform(String), name: z.string().min(1),
  category: z.string().min(1), type: z.string().default('Default'),
  rate: z.coerce.number().finite().positive(), min: z.coerce.number().int().positive(),
  max: z.coerce.number().int().positive().max(2147483647),
})

export function normalizeProviderServices(input: unknown) {
  if (!Array.isArray(input) || input.length > 20000) throw new Error('সঠিক সার্ভিস তালিকা পাওয়া যায়নি')
  let skipped = 0
  const seen = new Set<string>()
  const rows = input.flatMap((item) => {
    const parsed = remoteService.safeParse(item)
    if (!parsed.success || !['default', 'package'].includes(parsed.data.type.toLowerCase()) || parsed.data.min > parsed.data.max) { skipped++; return [] }
    const r = parsed.data
    if (r.type.toLowerCase() === 'package') { skipped++; return [] }
    if (seen.has(r.service)) return []
    seen.add(r.service)
    const title = `${r.category} ${r.name}`
    const known = ['facebook', 'instagram', 'youtube', 'tiktok', 'telegram', 'twitter', 'spotify', 'linkedin', 'snapchat', 'pinterest', 'threads', 'discord', 'twitch']
    const platform = known.find((p) => new RegExp(`\\b${p}\\b`, 'i').test(title)) ?? 'other'
    return [{ ...r, category: r.category.slice(0, 120), platform, platform_name: platform === 'other' ? 'Other' : platform.charAt(0).toUpperCase() + platform.slice(1) }]
  })
  if (!rows.length) throw new Error('আমাদের অর্ডার ফর্মের উপযোগী সার্ভিস পাওয়া যায়নি; পুরনো তালিকা অপরিবর্তিত আছে')
  return { rows, skipped }
}

export function providerOrderStatus(status: string, quantity: number, remains: unknown) {
  const value = status.toLowerCase().replace(/[ _-]/g, '')
  if (value === 'completed') return { status: 'completed' as const, delivered: quantity }
  if (['canceled', 'cancelled', 'rejected', 'refunded'].includes(value)) return { status: 'rejected' as const, delivered: 0 }
  if (value === 'partial') {
    const remaining = Number(remains)
    if (!Number.isInteger(remaining) || remaining <= 0 || remaining >= quantity) return null
    return { status: 'partial' as const, delivered: quantity - remaining }
  }
  return null
}