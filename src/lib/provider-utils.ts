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

const PLATFORM_PATTERNS: [string, RegExp][] = [
  ['instagram', /\b(instagram|insta|ig)\b/i], ['facebook', /\b(facebook|fb)\b/i], ['youtube', /\b(youtube|yt)\b/i],
  ['tiktok', /\btik\s?tok\b/i], ['telegram', /\b(telegram|tg)\b/i], ['twitter', /\b(twitter|x\.com|tweets?)\b/i],
  ['threads', /\bthreads\b/i], ['spotify', /\bspotify\b/i], ['linkedin', /\blinked\s?in\b/i], ['snapchat', /\bsnap\s?chat\b/i],
  ['pinterest', /\bpinterest\b/i], ['discord', /\bdiscord\b/i], ['twitch', /\btwitch\b/i], ['whatsapp', /\bwhats\s?app\b/i],
  ['soundcloud', /\bsound\s?cloud\b/i], ['reddit', /\breddit\b/i], ['kick', /\bkick\b/i], ['vk', /\b(vk|vkontakte)\b/i],
  ['kwai', /\bkwai\b/i], ['shopee', /\bshopee\b/i], ['quora', /\bquora\b/i], ['tumblr', /\btumblr\b/i], ['vimeo', /\bvimeo\b/i],
  ['dailymotion', /\bdailymotion\b/i], ['website', /\b(website|web traffic|traffic)\b/i],
]
const PLATFORM_NAMES: Record<string, string> = { tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', soundcloud: 'SoundCloud', whatsapp: 'WhatsApp', vk: 'VK', twitter: 'Twitter / X', website: 'Website Traffic', other: 'Other' }

export function detectPlatform(title: string) {
  return PLATFORM_PATTERNS.find(([, re]) => re.test(title))?.[0] ?? 'other'
}

function formatMinutes(min: number) {
  if (min < 1) return 'Instant'
  if (min < 60) return `${Math.round(min)} minutes`
  if (min < 1440) { const h = Math.round(min / 60); return h === 1 ? '1 hour' : `${h} hours` }
  const d = Math.round(min / 1440); return d === 1 ? '1 day' : `${d} days`
}

const RANGE = String.raw`(\d+(?:\.\d+)?(?:\s*[-–~]\s*\d+(?:\.\d+)?)?)`
function unitText(range: string, unit: string) {
  const r = range.replace(/\s*[-–~]\s*/, '-')
  const u = unit.toLowerCase()
  const single = !r.includes('-') && Number(r) === 1
  if (u.startsWith('m')) return `${r} ${single ? 'minute' : 'minutes'}`
  if (u.startsWith('d')) return `${r} ${single ? 'day' : 'days'}`
  return `${r} ${single ? 'hour' : 'hours'}`
}

/** Real start time from the provider: speed hints in name/description or average_time (minutes). Null = unknown. */
export function providerAvgTime(row: Record<string, unknown>): string | null {
  const text = `${row['name'] ?? ''} ${row['description'] ?? row['desc'] ?? ''}`.replace(/\s+/g, ' ')
  const start = new RegExp(String.raw`start(?:\s*time)?\s*[:\-]?\s*${RANGE}\s*(min(?:ute)?s?|h(?:ours?|rs?)?|d(?:ays?)?)\b`, 'i').exec(text)
  if (start) return unitText(start[1]!, start[2]!)
  if (/start(?:\s*time)?\s*[:\-]?\s*(super\s*)?instant/i.test(text)) return 'Instant (0-5 minutes)'
  const avg = Number(row['average_time'])
  if (Number.isFinite(avg) && avg > 0) return formatMinutes(avg)
  if (/\binstant\b/i.test(text)) return 'Instant (0-5 minutes)'
  const m = new RegExp(String.raw`(?:^|[\s\[|(])${RANGE}\s*(min(?:ute)?s?)\b`, 'i').exec(text)
  if (m && /[-–~]/.test(m[1]!)) return unitText(m[1]!, m[2]!)
  const h = new RegExp(String.raw`(?:^|[\s\[|(])${RANGE}\s*(?:\/\s*)?(h|hrs?|hours?)\b`, 'i').exec(text)
  if (h) return unitText(h[1]!, h[2]!)
  return null
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
    return [{ service: r.service, name: r.name, type: r.type, rate: r.rate, min: r.min, max: r.max, available: providerServiceAvailable(r), avg_time: providerAvgTime(r)?.slice(0, 60) ?? null, category: r.category.slice(0, 120), platform, platform_name: PLATFORM_NAMES[platform] ?? platform.charAt(0).toUpperCase() + platform.slice(1) }]
  })
  if (input.length && skipped > input.length * 0.2) throw new Error('অসম্পূর্ণ সার্ভিস তালিকা এসেছে; পুরনো তালিকা অপরিবর্তিত আছে')
  return { rows, skipped }
}

export function providerOrderStatus(status: string, quantity: number, remains: unknown) {
  const value = status.toLowerCase().replace(/[ _-]/g, '')
  if (value === 'completed') return { status: 'completed' as const, delivered: quantity }
  if (['canceled', 'cancelled'].includes(value)) return { status: 'canceled' as const, delivered: 0 }
  if (['rejected', 'refunded', 'failed', 'error'].includes(value)) return { status: 'rejected' as const, delivered: 0 }
  if (value === 'pending') return { status: 'pending' as const, delivered: 0 }
  if (['processing', 'inprogress'].includes(value)) return { status: 'processing' as const, delivered: 0 }
  if (value === 'partial') {
    const remaining = Number(remains)
    if (!Number.isInteger(remaining) || remaining <= 0 || remaining >= quantity) return null
    return { status: 'partial' as const, delivered: quantity - remaining }
  }
  return null
}