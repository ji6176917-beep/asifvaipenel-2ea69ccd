import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), calls: [] as { table: string; filters: unknown[][] }[], off: false, categoryError: false }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { catalogQuery, platformsQuery } from "@/lib/queries";

beforeEach(() => {
  mocks.calls.length = 0;
  mocks.off = false;
  mocks.categoryError = false;
  mocks.from.mockImplementation((table: string) => {
    const filters: unknown[][] = [];
    mocks.calls.push({ table, filters });
    const query: any = {};
    for (const method of ["select", "eq", "is", "in", "order", "range"]) query[method] = (...args: unknown[]) => { filters.push([method, ...args]); return query; };
    const response = () => ({
      data: table === "platforms" ? { id: "platform", name: "YouTube" } : table === "categories" ? [{ id: "category", name: "Likes" }] : mocks.off && filters.some((f) => f[0] === "eq" && f[1] === "active" && f[2] === true) ? [] : [{ id: "service", category_id: "category" }],
      error: table === "categories" && mocks.categoryError ? new Error("category unavailable") : null,
    });
    query.maybeSingle = async () => response();
    query.then = (resolve: (r: unknown) => unknown) => Promise.resolve(response()).then(resolve);
    return query;
  });
});

const load = () => {
  const fn = catalogQuery("youtube").queryFn;
  if (!fn) throw new Error("Missing catalog query");
  return (fn as () => Promise<any>)();
};

describe("Customer catalog visibility", () => {
  it("removes an OFF service and its empty category on the next read", async () => {
    expect((await load()).svcs.map((s: any) => s.id)).toEqual(["service"]);
    mocks.off = true;
    const result = await load();
    expect(result.svcs).toEqual([]);
    expect(result.cats).toEqual([]);
  });
  it("requires active, non-deleted and upstream-available services", async () => {
    await load();
    const service = mocks.calls.find((c) => c.table === "services");
    expect(service?.filters).toContainEqual(["eq", "active", true]);
    expect(service?.filters).toContainEqual(["is", "deleted_at", null]);
    expect(service?.filters).toContainEqual(["eq", "provider_available", true]);
  });
  it("filters disabled platforms and categories", async () => {
    await load();
    for (const table of ["platforms", "categories"]) {
      const row = mocks.calls.find((c) => c.table === table);
      expect(row?.filters).toContainEqual(["eq", "active", true]);
      expect(row?.filters).toContainEqual(["is", "deleted_at", null]);
    }
  });
  it("refreshes visible catalog entries without relying on realtime delivery", () => {
    for (const query of [catalogQuery("youtube"), platformsQuery]) {
      expect(query.staleTime).toBe(0);
      expect(query.refetchOnMount).toBe("always");
      expect(query.refetchInterval).toBe(10_000);
    }
  });
  it("does not report category query failures as an empty catalog", async () => {
    mocks.categoryError = true;
    await expect(load()).rejects.toThrow("category unavailable");
  });
});