import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(1).max(200),
});

/** Resolves email / phone / 8-digit User ID / username to the account and signs in server-side. */
export const signInWithIdentifier = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    const generic = { ok: false as const, error: "Invalid credentials. Please check and try again." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.identifier;
    let email: string | null = null;
    if (id.includes("@")) {
      email = id.toLowerCase();
    } else {
      const col = /^\d{8}$/.test(id) ? "public_id" : /^\+?\d{6,15}$/.test(id) ? "phone" : "username";
      const { data: p } = await supabaseAdmin.from("profiles").select("email").eq(col, id).maybeSingle();
      email = p?.email ?? null;
    }
    if (!email) return generic;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: res, error } = await client.auth.signInWithPassword({ email, password: data.password });
    if (error || !res.session) {
      const msg = error?.message?.toLowerCase() ?? "";
      if (msg.includes("not confirmed") || msg.includes("confirm")) {
        return { ok: false as const, error: "Please verify your email first — check your inbox." };
      }
      return generic;
    }
    return { ok: true as const, access_token: res.session.access_token, refresh_token: res.session.refresh_token };
  });

/** Server-side check of the admin blocked-email-domain list (list itself is not readable by clients). */
export const checkEmailDomainAllowed = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().toLowerCase().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const domain = data.email.split("@")[1] ?? "";
    const { data: s } = await supabaseAdmin.from("site_settings").select("blocked_email_domains").eq("id", 1).maybeSingle();
    const raw = (s as { blocked_email_domains?: unknown } | null)?.blocked_email_domains;
    const list: string[] = Array.isArray(raw) ? raw.map(String) : typeof raw === "string" ? raw.split(/[\s,]+/) : [];
    const blocked = list.map((x) => x.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
    return { allowed: !blocked.includes(domain) };
  });
