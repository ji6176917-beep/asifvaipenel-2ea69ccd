import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Lock, RotateCcw, Code2, ShieldCheck, Clock, Ban, Wallet, MessageCircle, ShoppingCart } from "lucide-react";
import { CmsPage } from "@/components/CmsPage";
import { FeatureBanners } from "@/components/FeatureBanners";
import { useTr } from "@/lib/i18n";
import shieldArt from "@/assets/support-headset.png";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy, Terms & Refunds | Premium Apex SMM World" },
      { name: "description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:title", content: "Policy, Terms & Refunds | Premium Apex SMM World" },
      { property: "og:description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const LINKS = [
  { s: "terms", l: "Terms of Service", d: "Rules for using our panel and services.", icon: FileText },
  { s: "privacy", l: "Privacy Policy", d: "How we keep your data safe and private.", icon: Lock },
  { s: "refund", l: "Refund & Delivery Policy", d: "When and how refunds are added to your balance.", icon: RotateCcw },
  { s: "api-policy", l: "API Policy", d: "Fair use rules for the Reseller API.", icon: Code2 },
];
const POINTS = [
  { icon: ShieldCheck, t: "No passwords needed", d: "We only need a public link. Never share your social media password." },
  { icon: RotateCcw, t: "Automatic refunds", d: "Canceled or partial orders are refunded to your balance automatically." },
  { icon: Clock, t: "Delivery time", d: "Start times are estimates and may change with platform updates." },
  { icon: Ban, t: "Public links only", d: "Private, deleted or changed links cannot be delivered or refunded." },
  { icon: Wallet, t: "Balance use", d: "Deposited balance is used for services on this site and is not withdrawable." },
  { icon: MessageCircle, t: "Support", d: "Open a ticket with your Order ID for any problem — we reply 24/7." },
];

function Page() {
  const tr = useTr();
  return (
    <div className="space-y-5">
      <section className="page-banner page-banner--multi"><div className="relative z-10"><h1>{tr("Policy, Terms & Refunds")}</h1><p>{tr("Clear rules for orders, payments, refunds and your privacy.")}</p><div className="page-banner-stats"><span>{tr("Safe payments")}</span><span>{tr("Auto refund")}</span><span>{tr("24/7 support")}</span></div></div><img src={shieldArt} alt="" width={816} height={816} /></section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((x) => <Link key={x.s} to="/p/$slug" params={{ slug: x.s }} className="rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary"><x.icon className="mb-2 h-7 w-7 text-primary" /><b>{tr(x.l)}</b><p className="mt-1 text-sm text-muted-foreground">{tr(x.d)}</p></Link>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {POINTS.map((x) => <div key={x.t} className="flex gap-3 rounded-2xl border border-border bg-card p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><x.icon className="h-5 w-5" /></span><div><b>{tr(x.t)}</b><p className="text-sm text-muted-foreground">{tr(x.d)}</p></div></div>)}
      </div>
      <CmsPage slug="policy" fallbackTitle="Policy" />
      <div className="flex flex-wrap justify-center gap-2"><Link to="/order" className="btn-glow !py-2 text-sm"><ShoppingCart className="h-4 w-4" />{tr("New Order")}</Link><Link to="/tickets" className="btn-ghost-glow !py-2 text-sm">{tr("My Tickets")}</Link><Link to="/qna" className="btn-ghost-glow !py-2 text-sm">{tr("QnA")}</Link></div>
      <FeatureBanners items={["support", "qna"]} />
    </div>
  );
}
