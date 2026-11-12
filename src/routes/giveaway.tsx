import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Gift, Trophy, ArrowRight, BadgeCheck } from "lucide-react";
import { giveawayQuery } from "@/lib/community-queries";
import { type GiveawayTask } from "@/lib/community";
import { useAuth } from "@/lib/auth";
import { useTr } from "@/lib/i18n";
import { PlatformIcon } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import gift from "@/assets/giveaway-gift.png";

export const Route = createFileRoute("/giveaway")({
  loader: ({ context }) => context.queryClient.ensureQueryData(giveawayQuery),
  head: () => ({ meta: [{ title: "Giveaway | Apex SMM World" }, { name: "description", content: "Discover Apex SMM World giveaway tasks, rewards and participation rules." }, { property: "og:title", content: "Giveaway | Apex SMM World" }, { property: "og:description", content: "Explore social tasks and submit your original work for review." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Giveaway,
});
export function Lines({ text }: { text: string }) {
  return <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted-foreground">{text.split("\n").filter(Boolean).map((line, i) => <li key={i}>{line}</li>)}</ul>;
}
function Giveaway() {
  const { data: config } = useSuspenseQuery(giveawayQuery);
  const tr = useTr(); const { user } = useAuth();
  const [task, setTask] = useState<GiveawayTask | null>(null);
  const reward = (t: GiveawayTask) => `${t.currency === "USD" ? "$" : "৳"}${t.reward.toLocaleString()}`;
  return <div className="community-page">
    <section className="community-banner"><div><h1>{tr(config.title)}</h1><p>{tr(config.description)}</p></div><img src={gift} alt="" width={816} height={816} /></section>
    <section className="giveaway-grid">{config.tasks.map((t) => <article key={t.id} className="giveaway-task">
      <div className="flex items-center justify-center gap-3"><PlatformIcon slug={t.platform} className="h-9 w-9 shrink-0" /><h2 className="text-base font-bold">{tr(t.title)}</h2></div>
      <p className="mt-5 text-sm text-muted-foreground">{tr(t.summary)}</p><strong className="mt-2 block text-xl text-primary">{reward(t)} {tr("Balance")}</strong>
      <Button className="mt-6 w-full rounded-md" onClick={() => setTask(t)}>{tr("Learn More")}<ArrowRight /></Button>
    </article>)}</section>
    {!config.tasks.length && <p className="py-10 text-center text-muted-foreground">{tr("No giveaways available right now.")}</p>}
    <section className="giveaway-rules"><div className="giveaway-rules-art"><img src={gift} alt="" width={816} height={816} loading="lazy" /><Trophy className="h-12 w-12 text-warning" /></div><div><h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-primary"><BadgeCheck />{tr("General Rules")}</h2><Lines text={tr(config.rules)} /></div></section>
    <section className="giveaway-participation"><h2 className="text-xl font-bold">{tr("How to Participate")}</h2><div className="giveaway-steps">{config.steps.map((s, i) => <div key={i}><span>{String(i + 1).padStart(2, "0")}</span><p>{tr(s)}</p></div>)}</div></section>
    <Dialog open={!!task} onOpenChange={(o) => !o && setTask(null)}><DialogContent className="giveaway-dialog sm:max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-3">{task && <PlatformIcon slug={task.platform} className="h-7 w-7" />}{task && tr(task.title)}</DialogTitle></DialogHeader>
      {task && <><div className="giveaway-dialog-body"><h3 className="mb-3 font-bold">{tr("How It Works")}</h3><Lines text={tr(task.how)} /><h3 className="mb-3 mt-5 flex items-center gap-2 font-bold"><Gift className="h-4 w-4 text-warning" />{tr("Reward")}</h3><p className="font-bold text-primary">{reward(task)} {tr("Balance")}</p><h3 className="mb-3 mt-5 font-bold">{tr("Conditions")}</h3><Lines text={tr(task.conditions)} /></div>
      <Button asChild className="w-full rounded-md">{user ? <Link to="/tickets" search={{ task: task.id }}>{tr("Submit Your Proof")}</Link> : <Link to="/sign-in" search={{ redirect: `/tickets?task=${encodeURIComponent(task.id)}` }}>{tr("Sign in to submit proof")}</Link>}</Button></>}
    </DialogContent></Dialog>
  </div>;
}