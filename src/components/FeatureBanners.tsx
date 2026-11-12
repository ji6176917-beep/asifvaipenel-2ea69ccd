import { Link } from "@tanstack/react-router";
import { useTr } from "@/lib/i18n";
import giftArt from "@/assets/giveaway-gift.png";
import supportArt from "@/assets/support-headset.png";
import boxArt from "@/assets/orders-box.png";
import growthArt from "@/assets/social-growth.webp";
import qnaArt from "@/assets/qna-help.png";

type Key = "giveaway" | "tracking" | "order" | "support" | "qna";
const ITEMS: Record<Key, { to: string; art: string; title: string; text: string; cta: string; soft?: boolean }> = {
  giveaway: { to: "/giveaway", art: giftArt, title: "Giveaway", text: "Complete social tasks and submit your proof for a balance reward.", cta: "Join now" },
  tracking: { to: "/tickets", art: boxArt, title: "My Tracking & Tickets", text: "Track every order, ask for refill and talk with our support team.", cta: "Open tickets", soft: true },
  order: { to: "/order", art: growthArt, title: "Grow faster", text: "Real social growth services for every platform, delivered quickly.", cta: "New Order", soft: true },
  support: { to: "/tickets", art: supportArt, title: "24/7 support", text: "We are always here to help with orders, payments and refills.", cta: "Get help" },
  qna: { to: "/qna", art: qnaArt, title: "QnA", text: "Answers to the most common questions about orders and payments.", cta: "Read answers", soft: true },
};

export function FeatureBanners({ items, cols = 2 }: { items: Key[]; cols?: 1 | 2 }) {
  const tr = useTr();
  return <div className={`grid gap-4 ${cols === 2 ? "lg:grid-cols-2" : ""}`}>
    {items.map((k) => { const b = ITEMS[k]; return (
      <Link key={k} to={b.to} className={`dash-feature ${b.soft ? "dash-feature--soft" : ""}`}>
        <div className="min-w-0"><h2>{tr(b.title)}</h2><p>{tr(b.text)}</p><span className="dash-cta">{tr(b.cta)} →</span></div>
        <img src={b.art} alt="" loading="lazy" />
      </Link>); })}
  </div>;
}
