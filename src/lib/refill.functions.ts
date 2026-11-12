import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requestRefill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { requestProviderRefill } = await import("./providers.server");
    try { return { ok: true as const, ...(await requestProviderRefill(data.orderId, context.userId)) }; }
    catch (e) { return { ok: false as const, error: e instanceof Error ? e.message : "Refill failed" }; }
  });

export const refreshMyRefills = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { refreshProviderRefills } = await import("./providers.server");
    await refreshProviderRefills(context.userId);
    return { ok: true };
  });
