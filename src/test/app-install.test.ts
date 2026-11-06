import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isPreviewHostname, shouldRegisterAppSW } from "@/lib/pwa-registration";

const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const manifest = JSON.parse(readFileSync(path.join(PUBLIC_DIR, "manifest.webmanifest"), "utf8"));

function pngSize(file: string) {
  const bytes = readFileSync(file);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("home-screen install", () => {
  it("ships a standalone manifest under the Apex SMM World name", () => {
    expect(manifest.name).toBe("Apex SMM World");
    expect(manifest.short_name).toBe("Apex SMM");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.theme_color).toBe("#01930c");
  });

  it("offers every icon size the stores ask for, including maskable", () => {
    const purposes = manifest.icons.map((icon: { purpose: string }) => icon.purpose);
    expect(purposes).toContain("maskable");
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("ships the icon files the manifest points at", () => {
    for (const icon of manifest.icons) {
      const edge = Number(icon.sizes.split("x")[0]);
      expect(pngSize(path.join(PUBLIC_DIR, icon.src.slice(1)))).toEqual({ width: edge, height: edge });
    }
  });
});

describe("offline worker registration guards", () => {
  it("refuses every Lovable preview address", () => {
    expect(isPreviewHostname("id-preview--6483724f-e14d-4792-8af4-c85f6beebbc8.lovable.app")).toBe(true);
    expect(isPreviewHostname("preview--abc123.lovable.app")).toBe(true);
    expect(isPreviewHostname("preview-2--abc123.lovable.app")).toBe(true);
    expect(isPreviewHostname("project--6483724f-e14d-4792-8af4-c85f6beebbc8-dev.lovable.app")).toBe(true);
    expect(isPreviewHostname("lovableproject.com")).toBe(true);
    expect(isPreviewHostname("beta.lovable.dev")).toBe(true);
  });

  it("allows the published site and the custom domain", () => {
    expect(isPreviewHostname("apexsmmworld.com")).toBe(false);
    expect(isPreviewHostname("www.apexsmmworld.com")).toBe(false);
    expect(isPreviewHostname("asifvaipenel.lovable.app")).toBe(false);
  });

  it("never registers the worker outside a production build", () => {
    // Tests run with PROD === false, the same state as the dev server.
    expect(shouldRegisterAppSW()).toBe(false);
  });
});
