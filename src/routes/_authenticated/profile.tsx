import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut, ShieldOff, Pencil, ShoppingCart, Wallet, Ticket, History, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, money } from "@/lib/format";
import { Card, Copyable, inputCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarEditor } from "@/components/AvatarEditor";
import { InstallAppCard } from "@/components/InstallAppCard";
import { useTr } from "@/lib/i18n";
import { updateMyProfile } from "@/lib/profile-edit.functions";
import bannerArt from "@/assets/welcome-social.png";
import growthArt from "@/assets/social-growth.webp";
import giftArt from "@/assets/giveaway-gift.png";
import supportArt from "@/assets/support-headset.png";

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
  const { profile, user, verified, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const save = useServerFn(updateMyProfile);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const out = async (scope: "local" | "global") => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut({ scope });
    toast.success(scope === "global" ? tr("Logged out from all devices") : tr("Logged out"));
    navigate({ to: "/", replace: true });
  };
  if (!profile) return <Skeleton className="h-64 rounded-3xl" />;
  const startEdit = () => { setForm({ username: profile.username, full_name: profile.full_name, email: user?.email ?? "" }); setOpen(true); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await save({ data: { username: form.username, full_name: form.full_name } });
      if (!r.ok) { toast.error(tr(r.error)); return; }
      if (form.email.trim() && form.email.trim() !== user?.email) {
        const { error } = await supabase.auth.updateUser({ email: form.email.trim() });
        if (error) { toast.error(error.message); return; }
        toast.success(tr("Check your new email to confirm the change"));
      }
      await refreshProfile();
      toast.success(tr("Profile updated")); setOpen(false);
    } catch { toast.error(tr("Use 3-30 letters, numbers, _ or . for username")); }
    finally { setBusy(false); }
  };
  const rows: [string, React.ReactNode][] = [
    [tr("User ID"), <Copyable value={profile.public_id} className="font-bold" />],
    [tr("Username"), <Copyable value={profile.username} />],
    [tr("Full name"), profile.full_name],
    [tr("Email"), <span>{user?.email} {verified ? <span className="text-success">✓</span> : <span className="text-warning">{tr("unverified")}</span>}</span>],
    [tr("Phone"), profile.phone ?? "—"],
    [tr("Member since"), fmtDate(profile.created_at)],
  ];
  const shortcuts = [
    { to: "/order", icon: ShoppingCart, l: tr("New Order") }, { to: "/add-funds", icon: Wallet, l: tr("Add Funds") },
    { to: "/orders", icon: History, l: tr("Order History") }, { to: "/tickets", icon: Ticket, l: tr("My Tickets") },
  ] as const;
  return (
    <div className="space-y-5">
      <section className="page-banner"><div className="relative z-10"><h1>{tr("My Account")}</h1><p>{tr("Manage your profile, security and shortcuts in one place.")}</p><div className="page-banner-stats"><span>{tr("Balance")}: {money(profile.balance)}</span><span>ID {profile.public_id}</span></div></div><img src={bannerArt} alt="" width={816} height={816} /></section>
      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="text-center"><AvatarEditor /><div className="mt-3 font-display text-xl font-bold">{profile.full_name || profile.username}</div><div className="text-sm text-muted-foreground">@{profile.username}</div>
            <Button onClick={startEdit} className="mt-4 w-full"><Pencil className="h-4 w-4" /> {tr("Edit Profile")}</Button></Card>
          <Card className="divide-y divide-border">
            {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{k}</span><span className="min-w-0 truncate text-right">{v}</span></div>)}
          </Card>
          <div className="space-y-2 pt-2">
            <button onClick={() => out("local")} className="btn-ghost-glow w-full"><LogOut className="h-4 w-4" /> {tr("Logout")}</button>
            <button onClick={() => out("global")} className="btn-ghost-glow w-full text-destructive"><ShieldOff className="h-4 w-4" /> {tr("Logout from all devices")}</button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {shortcuts.map((s) => <Link key={s.to} to={s.to} className="profile-shortcut"><s.icon className="h-6 w-6 text-primary" /><span>{s.l}</span></Link>)}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link to="/order" className="profile-art-card"><img src={growthArt} alt="" loading="lazy" /><b>{tr("Grow faster")}</b><span>{tr("Real social growth services")}</span></Link>
            <Link to="/giveaway" className="profile-art-card"><img src={giftArt} alt="" loading="lazy" /><b>{tr("Giveaway")}</b><span>{tr("Complete tasks, earn rewards")}</span></Link>
            <Link to="/tickets" className="profile-art-card"><img src={supportArt} alt="" loading="lazy" /><b>{tr("24/7 support")}</b><span>{tr("We are always here to help")}</span></Link>
          </div>
          <Card className="flex items-center gap-3"><ShieldCheck className="h-8 w-8 shrink-0 text-primary" /><div><b>{tr("Account security")}</b><p className="text-sm text-muted-foreground">{tr("Never share your password. Use “Logout from all devices” if you suspect anything.")}</p></div></Card>
          <InstallAppCard />
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent><DialogHeader><DialogTitle>{tr("Edit Profile")}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium">{tr("Username")}<input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label>
            <label className="block text-sm font-medium">{tr("Full name")}<input className={inputCls} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
            <label className="block text-sm font-medium">{tr("Email")}<input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
            <Button type="submit" disabled={busy} className="w-full">{busy ? tr("Saving...") : tr("Save changes")}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
