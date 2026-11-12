import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Zap, Headphones, RefreshCcw, ShoppingCart, Wallet, MessageCircleQuestion, Ticket } from "lucide-react";
import { CmsPage } from "@/components/CmsPage";
import { useTr } from "@/lib/i18n";
import welcomeArt from "@/assets/welcome-social.png";
import growthArt from "@/assets/social-growth.webp";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Premium Apex SMM World" },
      { name: "description", content: "Who we are and how we deliver." },
      { property: "og:title", content: "About Us | Premium Apex SMM World" },
      { property: "og:description", content: "Who we are and how we deliver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  const tr = useTr();
  const why = [
    { i: Zap, t: tr("Fast delivery"), d: tr("Most orders start within minutes.") },
    { i: ShieldCheck, t: tr("Safe & secure"), d: tr("We never ask for your passwords.") },
    { i: RefreshCcw, t: tr("Auto refund"), d: tr("Undelivered amount returns to your balance.") },
    { i: Headphones, t: tr("24/7 support"), d: tr("Real people ready to help any time.") },
  ];
  const links = [
    { to: "/order", i: ShoppingCart, l: tr("New Order") }, { to: "/add-funds", i: Wallet, l: tr("Add Funds") },
    { to: "/qna", i: MessageCircleQuestion, l: tr("QnA") }, { to: "/tickets", i: Ticket, l: tr("My Tickets") },
  ] as const;
  return (
    <div className="space-y-5">
      <section className="page-banner page-banner--multi"><div className="relative z-10"><h1>{tr("About Us")}</h1><p>{tr("Apex SMM World helps creators and businesses grow on every social platform.")}</p><div className="page-banner-stats"><span>{tr("Live status")}</span><span>{tr("Auto refund")}</span><span>{tr("24/7 support")}</span></div></div><div className="banner-art-stack"><img src={welcomeArt} alt="" /><img src={growthArt} alt="" /></div></section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{why.map((w) => <div key={w.t} className="profile-art-card !items-start !text-left"><w.i className="h-7 w-7 text-primary" /><b>{w.t}</b><span>{w.d}</span></div>)}</div>
      <CmsPage slug="about" fallbackTitle="About Us" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{links.map((s) => <Link key={s.to} to={s.to} className="profile-shortcut"><s.i className="h-6 w-6 text-primary" /><span>{s.l}</span></Link>)}</div>
    </div>
  );
}
