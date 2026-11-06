/**
 * App-shell service worker registration.
 *
 * The worker is generated at build time by vite-plugin-pwa and served from
 * /sw.js. It must NEVER register inside the Lovable preview/editor: those
 * contexts are browser-held state and would keep serving stale HTML or
 * deleted chunks after the code changes. Registration therefore happens from
 * this single wrapper, which refuses in dev, inside iframes and on preview
 * hostnames, and unregisters anything it previously left behind.
 */

export const APP_SW_PATH = "/sw.js";

const PREVIEW_HOST_SUFFIXES = ["lovable.app", "gpt-eng.com", "gptengineer.run"];

/** True for Lovable preview/preview-like hosts; false for the published site. */
export function isPreviewHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const first = host.split(".")[0] ?? "";

  if (PREVIEW_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    // id-preview--<id>.lovable.app, preview--<id>.lovable.app, preview-2--<id>.lovable.app
    if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
    // project--<project-id>-dev.lovable.app
    if (/^project--.*-dev$/.test(first)) return true;
  }

  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;

  return false;
}

/** Only the published app on a real domain may run the offline worker. */
export function shouldRegisterAppSW(): boolean {
  if (typeof window === "undefined") return false;
  if (!import.meta.env.PROD) return false;
  if (window.top !== window.self) return false;
  if (isPreviewHostname(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

function isAppShellRegistration(registration: ServiceWorkerRegistration): boolean {
  const scripts = [registration.active, registration.waiting, registration.installing];
  return scripts.some((worker) => worker?.scriptURL?.endsWith(APP_SW_PATH));
}

/** Remove the app-shell worker (and nothing else) from this browser. */
export async function unregisterAppSW(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations.filter(isAppShellRegistration).map((registration) => registration.unregister()),
    );
  } catch {
    /* nothing to clean up */
  }
}

/** Register /sw.js when the published app allows it, otherwise clean up. */
export async function registerAppSW(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (!shouldRegisterAppSW()) {
    await unregisterAppSW();
    return;
  }
  try {
    await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });
  } catch {
    /* offline support is an extra; the app keeps working without it */
  }
}
