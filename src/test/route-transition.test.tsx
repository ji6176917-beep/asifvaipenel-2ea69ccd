import { useEffect, useState } from "react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouteLoading, RouteTransition } from "@/components/layout/RouteTransition";

afterEach(cleanup);

function deferred() {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function makeRouter(loader: () => Promise<void>, unmounted: () => void = () => {}) {
  const root = createRootRoute({ component: () => <RouteTransition><Outlet /></RouteTransition> });
  const first = createRoute({ getParentRoute: () => root, path: "/", component: () => {
    useEffect(() => unmounted, []);
    return <div>Original page</div>;
  } });
  const second = createRoute({ getParentRoute: () => root, path: "/next", loader, component: () => <div>Destination page</div> });
  const item = createRoute({ getParentRoute: () => root, path: "/item/$id", component: () => {
    const [value, setValue] = useState("");
    return <input aria-label="Page-local value" value={value} onChange={(e) => setValue(e.target.value)} />;
  } });
  return createRouter({
    routeTree: root.addChildren([first, second, item]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
    defaultPendingComponent: RouteLoading,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultRemountDeps: ({ routeId, params }) => ({ routeId, params }),
  });
}

describe("Global route transitions", () => {
  it("unmounts the outgoing page while a destination loader is unresolved and then displays the destination", async () => {
    const gate = deferred();
    let unmounts = 0;
    const router = makeRouter(() => gate.promise, () => { unmounts += 1; });
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("Original page");
    let navigation: Promise<void> | undefined;
    act(() => { navigation = router.navigate({ to: "/next" }); });
    await screen.findByRole("status");
    expect(screen.queryByText("Original page")).toBeNull();
    expect(unmounts).toBe(1);
    await act(async () => { gate.resolve(); await navigation; });
    await screen.findByText("Destination page");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("resets local form state when dynamic route parameters change without clearing shared cache", async () => {
    const router = makeRouter(async () => {});
    await router.load();
    render(<RouterProvider router={router} />);
    await act(async () => { await router.navigate({ to: "/item/$id", params: { id: "facebook" } }); });
    fireEvent.change(await screen.findByLabelText("Page-local value"), { target: { value: "previous selection" } });
    expect(screen.getByLabelText("Page-local value")).toHaveValue("previous selection");
    await act(async () => { await router.navigate({ to: "/item/$id", params: { id: "instagram" } }); });
    await waitFor(() => expect(screen.getByLabelText("Page-local value")).toHaveValue(""));
  });
});