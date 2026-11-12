import type { ReactNode } from "react";
import { Zap, ShieldCheck, Wallet } from "lucide-react";
import banner from "@/assets/auth-banner.jpg";
import { useTr } from "@/lib/i18n";

export function AuthLayout({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const tr = useTr();
  const feats = [
    { icon: Zap, t: tr("Instant delivery"), d: tr("Orders start processing automatically.") },
    { icon: ShieldCheck, t: tr("100% safe"), d: tr("No password needed for your social accounts.") },
    { icon: Wallet, t: tr("Easy local payment"), d: "bKash · Nagad · Rocket · Binance · USDT" },
  ];
  return (
    <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl md:grid-cols-2">
      <aside className="relative min-h-[180px] overflow-hidden bg-primary/10 md:min-h-[600px]">
        <img src={banner} alt="" width={1024} height={1280} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
        <div className="relative flex h-full flex-col justify-end gap-4 p-5 text-background md:p-8">
          <h2 className="text-xl font-extrabold leading-tight md:text-3xl">{tr("Grow your social media with Apex SMM World")}</h2>
          <ul className="hidden space-y-3 md:block">
            {feats.map(({ icon: I, t, d }) => (
              <li key={t} className="flex items-start gap-3 rounded-2xl bg-background/15 p-3 backdrop-blur">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><I className="h-5 w-5" /></span>
                <span><b className="block text-sm">{t}</b><span className="text-xs opacity-90">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="p-5 sm:p-8 md:p-10">
        <h1 className="text-2xl font-extrabold md:text-3xl">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{sub}</p>
        {children}
      </section>
    </div>
  );
}
