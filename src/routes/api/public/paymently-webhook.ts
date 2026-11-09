import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Paymently calls this after a payment. The shared API key header is checked, and the
// invoice is always re-verified with the gateway before any balance is credited.
export const Route = createFileRoute("/api/public/paymently-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { webhookKeyValid, settleInvoice } = await import("@/lib/paymently.server");
        if (!webhookKeyValid(request.headers.get("rt-uddoktapay-api-key"))) return new Response("Unauthorized", { status: 401 });
        const parsed = z.object({ invoice_id: z.string().min(4).max(100) }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        try {
          const r = await settleInvoice(parsed.data.invoice_id);
          return Response.json({ ok: true, status: r.status });
        } catch (e) {
          console.error("paymently webhook failed", e instanceof Error ? e.message : e);
          return new Response("Error", { status: 500 });
        }
      },
    },
  },
});
