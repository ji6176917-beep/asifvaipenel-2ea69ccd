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
  rate: z.coerce.number().finite().nonnegative(), min: z.coerce.number().int().nonnegative(),
  max: z.coerce.number().int().nonnegative().max(2147483647),
}).passthrough()

export function providerServiceAvailable(row: Record<string, unknown>) {
  const flags = [row['active'], row['enabled'], row['available'], row['status']]
  return !flags.some((value) => value === false || value === 0 || ['0', 'false', 'disabled', 'inactive', 'off', 'removed', 'cancelled', 'canceled'].includes(String(value).toLowerCase()))
}

export function normalizeProviderServices(input: unknown) {
  if (!Array.isArray(input)) throw new Error('সঠিক সার্ভিস তালিকা পাওয়া যায়নি')
  let skipped = 0
  const seen = new Set<string>()
  const rows = input.flatMap((item) => {
    const parsed = remoteService.safeParse(item)
    if (!parsed.success || parsed.data.min > parsed.data.max) { skipped++; return [] }
    const r = parsed.data
    if (seen.has(r.service)) return []
    seen.add(r.service)
    const title = `${r.category} ${r.name}`
    const platform = detectPlatform(title)
    return [{ service: r.service, name: r.name, type: r.type, rate: r.rate, min: r.min, max: r.max, available: providerServiceAvailable(r), category: r.category.slice(0, 120), platform, platform_name: PLATFORM_NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1) }]
  })
  if (input.length && skipped > input.length * 0.2) throw new Error('অসম্পূর্ণ সার্ভিস তালিকা এসেছে; পুরনো তালিকা অপরিবর্তিত আছে')
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