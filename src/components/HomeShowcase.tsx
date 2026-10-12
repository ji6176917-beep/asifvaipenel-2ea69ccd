import { Link } from "@tanstack/react-router";
import { ArrowRight, Headphones, ShieldCheck, UsersRound, ClipboardCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import growthImage from "@/assets/social-growth.jpg";

export function HomeShowcase() {
  const { t, tr, lang } = useI18n();
  const { user } = useAuth();
  const title = t("home.hero_title").replace(/[*_#`]/g, "");
  const highlight = "Unbeatable Prices!";
  const parts = title.split(highlight);
  const stats = [
    { icon: UsersRound, value: "100K+", label: "Happy Customers" },
    { icon: ClipboardCheck, value: "5M+", label: "Orders Completed" },
    { icon: ShieldCheck, value: "99.9%", label: "Success Rate" },
    { icon: Headphones, value: "24/7", label: "Support" },
  ];
  return (
    <section className="home-welcome">
      <div className="home-hero-grid">
        <div className="home-hero-copy">
          <div className="home-feature-badge"><Zap aria-hidden="true" />{t("home.badge")}</div>
          <p className="home-eyebrow">{tr("WELCOME TO APEX SMM WORLD")}</p>
          <h1 className="home-headline">{lang === "en" && parts.length === 2 ? <>{parts[0]}<span>{highlight}</span>{parts[1]}</> : title}</h1>
          <p className="home-description">{t("home.hero_text")}</p>
          <div className="home-actions">
            <Button asChild className="home-primary-cta"><Link to={user ? "/order" : "/sign-up"}>{tr("Get Started")}<ArrowRight /></Link></Button>
            <Button asChild variant="outline" className="home-secondary-cta"><a href="#popular-services">{tr("View Services")}</a></Button>
          </div>
        </div>
        <div className="home-growth-art"><img src={growthImage} alt={tr("Social media growth dashboard with Instagram, TikTok, Facebook, YouTube and Telegram")} width={1024} height={1024} fetchPriority="high" /></div>
      </div>
      <div className="home-trust-strip">
        {stats.map(({ icon: Icon, value, label }) => <div className="home-trust-item" key={label}><span className="home-trust-icon"><Icon aria-hidden="true" /></span><div><strong>{value}</strong><span>{tr(label)}</span></div></div>)}
      </div>
    </section>
  );
}