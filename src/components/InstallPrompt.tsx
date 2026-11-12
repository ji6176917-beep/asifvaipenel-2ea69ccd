import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTr } from "@/lib/i18n";
import siteLogo from "@/assets/apex-header-logo.png.asset.json";
import { installApp, isInstallSnoozed, isIOS, isStandalone, readInstallSnooze, snoozeInstall, useInstallAvailable } from "@/lib/pwa-install";

/** Floating "install the app" suggestion. Tapping anywhere outside it dismisses it. */
export function InstallPrompt() {
  const tr = useTr();
  const available = useInstallAvailable();
  const [ready, setReady] = useState(false);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isStandalone() || isInstallSnoozed(readInstallSnooze())) return;
    setIos(isIOS());
    const id = window.setTimeout(() => setReady(true), 2500);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => { if (ready && (available || ios)) setOpen(true); }, [ready, available, ios]);

  if (!open) return null;
  const close = () => { snoozeInstall(); setOpen(false); };

  return (
    <>
      <button type="button" aria-label={tr("Close")} className="fixed inset-0 z-[70] cursor-default bg-transparent" onClick={close} />
      <div role="dialog" aria-label={tr("Install this app")} className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[71] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl animate-in slide-in-from-bottom-4 lg:inset-x-auto lg:bottom-6 lg:right-6">
        <img src={siteLogo.url} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Apex SMM World App</p>
          <p className="text-xs text-muted-foreground">{ios ? tr("Tap Share, then Add to Home Screen to install Apex SMM World.") : tr("Install for faster ordering from your home screen.")}</p>
        </div>
        {available && <Button size="sm" className="shrink-0 rounded-full" onClick={async () => { const r = await installApp(); if (r !== "accepted") snoozeInstall(); setOpen(false); }}><Download className="h-4 w-4" />{tr("Install")}</Button>}
        <button type="button" aria-label={tr("Close")} onClick={close} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
    </>
  );
}

/** Permanent "Install App" menu entry; hidden inside the installed app. */
export function InstallMenuButton({ className, iconClass, showLabel = true }: { className: string; iconClass?: string; showLabel?: boolean }) {
  const tr = useTr();
  const available = useInstallAvailable();
  const [installed, setInstalled] = useState(true);
  const [help, setHelp] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => { setInstalled(isStandalone()); setIos(isIOS()); }, []);
  if (installed) return null;
  return (
    <>
      <button type="button" title={tr("Install App")} className={className} onClick={() => { if (available) void installApp(); else if (ios) setHelp(true); else toast(tr("Install is getting ready — please try again in a few seconds. You can also use the install icon in the address bar.")); }}>
        <Download className={iconClass ?? "h-4.5 w-4.5 shrink-0 text-primary"} />
        <span className={showLabel ? "" : "sr-only"}>{tr("Install App")}</span>
      </button>
      {ios && (
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{tr("Install App")}</DialogTitle></DialogHeader>
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2">1. {tr("Tap the Share button")} <Share className="h-4 w-4 text-primary" /></li>
              <li>2. {tr("Choose Add to Home Screen")}</li>
            </ol>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
