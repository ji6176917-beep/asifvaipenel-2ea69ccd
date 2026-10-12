import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Local session read: instant, no network round-trip on every navigation.
    const { data: { session } } = await supabase.auth.getSession();
    const data = { user: session?.user ?? null };
    if (!data.user) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
