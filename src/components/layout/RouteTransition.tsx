import { Suspense, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

export function RoutePending() { return null; }

/** Keep shared sessions/cache alive, but never paint an outgoing page during navigation. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const { pending, pageKey } = useRouterState({
    select: (state) => ({
      pageKey: state.location.pathname + state.location.searchStr,
      pending: state.status === "pending" && (
        state.location.pathname !== state.resolvedLocation?.pathname ||
        state.location.searchStr !== state.resolvedLocation?.searchStr
      ),
    }),
  });

  if (pending) return null;

  return (
    <Suspense fallback={null}>
      <div key={pageKey} className="route-page-enter">
        {children}
      </div>
    </Suspense>
  );
}