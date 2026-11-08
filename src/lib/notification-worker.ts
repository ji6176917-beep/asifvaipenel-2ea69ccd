/** Keep notifications separate from the root-scoped offline app worker. */
export const NOTIFICATION_SW_PATH = "/notify-sw.js";
export const NOTIFICATION_SW_SCOPE = "/notifications/";

export async function registerNotificationWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // getRegistration(scriptURL) matches by document scope, not by worker script.
  // Always register with the dedicated scope so we never return/update /sw.js.
  const registration = await navigator.serviceWorker.register(NOTIFICATION_SW_PATH, {
    scope: NOTIFICATION_SW_SCOPE,
  });
  if (registration.active) return registration;
  const worker = registration.installing ?? registration.waiting;
  if (!worker) throw new Error("Notification worker is unavailable");
  await new Promise<void>((resolve, reject) => {
    const check = () => {
      if (worker.state !== "activated" && worker.state !== "redundant") return;
      worker.removeEventListener("statechange", check);
      if (worker.state === "activated") resolve();
      else reject(new Error("Notification worker failed to activate"));
    };
    worker.addEventListener("statechange", check);
    check();
  });
  return registration;
}