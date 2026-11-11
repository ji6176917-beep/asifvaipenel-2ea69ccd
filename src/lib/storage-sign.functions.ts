import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Signs a branding logo path server-side so the logos bucket needs no client read policy. */
export const signLogoUrl = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(300).regex(/^[A-Za-z0-9._\/-]+$/).refine((p) => !p.includes("..")) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin.storage.from("logos").createSignedUrl(data.path, 3600);
    if (error || !r) return null;
    return r.signedUrl;
  });
