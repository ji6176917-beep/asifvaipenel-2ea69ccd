import { Suspense, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
    </div>
  );
}

/** Keep shared sessions/cache alive, but never paint an outgoing page during navigation. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pending, pathname } = useRouterState({
    select: (state) => ({
      pathname: state.location.pathname,
      pending: state.status === "pending" && (
        state.location.pathname !== state.resolvedLocation?.pathname ||
        state.location.searchStr !== state.resolvedLocation?.searchStr
      ),
    }),
  });

  if (pending) return <RouteLoading />;

  return (
    <Suspense fallback={<RouteLoading />}>
      <div key={pathname} className="route-page-enter">
        {children}
      </div>
    </Suspense>
  );
}