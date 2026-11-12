import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const profileEditSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
  full_name: z.string().trim().min(1).max(100),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileEditSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("profiles").select("id").ilike("username", data.username).neq("id", context.userId).maybeSingle();
    if (taken) return { ok: false as const, error: "This username is already taken" };
    const { error } = await supabaseAdmin.from("profiles").update({ username: data.username, full_name: data.full_name }).eq("id", context.userId);
    if (error) return { ok: false as const, error: error.code === "23505" ? "This username is already taken" : "Could not save profile" };
    return { ok: true as const };
  });
