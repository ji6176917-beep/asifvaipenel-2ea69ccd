import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveStats } from "@/components/LiveStats";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import growthImage from "@/assets/social-growth.webp";

export function HomeShowcase() {
  const { t, tr, lang } = useI18n();
  const { user } = useAuth();
  const title = t("home.hero_title").replace(/[*_#`]/g, "");
  const highlight = "Unbeatable Prices!";
  const parts = title.split(highlight);
  return (
    <section className="home-welcome">
      <div className="home-hero-grid">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{tr("WELCOME TO APEX SMM WORLD")}</p>
          <h1 className="home-headline">{lang === "en" && parts.length === 2 ? <>{parts[0]}<span>{highlight}</span>{parts[1]}</> : title}</h1>
          <p className="home-description">{t("home.hero_text")}</p>
          <div className="home-actions">
            {user ? (<>
              <Button asChild className="home-primary-cta"><Link to="/order">{tr("Get Started")}<ArrowRight /></Link></Button>
              <Button asChild variant="outline" className="home-secondary-cta"><a href="#popular-services">{tr("View Services")}</a></Button>
            </>) : (<>
              <Button asChild className="home-primary-cta"><Link to="/sign-up">{tr("Sign Up")}<ArrowRight /></Link></Button>
              <Button asChild variant="outline" className="home-secondary-cta"><Link to="/sign-in">{tr("Sign In")}</Link></Button>
            </>)}
          </div>
        </div>
        <div className="home-growth-art"><img src={growthImage} alt={tr("Social media growth dashboard with Instagram, TikTok, Facebook, YouTube and Telegram")} width={640} height={640} loading="eager" decoding="async" fetchPriority="high" /></div>
      </div>
      <LiveStats layout="strip" />
    </section>
  );
}