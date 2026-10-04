import { useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { Spinner } from "@/components/ui-kit";
import { useTr } from "@/lib/i18n";

type Provider = "google" | "apple" | "microsoft";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
      <path d="M17.05 12.54c-.03-2.9 2.37-4.29 2.48-4.36-1.35-1.98-3.46-2.25-4.21-2.28-1.79-.18-3.5 1.06-4.4 1.06-.91 0-2.31-1.03-3.8-1.01-1.95.03-3.75 1.14-4.76 2.88-2.03 3.52-.52 8.74 1.46 11.6.97 1.4 2.12 2.97 3.63 2.91 1.46-.06 2.01-.94 3.77-.94s2.26.94 3.8.91c1.57-.03 2.57-1.42 3.53-2.83 1.11-1.62 1.57-3.19 1.6-3.27-.04-.02-3.07-1.18-3.1-4.67zM14.16 4.06c.8-.97 1.34-2.32 1.19-3.66-1.15.05-2.55.77-3.38 1.74-.74.86-1.39 2.23-1.22 3.55 1.29.1 2.6-.65 3.41-1.63z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#F35325" d="M1 1h10v10H1z" />
      <path fill="#81BC06" d="M13 1h10v10H13z" />
      <path fill="#05A6F0" d="M1 13h10v10H1z" />
      <path fill="#FFBA08" d="M13 13h10v10H13z" />
    </svg>
  );
}

const PROVIDERS: { id: Provider; label: string; icon: () => React.ReactNode }[] = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
  { id: "apple", label: "Continue with Apple", icon: AppleIcon },
  { id: "microsoft", label: "Continue with Microsoft", icon: MicrosoftIcon },
];

export function OAuthButtons() {
  const tr = useTr();
  const [busy, setBusy] = useState<Provider | null>(null);

  const signIn = async (provider: Provider) => {
    setBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(tr("Sign in failed. Please try again."));
        setBusy(null);
        return;
      }
      if (result.redirected) return; // browser navigates away
      toast.success(tr("Welcome back!"));
      window.location.href = "/";
    } catch {
      toast.error(tr("Sign in failed. Please try again."));
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {tr("or continue with")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy !== null}
            onClick={() => signIn(p.id)}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-accent disabled:opacity-60"
          >
            {busy === p.id ? <Spinner /> : <p.icon />}
            {tr(p.label)}
          </button>
        ))}
      </div>
    </div>
  );
}
