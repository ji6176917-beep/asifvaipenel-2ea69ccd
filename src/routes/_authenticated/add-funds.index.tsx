import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { MethodLogo, TelegramIcon } from "@/lib/brand";
import { SupportAdminButton } from "@/components/SupportAdmin";
import { friendlyError, money, newIdemKey } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/add-funds/")({
  head: () => ({
    meta: [
      { title: "Add Funds | Premium Apex SMM World" },
      { name: "description", content: "Top up your wallet with Binance, USDT, bKash, Nagad or Rocket." },
      { property: "og:title", content: "Add Funds | Premium Apex SMM World" },
      { property: "og:description", content: "Top up your wallet." },
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
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b ?? file), "image/webp", 0.82));
}

function AddFunds() {
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
    const list = methods!.filter((x) => x.kind === g);
    setM(list.length === 1 ? list[0]! : null);
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
    const { data, error } = await supabase.rpc("create_deposit", { _method_id: m.id, _amount: amt, _txn: txn.trim(), _screenshot: path as string, _idem: idem.current });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    idem.current = newIdemKey();
    setDone((data as { code: string }).code);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle sub={group ? undefined : tr("Select Payment Method")}>{tr("Add Funds")}</PageTitle>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-40 rounded-3xl" />}
      {methods && groups.length === 0 && <Empty text={tr("No payment methods available right now.")} />}

      {!group && (
        <div className="grid gap-3">
          {groups.map((g) => (
            <button key={g} onClick={() => pickGroup(g)} className="glass tilt flex items-center gap-4 rounded-3xl p-4 text-left">
              {g === "p2p" ? (
                <div className="flex -space-x-2">{p2p.slice(0, 3).map((x) => <MethodLogo key={x.id} name={x.name} kind="p2p" logo={x.logo_url} className="h-10 w-10" />)}</div>
              ) : <MethodLogo name={g} kind={g} logo={methods?.find((x) => x.kind === g)?.logo_url} className="h-10 w-10" />}
              <div>
                <div className="label-premium text-lg">{g === "p2p" ? "P2P" : g === "usdt" ? "USDT" : "Binance"}</div>
                <div className="text-xs text-muted-foreground">{g === "p2p" ? p2p.map((x) => x.name).join(" • ") : g === "usdt" ? tr("Crypto wallet transfer") : tr("Binance Pay")}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {group && (
        <Card>
          <button onClick={() => { setGroup(null); setM(null); }} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> {tr("Change method")}</button>

          {(methods?.filter((x) => x.kind === group).length ?? 0) > 1 && (
            <div className="mb-5 grid grid-cols-3 gap-2">
              {methods!.filter((x) => x.kind === group).map((x) => (
                <button key={x.id} onClick={() => setM(x)} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition ${m?.id === x.id ? "border-primary bg-primary/10 shadow-glow" : "border-border"}`}>
                  <MethodLogo name={x.name} kind={x.kind} logo={x.logo_url} className="h-10 w-12" />
                  <span className="text-xs font-semibold">{x.name}</span>
                </button>
              ))}
            </div>
          )}

          {m && (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4">
                <MethodLogo name={m.name} kind={m.kind} logo={m.logo_url} className="h-12 w-12" />
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
              <button disabled={busy} className="btn-glow w-full !py-4">{busy && <Spinner />} {m.kind === "p2p" ? tr("Confirm Add Funds") : tr("Add Funds")}</button>
            </form>
          )}
        </Card>
      )}

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
