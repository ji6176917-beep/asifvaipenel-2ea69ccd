import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown, Gem, Medal, Shield, Sparkles, Star, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { LEVELS, PERKS, levelFor } from "@/lib/account-levels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ICONS = [Shield, Medal, Star, Gem, Crown, Trophy, Sparkles];

export function useAccountLevel() {
  const { user } = useAuth();
  const { data: total = 0 } = useQuery({
    queryKey: ["account-level-total", user?.id], enabled: !!user, staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("deposits").select("amount").eq("user_id", user!.id).eq("status", "approved").is("deleted_at", null);
      if (error) throw error;
      return (data ?? []).reduce((s, d) => s + Number(d.amount), 0);
    },
  });
  return { total, index: levelFor(total) };
}

export function LevelBadge({ index, size = "md" }: { index: number; size?: "sm" | "md" }) {
  const Icon = ICONS[index] ?? Shield;
  const l = LEVELS[index]!;
  return <span className={`level-badge level-badge-${size}`} style={{ ["--lvl" as string]: l.color }} title={l.name}><Icon /></span>;
}

export function AccountLevelButton({ compact }: { compact?: boolean }) {
  const tr = useTr();
  const { index } = useAccountLevel();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="level-chip" style={{ ["--lvl" as string]: LEVELS[index]!.color }} aria-label={tr("Account levels")}>
      <LevelBadge index={index} size="sm" />{!compact && <span>{tr(LEVELS[index]!.name)}</span>}
    </button>
    <AccountLevelsDialog open={open} onOpenChange={setOpen} />
  </>;
}

export function AccountLevelsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const tr = useTr();
  const { index, total } = useAccountLevel();
  const next = LEVELS[index + 1];
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="levels-dialog max-w-5xl p-0">
      <DialogHeader className="levels-head"><DialogTitle>{tr("Account levels")}</DialogTitle>
        <p>{tr("Total deposited")}: ${total.toFixed(2)}{next ? ` · ${tr("Next level")}: ${tr(next.name)} ($${next.min})` : ""}</p></DialogHeader>
      <div className="levels-scroll"><div className="levels-grid" style={{ gridTemplateColumns: `180px repeat(${LEVELS.length}, minmax(96px, 1fr))` }}>
        <div className="levels-label-col"><div className="levels-cell-head">{tr("Level")}</div>{PERKS.map((p) => <div key={p} className="levels-perk">{tr(p)}</div>)}</div>
        {LEVELS.map((l, i) => <div key={l.key} className={`levels-col ${i === index ? "is-current" : ""}`} style={{ ["--lvl" as string]: l.color }}>
          {i === index && <span className="levels-current">{tr("Current")}</span>}
          <div className="levels-cell-head"><LevelBadge index={i} /><strong>{tr(l.name)}</strong><small>{LEVELS[i + 1] ? `$${l.min}–$${LEVELS[i + 1]!.min}` : `$${l.min}+`}</small></div>
          {PERKS.map((p, n) => <div key={p} className="levels-perk justify-center">{n < Math.min(PERKS.length, 2 + i) ? <Check className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground">—</span>}</div>)}
        </div>)}
      </div></div>
    </DialogContent>
  </Dialog>;
}
