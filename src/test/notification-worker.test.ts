import { afterEach, describe, expect, it, vi } from "vitest";
import { registerNotificationWorker } from "@/lib/notification-worker";

afterEach(() => vi.unstubAllGlobals());

describe("notification worker isolation", () => {
  it("registers notifications outside the root offline scope on every entry path", async () => {
    const notificationRegistration = { active: { scriptURL: "/notify-sw.js" } };
    const register = vi.fn().mockResolvedValue(notificationRegistration);
    const getRegistration = vi.fn().mockResolvedValue({ active: { scriptURL: "/sw.js" } });
    vi.stubGlobal("navigator", { serviceWorker: { register, getRegistration } });

    expect(await registerNotificationWorker()).toBe(notificationRegistration);
    expect(register).toHaveBeenCalledWith("/notify-sw.js", { scope: "/notifications/" });
    expect(getRegistration).not.toHaveBeenCalled();
  });

  it("waits for activation before allowing the first notification", async () => {
    const worker = Object.assign(new EventTarget(), { state: "installing" });
    const registration = { active: null, installing: worker };
    vi.stubGlobal("navigator", { serviceWorker: { register: vi.fn().mockResolvedValue(registration) } });
    let resolved = false;
    const pending = registerNotificationWorker().then((value) => { resolved = true; return value; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    worker.state = "activated";
    worker.dispatchEvent(new Event("statechange"));
    expect(await pending).toBe(registration);
  });
});