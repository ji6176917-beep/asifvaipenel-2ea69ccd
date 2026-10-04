import { useTr } from "@/lib/i18n";

export function strength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}
export function StrengthBar({ value }: { value: string }) {
  const tr = useTr();
  const s = strength(value);
  const labels = [tr("Too weak"), tr("Weak"), tr("Fair"), tr("Good"), tr("Strong")];
  return (
    <div className="mt-2">
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i < s ? "bg-primary" : "bg-muted"}`} />)}</div>
      <p className="mt-1 text-xs text-muted-foreground">{labels[s]}</p>
    </div>
  );
}
