// Admin-only simulated growth. Turn off by setting ENABLED = false.
export const ENABLED = true;
const START = Date.UTC(2026, 10, 18, 8, 0, 0);
const DAYS = 25;
const DAY = 86_400_000;
export const TARGET_USERS = 22_223;
export const TARGET_VISITORS = 33_734;
const SPAN = DAYS * DAY;
const ID_PREFIX = "5e1a0000-";

function rnd(n: number) { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
// Uneven daily growth: overall ramp-up, but each day gets its own random size
// (some days almost flat, some days a burst) so the pattern is not uniform.
function dailyCdf(seed: number) {
  const w: number[] = [];
  for (let d = 0; d < DAYS; d++) {
    const ramp = 0.35 + (d / DAYS) * 1.3;
    const r = rnd(seed + d * 7.31);
    const mood = d < 2 ? 1.1 : r < 0.12 ? 0.08 + r : r > 0.85 ? 1.7 + r : 0.55 + r * 0.9;
    w.push(ramp * mood);
  }
  const total = w.reduce((a, b) => a + b, 0);
  const cdf = [0];
  for (const x of w) cdf.push(cdf[cdf.length - 1]! + x / total);
  cdf[DAYS] = 1;
  return cdf;
}
const USER_CDF = dailyCdf(101);
const VISIT_CDF = dailyCdf(907);
/** Fraction (0..1) reached at elapsed time t (ms since START). */
function fracAt(cdf: number[], t: number) {
  if (t <= 0) return 0;
  if (t >= SPAN) return 1;
  const d = Math.floor(t / DAY), p = (t - d * DAY) / DAY;
  return cdf[d]! + (cdf[d + 1]! - cdf[d]!) * p;
}
/** Inverse of fracAt. */
function timeAt(cdf: number[], f: number) {
  let d = 0;
  while (d < DAYS - 1 && cdf[d + 1]! <= f) d++;
  const span = cdf[d + 1]! - cdf[d]!;
  return (d + (span > 0 ? (f - cdf[d]!) / span : 0)) * DAY;
}

/** Offset (ms from START) at which the i-th simulated account was created. */
function createdOffset(i: number) {
  const f = (i + rnd(i) * 0.9) / TARGET_USERS;
  return Math.min(SPAN - 1, Math.round(timeAt(USER_CDF, f)));
}
export function userCountAt(now = Date.now()) {
  if (!ENABLED || now <= START) return 0;
  let lo = 0, hi = TARGET_USERS;
  while (lo < hi) { const m = (lo + hi) >> 1; if (START + createdOffset(m) <= now) lo = m + 1; else hi = m; }
  return lo;
}
export function visitorsAt(now = Date.now()) {
  if (!ENABLED || now <= START) return 0;
  return Math.round(fracAt(VISIT_CDF, now - START) * TARGET_VISITORS);
}
export function visitorsOnDay(dayStartMs: number) { return Math.max(0, visitorsAt(dayStartMs + DAY) - visitorsAt(dayStartMs)); }

const FIRST = ["Rahim","Karim","Sakib","Tanvir","Nusrat","Farhana","Arif","Imran","Sadia","Mehedi","Rakib","Jannat","Hasan","Rifat","Sumaiya","Nayeem","Tasnim","Shuvo","Mim","Fahim","Ayesha","Rasel","Sabbir","Priya","Rahul","Amit","Ankit","Sneha","Ahmed","Omar","Yusuf","Fatima","Zainab","Ali","Bilal","Hamza","Usman","Maria","John","David","Kevin","Sara","Emily","Daniel","Ryan","Jamal","Tamim","Sohel","Nabila","Mahin"];
const LAST = ["Hossain","Islam","Rahman","Ahmed","Khan","Chowdhury","Akter","Uddin","Sarkar","Mia","Das","Roy","Sharma","Patel","Singh","Ali","Hassan","Malik","Sheikh","Biswas","Talukder","Mahmud","Karim","Begum","Smith","Brown","Kabir","Haque","Alam","Siddique"];
const DOMAINS = ["gmail.com","gmail.com","gmail.com","gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com"];

export const isSimId = (id: string) => id.startsWith(ID_PREFIX);

export function simUser(i: number) {
  const a = FIRST[Math.floor(rnd(i + 1) * FIRST.length)]!, b = LAST[Math.floor(rnd(i + 2) * LAST.length)]!;
  const num = Math.floor(rnd(i + 3) * 9000) + (rnd(i + 4) > 0.5 ? 10 : 100);
  const sep = ["", ".", "_", ""][Math.floor(rnd(i + 5) * 4)]!;
  const handle = `${a}${sep}${b}${num}`.toLowerCase();
  const created = new Date(START + createdOffset(i));
  const signin = new Date(Math.min(Date.now(), created.getTime() + Math.floor(rnd(i + 6) * 5 * DAY)));
  const hex = i.toString(16).padStart(12, "0");
  const google = rnd(i + 7) > 0.6;
  return {
    id: `${ID_PREFIX}0000-4000-8000-${hex}`,
    full_name: `${a} ${b}`,
    email: `${handle}@${DOMAINS[Math.floor(rnd(i + 8) * DOMAINS.length)]}`,
    phone: rnd(i + 9) > 0.55 ? `+8801${3 + Math.floor(rnd(i + 10) * 7)}${String(Math.floor(rnd(i + 11) * 1e8)).padStart(8, "0")}` : null,
    public_id: String(100000 + 37 * i + 4000).slice(0, 7),
    username: handle,
    avatar_url: null,
    balance: 0,
    created_at: created.toISOString(),
    last_sign_in_at: signin.toISOString(),
    last_seen_at: signin.toISOString(),
    method: google ? "Google" : "Email",
    verified: google || rnd(i + 12) > 0.25,
    banned: false,
  };
}
export function simUsers(now = Date.now()) { const n = userCountAt(now); return Array.from({ length: n }, (_, i) => simUser(i)); }
