import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), logAdmin: vi.fn(), rpc: vi.fn(), from: vi.fn(), dispatch: vi.fn(), providerId: null as string | null }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ handler: (h: any) => h, inputValidator: (validate: any) => ({ handler: (h: any) => (args: any) => h({ data: validate(args.data) }) }) }),
}));
vi.mock("@/lib/admin.server", () => ({ requireAdmin: mocks.requireAdmin, logAdmin: mocks.logAdmin }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock("@/lib/providers.server", () => ({ dispatchProviderOrder: mocks.dispatch }));
import { adminUpdateOrder } from "@/lib/admin-orders.functions";

const id = "00000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.providerId = null;
  mocks.rpc.mockResolvedValue({ data: { refund: 0, status: "processing" }, error: null });
  mocks.from.mockImplementation(() => {
    const query: any = {};
    for (const method of ["select", "eq"]) query[method] = () => query;
    query.maybeSingle = async () => ({ data: { order_code: "123", user_id: id, status: "pending", dispatch_state: "manual", provider_id: mocks.providerId } });
    return query;
  });
});

describe("Self-controlled orders", () => {
  it.each(["processing", "completed", "partial", "rejected"] as const)("uses local ledger status changes for %s without buying upstream", async (status) => {
    await adminUpdateOrder({ data: { id, status, delivered: status === "partial" ? 5 : undefined } });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_update_order_status", expect.objectContaining({ _order_id: id, _status: status }));
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });
  it("never dispatches a legacy provider-linked manual order on Accept", async () => {
    mocks.providerId = id;
    await expect(adminUpdateOrder({ data: { id, status: "processing" } })).rejects.toThrow("প্রোভাইডার পরিচালনা করছে");
    expect(mocks.dispatch).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("requires an admin session before any status update", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("ADMIN_UNAUTHORIZED"));
    await expect(adminUpdateOrder({ data: { id, status: "processing" } })).rejects.toThrow("ADMIN_UNAUTHORIZED");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});