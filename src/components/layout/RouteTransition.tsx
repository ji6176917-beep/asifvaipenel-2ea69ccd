import { type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";

/** Replace only committed pages; never tear down content while its replacement is unavailable. */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pageKey = useRouterState({
    select: (state) => {
      const committed = state.resolvedLocation ?? state.location;
      return committed.pathname + committed.searchStr;
    },
  });

  return (
    <div key={pageKey} className="route-page-enter">
      {children}
    </div>
  );
}