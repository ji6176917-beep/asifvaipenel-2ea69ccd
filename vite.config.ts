// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import path from "node:path";
import { VitePWA } from "vite-plugin-pwa";

Object.assign(process.env, loadEnv(process.env['NODE_ENV'] ?? 'development', process.cwd(), ''));

export default defineConfig({
  vite: {
    plugins: [
      // Offline/app-shell worker for the installed app. Generated only for
      // production builds; the app registers it from src/lib/pwa-registration.ts
      // (never in dev or in the Lovable preview).
      VitePWA({
        strategies: "generateSW",
        filename: "sw.js",
        // Static files of the published site live in dist/client.
        outDir: "dist/client",
        injectRegister: null,
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        // The manifest is a hand-maintained public/manifest.webmanifest.
        manifest: false,
        workbox: {
          globPatterns: ["assets/**/*.{js,css,woff2,woff}"],
          globDirectory: "dist/client",
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          dontCacheBustURLsMatching: /assets\/.+\.[0-9a-z]{8,}\./,
          runtimeCaching: [
            {
              // Pages: always try the network first so a live site is never stale.
              urlPattern: ({
                request,
                sameOrigin,
                url,
              }: {
                request: Request;
                sameOrigin: boolean;
                url: URL;
              }) =>
                sameOrigin &&
                request.mode === "navigate" &&
                !url.pathname.startsWith("/~oauth") &&
                !url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "pages",
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 30, maxAgeSeconds: 86400 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Icons, fonts and hashed build files: cached for offline use.
              urlPattern: ({
                url,
                sameOrigin,
                request,
              }: {
                url: URL;
                sameOrigin: boolean;
                request: Request;
              }) =>
                sameOrigin &&
                request.method === "GET" &&
                /\.(js|css|png|svg|ico|woff2?)$/.test(url.pathname),
              handler: "CacheFirst",
              options: {
                cacheName: "static",
                expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve("node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve("node_modules/entities/lib/encode.js"),
        "entities": path.resolve("node_modules/entities"),
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
