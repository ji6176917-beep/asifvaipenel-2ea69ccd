import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { StrengthBar } from "@/components/StrengthBar";
import { useTr } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password | Premium Apex SMM World" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Set New Password | Premium Apex SMM World" },
      { property: "og:description", content: "Choose a new password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reset,
});

export function Reset() {
  const tr = useTr();
  const [pw, setPw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const isRecoveryLink = hash.get("type") === "recovery";
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session?.user) {
        setRecoveryUserId(session.user.id); setChecking(false);
      } else if (event === "SIGNED_OUT") setRecoveryUserId(null);
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (isRecoveryLink && !error && data.user) setRecoveryUserId(data.user.id);
      setChecking(false);
    }).catch(() => { if (active) setChecking(false); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !recoveryUserId) return;
    if (pw.length < 8) { toast.error(tr("At least 8 characters")); return; }
    if (pw !== cf) { toast.error(tr("Passwords do not match")); return; }
    setBusy(true);
    try {
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || data.user?.id !== recoveryUserId) {
        setRecoveryUserId(null);
        toast.error(tr("Your reset session has expired. Please request a new code."));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { toast.error(tr("Unable to update your password. Please try a different password or request a new code.")); return; }
      setRecoveryUserId(null); setPw(""); setCf("");
      toast.success(tr("Password updated"));
      navigate({ to: "/" });
    } catch { toast.error(tr("Unable to update your password. Please try again.")); }
    finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-md">
      <PageTitle>{tr("Set new password")}</PageTitle>
      <Card>
        {checking ? <Spinner /> : recoveryUserId ? <form onSubmit={save} className="space-y-4">
          <div><label className={labelCls} htmlFor="new-password">{tr("New Password")}</label><input required id="new-password" type="password" autoComplete="new-password" disabled={busy} className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} /><StrengthBar value={pw} /></div>
          <div><label className={labelCls} htmlFor="confirm-password">{tr("Confirm Password")}</label><input required id="confirm-password" type="password" autoComplete="new-password" disabled={busy} className={inputCls} value={cf} onChange={(e) => setCf(e.target.value)} /></div>
          <Button type="submit" disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Save")}</Button>
        </form> : <div className="space-y-4"><p className="text-sm text-muted-foreground">{tr("This reset link is invalid or expired. Please request a new code.")}</p><Button asChild className="w-full"><Link to="/forgot-password">{tr("Forgot Password")}</Link></Button></div>}
      </Card>
    </div>
  );
}
