import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteLoading } from "./components/layout/RouteTransition";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: RouteLoading,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultRemountDeps: ({ routeId, params }) => ({ routeId, params }),
  });

  return router;
};
