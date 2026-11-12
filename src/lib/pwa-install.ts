import { useSyncExternalStore } from "react";

/**
 * Home-screen install support.
 *
 * Chrome/Android fire `beforeinstallprompt`, which we capture so the app can
 * show its own button. iOS Safari never fires it, so there the card explains
 * the Share → Add to Home Screen route instead.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Start listening for the browser's install prompt (call once, client-side). */
export function watchInstallPrompt(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

export function canInstallNow(): boolean {
  return deferredPrompt !== null;
}

/** Ask the browser to install; resolves to what the user chose. */
export async function installApp(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
  return outcome;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True when the page is already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

/** iOS Safari: install is only possible from the Share sheet. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

/** Reactive install availability for the current browser. */
export function useInstallAvailable(): boolean {
  return useSyncExternalStore(subscribe, canInstallNow, () => false);
}

/** How long a dismissed install suggestion stays hidden. */
export const INSTALL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const SNOOZE_KEY = "apex-install-snoozed-at";

/** True when the suggestion was dismissed less than INSTALL_SNOOZE_MS ago. */
export function isInstallSnoozed(dismissedAt: number | null, now = Date.now()): boolean {
  return dismissedAt !== null && now - dismissedAt < INSTALL_SNOOZE_MS;
}

export function readInstallSnooze(): number | null {
  try { const v = Number(localStorage.getItem(SNOOZE_KEY)); return v > 0 ? v : null; } catch { return null; }
}

export function snoozeInstall(): void {
  try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* ignore */ }
}
