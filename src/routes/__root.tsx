import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { I18nProvider, uiContentQuery } from "@/lib/i18n";
import { settingsQuery, platformsQuery } from "@/lib/queries";
import { SupportAdminProvider } from "@/components/SupportAdmin";
import { Toaster } from "@/components/ui/sonner";
import { VisitTracker } from "@/components/VisitTracker";
import { PwaRegistration } from "@/components/PwaRegistration";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "google-site-verification", content: "yzvf-oFQfMw-dvwwVe-YAF3TrjNw7jo8JUzSNRLPa7c" },
      { title: "Apex SMM World" },
      { name: "description", content: "Premium social media growth services, delivered by hand." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Apex SMM World" },
      { name: "application-name", content: "Apex SMM World" },
      { name: "apple-mobile-web-app-title", content: "Apex SMM World" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "theme-color", content: "#01930c" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", href: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  // Load admin-saved settings/texts before first paint so built-in defaults never flash.
  loader: async ({ context }) => {
    const qc = context.queryClient;
    const safe = <T,>(p: Promise<T>) => p.catch(() => null);
    const [settings, ui, platforms] = await Promise.all([
      safe(qc.ensureQueryData(settingsQuery)),
      safe(qc.ensureQueryData(uiContentQuery)),
      safe(qc.ensureQueryData(platformsQuery)),
    ]);
    return { settings, ui, platforms };
  },
  staleTime: Infinity,
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const seed = Route.useLoaderData();
  if (seed) {
    if (seed.settings && !queryClient.getQueryData(settingsQuery.queryKey)) queryClient.setQueryData(settingsQuery.queryKey, seed.settings);
    if (seed.ui && !queryClient.getQueryData(uiContentQuery.queryKey)) queryClient.setQueryData(uiContentQuery.queryKey, seed.ui);
    if (seed.platforms && !queryClient.getQueryData(platformsQuery.queryKey)) queryClient.setQueryData(platformsQuery.queryKey, seed.platforms);
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AuthProvider>
        <I18nProvider><SupportAdminProvider><AppShell>
          <Outlet />
        </AppShell></SupportAdminProvider></I18nProvider>
        <Toaster richColors position="top-center" />
        <VisitTracker />
        <WarmRoutes />
        <PwaRegistration />
      </AuthProvider>
    </QueryClientProvider>
  );
}

/** After first paint, download main page code so first taps (incl. touch) switch instantly. */
function WarmRoutes() {
  const router = useRouter();
  useEffect(() => {
    const ids = ["/order", "/_authenticated/service/$platform", "/_authenticated/orders", "/_authenticated/add-funds/", "/_authenticated/dashboard", "/sign-in", "/qna"];
    const run = () => ids.forEach((id) => {
      const r = (router.routesById as unknown as Record<string, unknown>)[id];
      if (r) router.loadRouteChunk(r as never)?.catch(() => {});
    });
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(run); else setTimeout(run, 300);
  }, [router]);
  return null;
}
