export type AccountLevel = { key: string; name: string; min: number; color: string };
// Thresholds are total approved deposits in USD.
export const LEVELS: AccountLevel[] = [
  { key: "beginner", name: "Beginner", min: 0, color: "var(--level-beginner)" },
  { key: "silver", name: "Silver", min: 100, color: "var(--level-silver)" },
  { key: "gold", name: "Gold", min: 500, color: "var(--level-gold)" },
  { key: "diamond", name: "Diamond", min: 1000, color: "var(--level-diamond)" },
  { key: "vip", name: "VIP", min: 2500, color: "var(--level-vip)" },
  { key: "master", name: "Master", min: 5000, color: "var(--level-master)" },
  { key: "legend", name: "Legend", min: 10000, color: "var(--level-legend)" },
];
export const PERKS = ["24/7 Ticket Support", "Order tracking", "Active users get quick support", "24/7 WhatsApp Support", "Priority Order Processing", "Exclusive Help Desk for VIP", "Admin response for VIP Users"];
export function levelFor(total: number) {
  let i = 0;
  LEVELS.forEach((l, n) => { if (total >= l.min) i = n; });
  return i;
}
