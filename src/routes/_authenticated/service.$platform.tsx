import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PlatformIcon } from "@/lib/brand";
import { computeCharge, friendlyError, money, newIdemKey } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/service/$platform")({
  head: ({ params }) => {
    const n = params.platform.charAt(0).toUpperCase() + params.platform.slice(1);
    return {
      meta: [
        { title: `${n} Services | Premium SMM Store` },
        { name: "description", content: `Order ${n} growth services, delivered manually by our team.` },
        { property: "og:title", content: `${n} Services | Premium SMM Store` },
        { property: "og:description", content: `Buy ${n} followers, likes and more.` },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { platform } = Route.useParams();
  const { verified, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [catId, setCatId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [link, setLink] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const idem = useRef(newIdemKey());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["catalog", platform],
    queryFn: async () => {
      const { data: p, error } = await supabase.from("platforms").select("id,name,slug").eq("slug", platform).maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const { data: cats } = await supabase.from("categories").select("id,name").eq("platform_id", p.id).eq("active", true).is("deleted_at", null).order("sort");
      const ids = (cats ?? []).map((c) => c.id);
      const { data: svcs } = ids.length
        ? await supabase.from("services").select("*").in("category_id", ids).eq("active", true).is("deleted_at", null).order("sort")
        : { data: [] };
      return { platform: p, cats: cats ?? [], svcs: svcs ?? [] };
    },
  });

  const cats = useMemo(() => (data ? data.cats.filter((c) => data.svcs.some((s) => s.category_id === c.id)) : []), [data]);
  const svcs = (data?.svcs ?? []).filter((s) => s.category_id === catId);
  const svc = data?.svcs.find((s) => s.id === svcId);
  const qn = parseInt(qty || "0", 10);
  const charge = svc ? computeCharge(qn, Number(svc.rate), svc.rate_per) : 0;
  const linkOk = /^https?:\/\/\S+\.\S+/i.test(link.trim());
  const qtyOk = svc ? qn >= svc.min_qty && qn <= svc.max_qty : false;

  const submit = async () => {
    if (!svc) { toast.error("Choose a service"); return; }
    if (!linkOk) { toast.error("Enter a valid link"); return; }
    if (!qtyOk) { toast.error(`Quantity must be ${svc.min_qty}–${svc.max_qty}`); return; }
    if (!verified) { toast.error("Please verify your email first."); return; }
    setBusy(true);
    const { data: r, error } = await supabase.rpc("place_order", { _service_id: svc.id, _link: link.trim(), _quantity: qn, _idem: idem.current });
    setBusy(false);
    if (error) {
      if (error.message.includes("INSUFFICIENT_BALANCE")) {
        toast.error("Insufficient balance");
        navigate({ to: "/add-funds" });
        return;
      }
      { toast.error(friendlyError(error.message)); return; }
    }
    idem.current = newIdemKey();
    refreshProfile();
    setDone((r as { order_code: string }).order_code);
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CheckCircle2 className="mx-auto h-20 w-20 animate-in zoom-in text-success" />
        <h1 className="text-gradient mt-3 text-3xl font-bold">Order Submitted</h1>
        <p className="mt-3 text-sm text-muted-foreground">Order ID</p>
        <Copyable value={done} className="text-lg font-bold" />
        <div className="mt-6 grid gap-3">
          <Link to="/" className="btn-ghost-glow">Back to Home</Link>
          <Link to="/orders" className="btn-glow">Go to Order History</Link>
          <button onClick={() => { setDone(null); setLink(""); setQty(""); }} className="text-sm font-semibold text-primary">Buy New Service</button>
        </div>
      </Card>
    );
  }

  if (isError) return <ErrorState />;
  if (!isLoading && !data) return <Empty text="This platform is not available." />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button aria-label="Back" onClick={() => history.back()} className="rounded-full p-2 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <PlatformIcon slug={platform} className="h-12 w-12" />
        <h1 className="text-gradient text-3xl font-bold">{data?.platform.name ?? "…"} Service</h1>
      </div>

      <Card className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="cat">Category</label>
          {isLoading ? <Skeleton className="h-12 rounded-2xl" /> : cats.length === 0 ? <Empty text="No categories available." /> : (
            <select id="cat" className={inputCls} value={catId} onChange={(e) => { setCatId(e.target.value); setSvcId(""); }}>
              <option value="">Select a category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        {catId && (
          <div>
            <label className={labelCls} htmlFor="svc">Service</label>
            {svcs.length === 0 ? <Empty text="No services in this category." /> : (
              <select id="svc" className={inputCls} value={svcId} onChange={(e) => setSvcId(e.target.value)}>
                <option value="">Select a service</option>
                {svcs.map((s) => <option key={s.id} value={s.id}>{s.name} — {money(s.rate)} per {s.rate_per}</option>)}
              </select>
            )}
            {svc?.description && <p className="mt-1 text-xs text-muted-foreground">{svc.description}</p>}
          </div>
        )}

        {svc && (
          <>
            <div>
              <label className={labelCls} htmlFor="link">Paste your {data?.platform.name} link</label>
              <input id="link" className={inputCls} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
              {link && !linkOk && <p className="mt-1 text-xs text-destructive">Enter a valid URL starting with https://</p>}
            </div>
            <div>
              <label className={labelCls} htmlFor="qty">Quantity</label>
              <input id="qty" inputMode="numeric" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
              <p className={`mt-1 text-xs ${qty && !qtyOk ? "text-destructive" : "text-muted-foreground"}`}>Min: {svc.min_qty} — Max: {svc.max_qty}</p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-sm">
              <Clock className="h-4 w-4 text-primary" /> Average time: <b>{svc.avg_time}</b>
              <span className="ml-auto text-xs text-muted-foreground">Delivered manually by our team</span>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-center">
              <div className="text-xs text-muted-foreground">Total charge</div>
              <div className="text-gradient font-display text-4xl font-extrabold">{money(charge)}</div>
            </div>
            <button disabled={busy} onClick={submit} className="btn-glow w-full !py-4 text-lg">{busy && <Spinner />} Submit</button>
          </>
        )}
      </Card>
    </div>
  );
}
