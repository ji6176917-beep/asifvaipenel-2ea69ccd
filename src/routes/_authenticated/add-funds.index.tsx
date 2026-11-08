import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitCustomerDeposit } from "@/lib/customer-activity.functions";
import { ArrowLeft, ArrowRight, Clock, Globe, ImagePlus, ShieldCheck, Wallet } from "lucide-react";
import { SiBinance, SiTether } from "react-icons/si";
import { Button } from "@/components/ui/button";
import fundsHeader from "@/assets/funds-header.jpg";
import fundsSocialBanner from "@/assets/funds-social-banner.jpg";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { MethodLogo, TelegramIcon, WhatsAppIcon } from "@/lib/brand";
import { SupportAdminButton } from "@/components/SupportAdmin";
import { friendlyError, money, newIdemKey, whatsappUrl } from "@/lib/format";
import { Copyable, Empty, ErrorState, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { useTr } from "@/lib/i18n";
import bkashLogo from "@/assets/payments/bkash.png.asset.json";
import nagadLogo from "@/assets/payments/nagad.png.asset.json";
import rocketLogo from "@/assets/payments/rocket.png.asset.json";

const officialPaymentLogos = [
  { pattern: /bkash|বিকাশ/i, url: bkashLogo.url },
  { pattern: /nagad|নগদ/i, url: nagadLogo.url },
  { pattern: /rocket|রকেট/i, url: rocketLogo.url },
];

function DepositMethodLogo(props: React.ComponentProps<typeof MethodLogo>) {
  const officialLogo = props.kind === "p2p"
    ? officialPaymentLogos.find(({ pattern }) => pattern.test(props.name))?.url
    : undefined;
  return <MethodLogo {...props} officialLogo={officialLogo} />;
}

export const Route = createFileRoute("/_authenticated/add-funds/")({
  head: () => ({
    meta: [
      { title: "Add Funds | Premium Apex SMM World" },
      { name: "description", content: "Top up your wallet with Binance, USDT, bKash, Nagad or Rocket." },
      { property: "og:title", content: "Add Funds | Premium Apex SMM World" },
      { property: "og:description", content: "Top up your wallet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddFunds,
});

type PM = Tables<"payment_methods">;

async function compress(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = img.width * scale; c.height = img.height * scale;
  const context = c.getContext("2d");
  if (!context) return file;
  context.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/webp", 0.82));
}

function AddFunds() {
  const createDeposit = useServerFn(submitCustomerDeposit);
  const tr = useTr();
  const { user, verified } = useAuth();
  const { data: s } = useQuery(settingsQuery);
  const { data: methods, isLoading, isError } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods").select("*").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const [group, setGroup] = useState<"binance" | "usdt" | "p2p" | null>(null);
  const [m, setM] = useState<PM | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const waBase = whatsappUrl(s?.whatsapp);
  const waOthers = waBase ? `${waBase}?text=${encodeURIComponent("Hello Admin, I want to add funds using other payment methods. Please help me.")}` : null;
  const [amount, setAmount] = useState("");
  const [txn, setTxn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const idem = useRef(newIdemKey());

  const rate = Number(s?.bdt_rate ?? 130);
  const amt = Number(amount || 0);
  const minA = Math.max(Number(m?.min_amount ?? 0), Number(s?.deposit_min ?? 0));
  const maxA = Math.min(Number(m?.max_amount ?? Infinity), Number(s?.deposit_max ?? Infinity));
  const needShot = !!s?.require_screenshot;
  const groups = (["binance", "usdt", "p2p"] as const).filter((g) => methods?.some((x) => x.kind === g));
  const p2p = methods?.filter((x) => x.kind === "p2p") ?? [];

  const pickGroup = (g: "binance" | "usdt" | "p2p") => {
    setGroup(g);
    const list = methods?.filter((x) => x.kind === g) ?? [];
    setM(list.length === 1 ? list[0] ?? null : null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m || !user) return;
    if (!verified) { toast.error(tr("Please verify your email first.")); return; }
    if (!(amt >= minA && amt <= maxA)) { toast.error(`${tr("Amount must be")} ${money(minA)}–${money(maxA)}`); return; }
    if (needShot && !file) { toast.error(tr("Please upload the payment screenshot")); return; }
    if (txn.trim().length < 4) { toast.error(tr("Enter the Transaction ID")); return; }
    setBusy(true);
    let path: string | null = null;
    if (file) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) { setBusy(false); { toast.error(tr("Screenshot must be JPG/PNG/WEBP under 5 MB")); return; } }
      const blob = await compress(file);
      path = `${user.id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("payment-proofs").upload(path, blob, { contentType: "image/webp" });
      if (error) { setBusy(false); { toast.error(tr("Screenshot upload failed")); return; } }
    }
    let response;
    try {
      response = await createDeposit({ data: { methodId: m.id, amount: amt, transactionId: txn.trim(), screenshotPath: path, idempotencyKey: idem.current } });
    } catch {
      setBusy(false);
      toast.error(friendlyError());
      return;
    }
    const { result: data, error } = response;
    setBusy(false);
    if (error) { toast.error(friendlyError(error)); return; }
    if (!data) return;
    idem.current = newIdemKey();
    setDone((data as { code: string }).code);
  };

  return (
    <div className="funds-reference">
      {!group && <>
      <section className="funds-hero">
        <img src={fundsHeader} alt="" width={1920} height={640} className="funds-hero-image" />
        <div className="funds-hero-copy">
          <h1><Wallet aria-hidden /> {tr("Add")} <span>{tr("Funds")}</span></h1>
          <p>{tr("Choose your preferred payment method and top up your account to continue using our services.")}</p>
        </div>
        <div className="funds-security"><ShieldCheck aria-hidden /><div><strong>{tr("Secure Payments")}</strong><span>{tr("Your transactions are safe with us.")}</span></div></div>
      </section>
      <div className="funds-section-heading"><span><Wallet aria-hidden /></span><div><h2>{tr("Select Payment Method")}</h2><p>{tr("Choose from the available payment options below")}</p></div></div>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-36 rounded-lg" />}
      {methods && groups.length === 0 && <Empty text={tr("No payment methods available right now.")} />}

      <div className="funds-method-grid">
          {groups.map((g) => (
            <Button variant="ghost" key={g} onClick={() => pickGroup(g)} aria-label={g === "p2p" ? tr("BDT P2P") : g === "usdt" ? "USDT" : "Binance Pay"} aria-pressed={group === g} className={`funds-method funds-method--${g}`}>
              {g === "p2p" ? (
                <><span className="funds-crypto-logo funds-crypto-logo--p2p"><span aria-hidden>৳</span></span><div className="funds-method-copy"><strong>{tr("BDT P2P")}</strong><div className="funds-local-logos">{p2p.slice(0, 3).map((x) => <div key={x.id} className="funds-local-chip"><DepositMethodLogo name={x.name} kind="p2p" logo={x.logo_url} className="funds-local-logo" /></div>)}</div></div></>
              ) : <><span className={`funds-crypto-logo funds-crypto-logo--${g}`}>{g === "binance" ? <SiBinance aria-hidden /> : <SiTether aria-hidden />}</span><div className="funds-method-copy"><strong>{g === "usdt" ? "USDT" : tr("Binance Pay")}</strong></div></>}
              <span className="funds-method-arrow"><ArrowRight aria-hidden /></span>
            </Button>
          ))}
          {groups.length > 0 && (
            <Button variant="ghost" onClick={() => setOthersOpen(true)} aria-label={tr("Other Payments")} className="funds-method funds-method--others">
              <span className="funds-crypto-logo funds-crypto-logo--others"><Globe aria-hidden /></span><div className="funds-method-copy"><strong>{tr("Other Payments")}</strong></div>
              <span className="funds-method-arrow"><ArrowRight aria-hidden /></span>
            </Button>
          )}
      </div>
      <Dialog open={othersOpen} onOpenChange={setOthersOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary"><Globe className="h-9 w-9" aria-hidden /></div>
          <DialogTitle className="text-xl font-extrabold">{tr("Other Payments")}</DialogTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">{tr("You can add funds using any local payment method from any country in the world. Just contact our admin — it's 100% safe and reliable.")}</p>
          {waOthers ? (
            <a href={waOthers} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-success px-5 py-3 font-bold text-primary-foreground shadow-glow transition hover:opacity-90">
              <WhatsAppIcon className="h-5 w-5" /> {tr("Connect Admin on WhatsApp")}
            </a>
          ) : <p className="text-xs text-muted-foreground">{tr("WhatsApp support is not available right now.")}</p>}
        </DialogContent>
      </Dialog>
      </>}

      {group && (
        <section className="funds-form-section">
          <Button variant="ghost" onClick={() => { setGroup(null); setM(null); window.scrollTo({ top: 0, behavior: "instant" }); }} className="mb-4 gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> {tr("Change method")}</Button>

          {(methods?.filter((x) => x.kind === group).length ?? 0) > 1 && (
            <div className="mb-5 grid grid-cols-3 gap-2">
              {methods?.filter((x) => x.kind === group).map((x) => (
                <Button variant="outline" key={x.id} onClick={() => setM(x)} aria-pressed={m?.id === x.id} className={`h-auto flex-col gap-1.5 rounded-lg border p-3 transition ${m?.id === x.id ? "border-primary bg-primary/10 shadow-glow" : "border-border"}`}>
                  <DepositMethodLogo name={x.name} kind={x.kind} logo={x.logo_url} className="h-10 w-12" />
                  <span className="text-xs font-semibold">{x.name}</span>
                </Button>
              ))}
            </div>
          )}

          {m && (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
                <DepositMethodLogo name={m.name} kind={m.kind} logo={m.logo_url} className="h-12 w-12" />
                <div className="min-w-0">
                  <div className="label-premium">{m.name}{m.network ? ` • ${m.network}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{m.kind === "binance" ? tr("Binance ID") : m.kind === "usdt" ? tr("Wallet address") : `${tr("Number")} (${m.account_type ?? tr("Personal")})`}</div>
                  <Copyable value={m.account} className={m.kind === "usdt" ? "text-xs" : "text-base font-bold"} />
                </div>
              </div>
              {m.instructions && <p className="whitespace-pre-line rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">{m.instructions}</p>}
              <div>
                <label className={labelCls} htmlFor="amt">{tr("Amount (USD)")}</label>
                <input id="amt" inputMode="decimal" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} />
                <p className="mt-1 text-xs text-muted-foreground">{tr("Min")} {money(minA)} — {tr("Max")} {money(maxA)}</p>
              </div>
              {m.kind === "p2p" && (
                <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center">
                  <div className="text-xs text-muted-foreground">{tr("Send exactly (rate")} ৳{rate}/USD)</div>
                  <div className="text-gradient font-display text-4xl font-extrabold">৳{(Math.round(amt * rate * 100) / 100).toFixed(2)}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{tr("Send exactly this amount via Send Money, then enter the Transaction ID.")}</p>
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="txn">{tr("Transaction ID")}</label>
                <input id="txn" className={inputCls} value={txn} onChange={(e) => setTxn(e.target.value)} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground hover:border-primary">
                <ImagePlus className="h-5 w-5 text-primary" />
                {file ? file.name : `${tr("Upload payment screenshot")}${needShot ? ` (${tr("required")})` : ` (${tr("optional")})`}`}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button type="submit" disabled={busy} className="btn-glow h-auto w-full !py-4">{busy && <Spinner />} {m.kind === "p2p" ? tr("Confirm Add Funds") : tr("Add Funds")}</Button>
            </form>
          )}
        </section>
      )}

      {!group && <img src={fundsSocialBanner} alt={tr("Social media growth services")} width={1920} height={640} loading="lazy" className="funds-social-banner" />}

      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="text-center">
          <Clock className="mx-auto h-14 w-14 text-warning" />
          <DialogTitle className="text-gradient text-2xl">{tr("Add Funds Submitted – Pending")}</DialogTitle>
          {done && <Copyable value={done} className="mx-auto text-lg font-bold" />}
          <p className="text-sm text-muted-foreground">{tr("Your request is pending admin approval.")}</p>
          <div className="mt-2 grid gap-2">
            <Link to="/" className="btn-glow">{tr("Go to Home")}</Link>
            {s?.telegram && <SupportAdminButton className="btn-ghost-glow"><TelegramIcon className="h-4 w-4" /> {tr("Support Admin")}</SupportAdminButton>}
            <Link to="/order" className="btn-ghost-glow">{tr("Buy Service")}</Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
