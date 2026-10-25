import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { telegramUrl } from "@/lib/format";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { TelegramIcon } from "@/lib/brand";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { StrengthBar } from "@/components/StrengthBar";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password | Premium Apex SMM World" },
      { name: "description", content: "Reset your password by email or contact support on Telegram." },
      { property: "og:title", content: "Forgot Password | Premium Apex SMM World" },
      { property: "og:description", content: "Recover access to your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const tr = useTr();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const { data: s } = useQuery(settingsQuery);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error(tr("Enter a valid email")); return; }
    setBusy(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setStep("code");
  };

  const resetWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) { toast.error(tr("Enter the verification code from your email")); return; }
    if (pw.length < 8) { toast.error(tr("At least 8 characters")); return; }
    if (pw !== cf) { toast.error(tr("Passwords do not match")); return; }
    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
    if (vErr) {
      setBusy(false);
      toast.error(tr("Invalid or expired code. Please try again or request a new code."));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(tr("Password updated"));
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle>{tr("Forgot Password")}</PageTitle>
      <Card>
        <h2 className="label-premium mb-3 text-lg">{tr("Reset by Email")}</h2>
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div><label className={labelCls} htmlFor="em">{tr("Email")}</label><input id="em" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Send verification code")}</button>
          </form>
        ) : (
          <form onSubmit={resetWithCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">{tr("We sent a verification code to")} <b>{email}</b>. {tr("Enter it below with your new password.")}</p>
            <div>
              <label className={labelCls} htmlFor="otp">{tr("Verification Code")}</label>
              <input id="otp" inputMode="numeric" autoComplete="one-time-code" className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            </div>
            <div>
              <label className={labelCls}>{tr("New Password")}</label>
              <input type="password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
              <StrengthBar value={pw} />
            </div>
            <div>
              <label className={labelCls}>{tr("Confirm Password")}</label>
              <input type="password" className={inputCls} value={cf} onChange={(e) => setCf(e.target.value)} />
            </div>
            <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Change Password")}</button>
            <button type="button" onClick={() => setStep("email")} className="w-full text-center text-sm text-primary underline">{tr("Resend code")}</button>
          </form>
        )}
      </Card>
      {s?.telegram && (
        <a href={telegramUrl(s.telegram)!} target="_blank" rel="noreferrer" className="btn-ghost-glow w-full">
          <TelegramIcon className="h-5 w-5" /> {tr("Contact Support on Telegram")}
        </a>
      )}
    </div>
  );
}
