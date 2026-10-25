import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { telegramUrl } from "@/lib/format";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { settingsQuery } from "@/lib/queries";
import { TelegramIcon } from "@/lib/brand";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { StrengthBar } from "@/components/StrengthBar";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Forgot Password | Apex SMM World" },
    { name: "description", content: "Recover your Apex SMM World account with an emailed verification code." },
    { property: "og:title", content: "Forgot Password | Apex SMM World" },
    { property: "og:description", content: "Verify your email code and choose a new password." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Forgot,
});

export function Forgot() {
  const tr = useTr();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const { data: s } = useQuery(settingsQuery);
  const supportUrl = telegramUrl(s?.telegram);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { toast.error(tr("Enter a valid email")); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) { toast.error(tr("Unable to send the verification code. Please try again later.")); return; }
      setCode("");
      setRecoveryUserId(null);
      setStep("code");
    } catch {
      toast.error(tr("Unable to send the verification code. Please try again later."));
    } finally { setBusy(false); }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6,8}$/.test(code.trim())) { toast.error(tr("Enter the verification code from your email")); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "recovery" });
      if (error || !data.session || !data.user) {
        toast.error(tr("Invalid or expired code. Please try again or request a new code."));
        return;
      }
      setRecoveryUserId(data.user.id);
      setCode("");
      setStep("password");
    } catch {
      toast.error(tr("Unable to verify the code. Please try again."));
    } finally { setBusy(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || step !== "password" || !recoveryUserId) return;
    if (pw.length < 8) { toast.error(tr("At least 8 characters")); return; }
    if (pw !== cf) { toast.error(tr("Passwords do not match")); return; }
    setBusy(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || data.user?.id !== recoveryUserId) {
        setRecoveryUserId(null); setPw(""); setCf(""); setStep("email");
        toast.error(tr("Your reset session has expired. Please request a new code."));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { toast.error(tr("Unable to update your password. Please try a different password or request a new code.")); return; }
      setRecoveryUserId(null); setPw(""); setCf("");
      toast.success(tr("Password updated"));
      navigate({ to: "/" });
    } catch {
      toast.error(tr("Unable to update your password. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageTitle>{tr("Forgot Password")}</PageTitle>
      <Card>
        <h2 className="label-premium mb-3 text-lg">{tr(step === "email" ? "Reset by Email" : step === "code" ? "Verification Code" : "Set new password")}</h2>
        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div><label className={labelCls} htmlFor="em">{tr("Email")}</label><input required id="em" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} /></div>
            <Button type="submit" disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Send verification code")}</Button>
          </form>
        ) : step === "code" ? (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="break-words text-sm text-muted-foreground">{tr("If this email has an account, a verification code has been sent to")} <b>{email.trim()}</b></p>
            <div><label className={labelCls} htmlFor="otp">{tr("Verification Code")}</label><input required id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} /></div>
            <Button type="submit" disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Verify code")}</Button>
            <Button type="button" variant="link" disabled={busy} onClick={() => { setStep("email"); setCode(""); }} className="w-full">{tr("Resend code")}</Button>
          </form>
        ) : (
          <form onSubmit={savePassword} className="space-y-4">
            <div><label className={labelCls} htmlFor="new-password">{tr("New Password")}</label><input required id="new-password" type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} disabled={busy} /><StrengthBar value={pw} /></div>
            <div><label className={labelCls} htmlFor="confirm-password">{tr("Confirm Password")}</label><input required id="confirm-password" type="password" autoComplete="new-password" className={inputCls} value={cf} onChange={(e) => setCf(e.target.value)} disabled={busy} /></div>
            <Button type="submit" disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Change Password")}</Button>
          </form>
        )}
      </Card>
      {supportUrl && <a href={supportUrl} target="_blank" rel="noreferrer" className="btn-ghost-glow w-full"><TelegramIcon className="h-5 w-5" /> {tr("Contact Support on Telegram")}</a>}
    </div>
  );
}
