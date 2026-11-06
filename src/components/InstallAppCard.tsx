import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Card } from "@/components/ui-kit";
import { useTr } from "@/lib/i18n";
import { installApp, isIOS, isStandalone, useInstallAvailable } from "@/lib/pwa-install";

/**
 * "Add to Home Screen" card for the Account page.
 * Android/Chrome gets a real install button; iOS gets the Share-sheet steps.
 */
export function InstallAppCard() {
  const tr = useTr();
  const available = useInstallAvailable();
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIOS());
  }, []);

  if (installed || (!available && !ios)) return null;

  return (
    <Card className="flex items-center gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Smartphone className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{tr("Install this app")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {available
            ? tr("Add Apex SMM World to your home screen for full-screen access.")
            : tr("Tap Share, then Add to Home Screen to install Apex SMM World.")}
        </p>
      </div>
      {available && (
        <button
          onClick={() => void installApp()}
          className="btn-glow inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" /> {tr("Install")}
        </button>
      )}
    </Card>
  );
}
