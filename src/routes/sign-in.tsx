import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { signInWithIdentifier } from "@/lib/sign-in.functions";
import { Card, PageTitle, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { SocialButtons } from "@/components/SocialButtons";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign In | Premium SMM Store" },
      { name: "description", content: "Sign in with your email, phone, User ID or username." },
      { property: "og:title", content: "Sign In | Premium SMM Store" },
      { property: "og:description", content: "Access your wallet and orders." },
    ],
  }),
  component: SignIn,
});

function safePath(p?: string) {
  if (!p) return "/";
  try {
    const u = new URL(p, window.location.origin);
    return u.origin === window.location.origin ? u.pathname + u.search : "/";
  } catch { return "/"; }
}

function SignIn() {
  const { redirect } = Route.useSearch();
  const tr = useTr();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const signIn = useServerFn(signInWithIdentifier);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id.trim().length < 3 || !pw) { toast.error(tr("Enter your login and password")); return; }
    setBusy(true);
    try {
      const r = await signIn({ data: { identifier: id.trim(), password: pw } });
      if (!r.ok) { toast.error(r.error); return; }
      const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token });
      if (error) { toast.error(tr("Sign in failed")); return; }
      toast.success(tr("Welcome back!"));
      navigate({ to: safePath(redirect) });
    } catch {
      toast.error(tr("Sign in failed. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md">
      <PageTitle sub={tr("Welcome back.")}>{tr("Sign In")}</PageTitle>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls} htmlFor="id">{tr("Email / Phone / User ID / Username")}</label>
            <input id="id" className={inputCls} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className={labelCls} htmlFor="pw">{tr("Password")}</label>
            <div className="relative">
              <input id="pw" type={show ? "text" : "password"} className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
              <button type="button" aria-label={tr("Show password")} onClick={() => setShow(!show)} className="absolute right-3 top-3.5 text-muted-foreground">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
            </div>
          </div>
          <div className="text-right"><Link to="/forgot-password" className="text-sm text-primary">{tr("Forgot password?")}</Link></div>
          <button disabled={busy} className="btn-glow w-full">{busy && <Spinner />} {tr("Sign In")}</button>
        </form>
        <SocialButtons />
        <p className="mt-5 text-center text-sm text-muted-foreground">{tr("New here?")} <Link to="/sign-up" className="font-semibold text-primary">{tr("Create account")}</Link></p>
      </Card>
    </div>
  );
}
