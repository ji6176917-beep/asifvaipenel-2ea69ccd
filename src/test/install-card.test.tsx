import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallAppCard } from "@/components/InstallAppCard";
import { installApp, watchInstallPrompt } from "@/lib/pwa-install";

vi.mock("@/lib/i18n", () => ({ useTr: () => (s: string) => s }));

afterEach(() => cleanup());

function fireInstallPrompt() {
  const prompt = vi.fn(async () => {});
  const event = new Event("beforeinstallprompt");
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
  window.dispatchEvent(event);
  return prompt;
}

describe("Install this app card", () => {
  it("stays hidden until the browser offers an install", async () => {
    watchInstallPrompt();
    render(<InstallAppCard />);
    expect(screen.queryByText("Install this app")).toBeNull();
  });

  it("appears with a working Install button once the browser offers an install", async () => {
    watchInstallPrompt();
    render(<InstallAppCard />);
    const prompt = fireInstallPrompt();

    await screen.findByText("Install this app");
    fireEvent.click(screen.getByRole("button", { name: /Install/ }));

    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });

  it("reports unavailable when nothing was captured", async () => {
    await expect(installApp()).resolves.toBe("unavailable");
  });
});
