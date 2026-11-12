import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const TRUSTPILOT_URL = "https://www.trustpilot.com/review/apexsmmworld.com";
const DONE_KEY = "rating_prompt_done";
const SNOOZE_KEY = "rating_prompt_snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Shown only after the signed-in user has at least one completed order. */
export function RatingPrompt() {
  const { user } = useAuth();
  const { tr } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DONE_KEY)) return;
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    if (Date.now() - snooze < SNOOZE_MS) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").then(({ count }) => {
      if (alive && (count ?? 0) > 0) timer = setTimeout(() => setOpen(true), 4000);
    });
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [user]);

  if (!open) return null;
  const close = () => { localStorage.setItem(SNOOZE_KEY, String(Date.now())); setOpen(false); };
  const rate = () => { localStorage.setItem(DONE_KEY, "1"); setOpen(false); window.open(TRUSTPILOT_URL, "_blank", "noopener,noreferrer"); };

  return (
    <div role="dialog" aria-label={tr("Rate us")} className="rating-prompt">
      <button type="button" onClick={close} aria-label={tr("Close")} className="rating-prompt-close"><X className="h-4 w-4" /></button>
      <div className="text-2xl">🎉</div>
      <h3 className="font-display text-base font-extrabold">{tr("Your order is complete!")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{tr("How was your experience with Apex SMM World? Tap a star to rate us.")}</p>
      <div className="mt-3 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={rate} aria-label={`${i} ★`} className="rating-prompt-star"><Star className="h-8 w-8 fill-current" /></button>
        ))}
      </div>
      <button type="button" onClick={rate} className="rating-gold-btn mt-3 w-full">{tr("Rate on Trustpilot")}</button>
    </div>
  );
}
