import { useEffect, useRef, useState } from "react";
import { ClipboardCheck, Headphones, ShieldCheck, UsersRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const START = Date.UTC(2026, 9, 12);
const DAY = 86_400_000;

/** Deterministic daily growth: each day adds between min and max (same value for every visitor). */
export function grownValue(base: number, min: number, max: number, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - START) / DAY));
  let total = base;
  for (let d = 1; d <= days; d++) {
    const r = ((Math.sin(d * 12.9898 + base) * 43758.5453) % 1 + 1) % 1;
    total += Math.round(min + r * (max - min));
  }
  return total;
}

function useCountUp(target: number, run: boolean, ms = 1800) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(target);
      return;
    }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

function Stat({ icon: Icon, target, decimals = 0, suffix = "", label, run, fixed, layout }: { icon: typeof UsersRound; target: number; decimals?: number; suffix?: string; label: string; run: boolean; fixed?: string; layout?: "strip" | undefined }) {
  const v = useCountUp(target, run);
  if (layout === "strip") return (
    <div className="home-trust-item">
      <span className="home-trust-icon"><Icon aria-hidden="true" /></span>
      <div><strong>{`${v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`}</strong><span>{label}</span></div>
    </div>
  );
  return (
    <div className="live-stat">
      <span className="live-stat-icon"><Icon aria-hidden="true" /></span>
      <strong>{fixed ?? `${v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${suffix}`}</strong>
      <span>{label}</span>
    </div>
  );
}

export function LiveStats({ layout }: { layout?: "strip" }) {
  const { tr } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const [run, setRun] = useState(false);
  const [users, setUsers] = useState(50_000);
  const [orders, setOrders] = useState(100_000);
  useEffect(() => {
    setUsers(grownValue(50_000, 1000, 2000));
    setOrders(grownValue(100_000, 2000, 4000));
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={ref} className={layout === "strip" ? "home-trust-strip" : "live-stats"} aria-label={tr("Live statistics")}>
      <Stat layout={layout} icon={UsersRound} target={users} suffix="+" label={tr("Happy Customers")} run={run} />
      <Stat layout={layout} icon={ClipboardCheck} target={orders} suffix="+" label={tr("Orders Completed")} run={run} />
      <Stat layout={layout} icon={ShieldCheck} target={99} suffix="%" label={tr("Success Rate")} run={run} />
      <Stat layout={layout} icon={Headphones} target={24} suffix="/7" label={tr("Support")} run={run} />
    </section>
  );
}
