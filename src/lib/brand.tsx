import { SiFacebook, SiInstagram, SiYoutube, SiTiktok, SiTelegram, SiWhatsapp, SiBinance, SiTether, SiX, SiSpotify, SiDiscord, SiSnapchat, SiThreads, SiPinterest, SiTwitch, SiSoundcloud, SiReddit, SiKick, SiVk, SiKuaishou, SiShopee, SiQuora, SiTumblr, SiVimeo, SiDailymotion } from "react-icons/si";
import { FaLinkedin, FaGlobe } from "react-icons/fa";
import { useState } from "react";
import { useStorageUrl } from "@/lib/storage-url";
import type { IconType } from "react-icons";

// Brand colors are part of each third-party logo's identity, so they live here
// rather than in the theme tokens.
export const PLATFORM_META: Record<string, { Icon: IconType; color: string }> = {
  facebook: { Icon: SiFacebook, color: "#1877F2" },
  instagram: { Icon: SiInstagram, color: "#E4405F" },
  youtube: { Icon: SiYoutube, color: "#FF0000" },
  tiktok: { Icon: SiTiktok, color: "currentColor" },
  telegram: { Icon: SiTelegram, color: "#26A5E4" },
  twitter: { Icon: SiX, color: "currentColor" },
  spotify: { Icon: SiSpotify, color: "#1DB954" },
  discord: { Icon: SiDiscord, color: "#5865F2" },
  linkedin: { Icon: FaLinkedin, color: "#0A66C2" },
  snapchat: { Icon: SiSnapchat, color: "#F7C600" },
  threads: { Icon: SiThreads, color: "currentColor" },
  pinterest: { Icon: SiPinterest, color: "#BD081C" },
  twitch: { Icon: SiTwitch, color: "#9146FF" },
  whatsapp: { Icon: SiWhatsapp, color: "#25D366" },
  soundcloud: { Icon: SiSoundcloud, color: "#FF5500" },
  reddit: { Icon: SiReddit, color: "#FF4500" },
  kick: { Icon: SiKick, color: "#53FC18" },
  vk: { Icon: SiVk, color: "#0077FF" },
  kwai: { Icon: SiKuaishou, color: "#FF7E00" },
  shopee: { Icon: SiShopee, color: "#EE4D2D" },
  quora: { Icon: SiQuora, color: "#B92B27" },
  tumblr: { Icon: SiTumblr, color: "#36465D" },
  vimeo: { Icon: SiVimeo, color: "#1AB7EA" },
  dailymotion: { Icon: SiDailymotion, color: "#0D0D0D" },
  website: { Icon: FaGlobe, color: "#16A34A" },
  other: { Icon: FaGlobe, color: "#16A34A" },
};

/** Platform logo: uploaded image → built-in brand icon → first-letter badge. */
export function PlatformIcon({ slug, className, logo, name }: { slug: string; className?: string | undefined; logo?: string | null | undefined; name?: string | undefined }) {
  const url = useStorageUrl("logos", logo);
  const m = PLATFORM_META[slug];
  const alt = `${name ?? slug} growth service`;
  if (url) return <img src={url} alt={alt} className={`${className ?? ""} object-contain`} />;
  if (m) return <m.Icon className={className} style={{ color: m.color }} role="img" aria-label={alt} />;
  return (
    <span className={`${className ?? ""} inline-flex items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground`} aria-hidden>
      {(name ?? slug).charAt(0).toUpperCase()}
    </span>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return <SiWhatsapp className={className} aria-hidden />;
}
export function TelegramIcon({ className }: { className?: string }) {
  return <SiTelegram className={className} style={{ color: "#26A5E4" }} aria-hidden />;
}

const METHOD_LOGO: Record<string, { label: string; bg: string; fg: string }> = {
  bkash: { label: "bKash", bg: "#E2136E", fg: "#fff" },
  nagad: { label: "Nagad", bg: "#F6921E", fg: "#fff" },
  rocket: { label: "Rocket", bg: "#8C3494", fg: "#fff" },
};

const KIND_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  binance: { label: "Binance", bg: "#F0B90B", fg: "#1E2026" },
  usdt: { label: "USDT", bg: "#26A17B", fg: "#fff" },
};

function Badge({ name, kind, className }: { name: string; kind: string; className: string }) {
  const m = METHOD_LOGO[name.toLowerCase()] ?? KIND_BADGE[kind] ?? { label: name, bg: "var(--primary)", fg: "var(--primary-foreground)" };
  return (
    <span className={`${className} inline-flex items-center justify-center overflow-hidden rounded-xl px-0.5 text-center text-[10px] font-bold leading-tight`} style={{ background: m.bg, color: m.fg }} aria-hidden>
      {m.label}
    </span>
  );
}

// Bundled CDN copies of current uploaded method logos so they paint instantly; a newly uploaded logo (new path) falls back to the signed URL.
const cachedLogoFiles = import.meta.glob<{ url: string }>("../assets/payments/cached/*.asset.json", { eager: true, import: "default" });
const CACHED_METHOD_LOGOS: Record<string, string> = Object.fromEntries(
  Object.entries(cachedLogoFiles).map(([p, a]) => [`methods/${p.split("/").pop()!.replace(".webp.asset.json", ".jpeg")}`, a.url]),
);

/** Payment method logo: uploaded image (square, contain, white tile) → brand icon → coloured name badge. */
export function MethodLogo({ name, kind, logo, officialLogo, className = "h-10 w-10" }: { name: string; kind: string; logo?: string | null | undefined; officialLogo?: string | undefined; className?: string }) {
  const cached = logo ? CACHED_METHOD_LOGOS[logo] : undefined;
  const url = useStorageUrl("logos", cached ? null : logo) ?? cached;
  const [failed, setFailed] = useState(false);
  if (officialLogo) {
    return <img src={officialLogo} alt={`${name} logo`} className={`${className} shrink-0 object-contain`} />;
  }
  if (url && !failed) {
    return (
      <span className={`${className} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 ring-1 ring-border`}>
        <img src={url} alt="" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      </span>
    );
  }
  if (!logo && kind === "binance") return <SiBinance className={className} style={{ color: "#F0B90B" }} aria-hidden />;
  if (!logo && kind === "usdt") return <SiTether className={className} style={{ color: "#26A17B" }} aria-hidden />;
  return <Badge name={name} kind={kind} className={className} />;
}
