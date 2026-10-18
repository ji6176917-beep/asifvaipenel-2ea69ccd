import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), from: vi.fn(), queries: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({ inputValidator: (validate: (d: unknown) => unknown) => ({ handler: (handler: any) => (args: any) => handler({ data: validate(args.data) }) }) }),
}));
vi.mock("@/lib/admin.server", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));

import { adminCatalogList } from "@/lib/admin-catalog.functions";

const platformId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  mocks.requireAdmin.mockReset();
  mocks.from.mockReset();
  mocks.queries.length = 0;
  mocks.from.mockImplementation((table: string) => {
    const calls: any[] = [];
    const query: any = { table, calls };
    for (const method of ["select", "order", "limit", "is", "not", "eq"]) query[method] = (...args: any[]) => { calls.push([method, ...args]); return query; };
    query.maybeSingle = async () => ({ data: { name: "TikTok" } });
    query.then = (resolve: any) => resolve({ data: [{ id: "own-category", name: "My TikTok Likes", api_services: null }], error: null });
    mocks.queries.push(query);
    return query;
  });
});

describe("Own Services catalog boundaries", () => {
  it("shares all platform states without provider ownership filtering", async () => {
    await adminCatalogList({ data: { level: "platforms", parentId: null, ownOnly: true } });
    expect(mocks.queries[0].calls.filter((c: any[]) => c[0] === "is")).toEqual([["is", "deleted_at", null]]);
  });
  it("excludes imported categories even when their source selection is null or services are trashed", async () => {
    const result = await adminCatalogList({ data: { level: "categories", parentId: platformId, ownOnly: true } });
    expect(mocks.queries[0].calls).toContainEqual(["select", "*, api_services:services(id)"]);
    expect(mocks.queries[0].calls).toContainEqual(["not", "api_services.provider_id", "is", null]);
    expect(mocks.queries[0].calls).toContainEqual(["is", "api_services", null]);
    expect(mocks.queries[0].calls).toContainEqual(["eq", "platform_id", platformId]);
    expect(mocks.queries[0].calls).not.toContainEqual(["is", "api_services.deleted_at", null]);
    expect(result.rows[0]).toEqual({ id: "own-category", name: "My TikTok Likes" });
  });
  it("keeps provider-backed services out of the own service list", async () => {
    await adminCatalogList({ data: { level: "services", parentId: platformId, ownOnly: true } });
    expect(mocks.queries[0].calls).toContainEqual(["is", "provider_id", null]);
  });
  it("leaves non-own catalog requests unchanged", async () => {
    await adminCatalogList({ data: { level: "categories", parentId: platformId } });
    expect(mocks.queries[0].calls).toContainEqual(["select", "*"]);
    expect(mocks.queries[0].calls.some((c: any[]) => String(c[1]).includes("api_services"))).toBe(false);
  });
  it("refuses catalog access without a valid admin session", async () => {
    mocks.requireAdmin.mockRejectedValueOnce(new Error("ADMIN_UNAUTHORIZED"));
    await expect(adminCatalogList({ data: { level: "platforms", parentId: null, ownOnly: true } })).rejects.toThrow("ADMIN_UNAUTHORIZED");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});