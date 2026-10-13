import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserInbox } from "@/components/UserInbox";

const f = vi.hoisted(() => ({
  user: { id: "customer-1" },
  rpc: vi.fn(async () => ({ error: null })),
  calls: [] as { table: string; column: string; value: string }[],
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: f.user }) }));
vi.mock("@/lib/i18n", () => ({ useTr: () => (s: string) => s }));
vi.mock("@/lib/storage-url", () => ({ useStorageUrl: () => null }));
vi.mock("@/lib/brand", () => ({ PlatformIcon: () => <span /> }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a href="/orders">{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => {
    const data = table === "notifications" ? [
      { id: "1", user_id: "customer-1", title: "Order #4406212323 completed", body: "Facebook Followers × 2000", kind: "notification", read_at: null, created_at: "2026-10-13T10:00:00Z" },
      { id: "2", user_id: "customer-1", title: "Add Fund #ADD-194871 was rejected", body: "Fake transaction", kind: "notification", read_at: null, created_at: "2026-10-13T09:00:00Z" },
    ] : table === "orders" ? [{ order_code: "4406212323", service_name: "Follow Service", platform_name: "Facebook", platform_slug: "facebook", quantity: 2000, charge: 1.6 }] : [{ code: "ADD-194871", amount: 10, method_name: "bKash" }];
    const chain = {
      select: () => chain,
      eq: (column: string, value: string) => { f.calls.push({ table, column, value }); return chain; },
      order: () => chain,
      range: async () => ({ data, error: null }),
      in: async () => ({ data, error: null }),
    };
    return chain;
  },
  rpc: f.rpc,
  channel: () => ({ on() { return this; }, subscribe() { return this; } }),
  removeChannel: vi.fn(),
} }));

afterEach(() => { cleanup(); f.calls.length = 0; f.rpc.mockClear(); });
describe("Customer inbox", () => {
  it("loads owner-scoped details, searches platform and reference, and acknowledges unread events", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><UserInbox /></QueryClientProvider>);
    await waitFor(() => expect(f.calls.filter((c) => c.column === "user_id")).toHaveLength(3));
    expect(f.calls.every((c) => c.value === "customer-1")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    await screen.findByText("$10.00");
    fireEvent.change(screen.getByRole("textbox", { name: "Search notifications" }), { target: { value: "Facebook 4406212323" } });
    expect(screen.getByText("$1.60")).toBeInTheDocument();
    expect(screen.queryByText("$10.00")).toBeNull();
    expect(f.rpc).toHaveBeenCalledWith("mark_my_notifications", { _ids: ["1", "2"], _shown: false });
    fireEvent.change(screen.getByRole("textbox", { name: "Search notifications" }), { target: { value: "nonexistent" } });
    expect(screen.queryByText("$1.60")).toBeNull();
    client.clear();
  });
});