import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, money } from "@/lib/format";
import { Card, Copyable, PageTitle } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarEditor } from "@/components/AvatarEditor";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Account | Premium Apex SMM World" },
      { name: "description", content: "Your account details, User ID and security options." },
      { property: "og:title", content: "My Account | Premium Apex SMM World" },
      { property: "og:description", content: "Your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const tr = useTr();
  const { profile, user, verified } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const out = async (scope: "local" | "global") => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope });
    toast.success(scope === "global" ? tr("Logged out from all devices") : tr("Logged out"));
    navigate({ to: "/", replace: true });
  };
  if (!profile) return <Skeleton className="h-64 rounded-3xl" />;
  const rows: [string, React.ReactNode][] = [
    [tr("User ID"), <Copyable value={profile.public_id} className="font-bold" />],
    [tr("Username"), <Copyable value={profile.username} />],
    [tr("Full name"), profile.full_name],
    [tr("Email"), <span>{user?.email} {verified ? <span className="text-success">✓ {tr("verified")}</span> : <span className="text-warning">{tr("unverified")}</span>}</span>],
    [tr("Phone"), profile.phone ?? "—"],
    [tr("Balance"), money(profile.balance)],
    [tr("Member since"), fmtDate(profile.created_at)],
  ];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageTitle>{tr("My Account")}</PageTitle>
      <Card><AvatarEditor /></Card>
      <Card className="divide-y divide-border">
        {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>)}
      </Card>
      <button onClick={() => out("local")} className="btn-ghost-glow w-full"><LogOut className="h-4 w-4" /> {tr("Logout")}</button>
      <button onClick={() => out("global")} className="btn-ghost-glow w-full text-destructive"><ShieldOff className="h-4 w-4" /> {tr("Logout from all devices")}</button>
    </div>
  );
}
