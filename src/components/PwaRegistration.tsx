import { useEffect } from "react";
import { registerAppSW } from "@/lib/pwa-registration";
import { watchInstallPrompt } from "@/lib/pwa-install";

/** Offline support for the installed app: registers /sw.js only on the published site. */
export function PwaRegistration() {
  useEffect(() => {
    watchInstallPrompt();
    void registerAppSW();
  }, []);
  return null;
}
