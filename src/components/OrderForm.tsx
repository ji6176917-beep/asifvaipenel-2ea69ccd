import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitCustomerOrder } from "@/lib/customer-activity.functions";
import { ArrowLeft, Search, Clock, CheckCircle2, ShoppingCart, PlusCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT, useTr } from "@/lib/i18n";
import { PlatformIcon } from "@/lib/brand";
import { catalogQuery } from "@/lib/queries";
import { computeCharge, friendlyError, money, rateMoney, newIdemKey } from "@/lib/format";
import { Card, Copyable, Empty, ErrorState, Spinner, inputCls, labelCls } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Button } from "@/components/ui/button";
export function OrderForm({ platform, desktop = false }: { platform: string; desktop?: boolean }) {
  const placeOrder = useServerFn(submitCustomerOrder);
  const { user, verified, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const tr = useTr();
  const [search, setSearch] = useState("");
  const [catId, setCatId] = useState("");
  const [svcId, setSvcId] = useState("");
  const [link, setLink] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const idem = useRef(newIdemKey());

  const { data, isLoading, isError } = useQuery(catalogQuery(platform));

  const cats = useMemo(() => (data ? data.cats.filter((c) => data.svcs.some((s) => s.category_id === c.id)) : []), [data]);
  const selectedCatId = cats.some((c) => c.id === catId) ? catId : "";
  const svcs = (data?.svcs ?? []).filter((s) => s.category_id === selectedCatId);
  const svc = svcs.find((s) => s.id === svcId);
  const qn = parseInt(qty || "0", 10);
  const charge = svc ? computeCharge(qn, Number(svc.rate), svc.rate_per) : 0;
  const linkOk = /^https?:\/\/\S+\.\S+/i.test(link.trim());
  const qtyOk = svc ? qn >= svc.min_qty && qn <= svc.max_qty : false;

  const submit = async () => {
    if (!user) { navigate({ to: "/sign-in", search: { redirect: "/" } }); return; }
    if (!svc) { toast.error(t("toast.choose_service")); return; }
    if (!linkOk) { toast.error(t("toast.invalid_link")); return; }
    if (!qtyOk) { toast.error(`Quantity must be ${svc.min_qty}–${svc.max_qty}`); return; }
    if (!verified) { toast.error(t("toast.verify_first")); return; }
    setBusy(true);
    let response;
    try {
      response = await placeOrder({ data: { serviceId: svc.id, link: link.trim(), quantity: qn, idempotencyKey: idem.current } });
    } catch {
      setBusy(false);
      toast.error(friendlyError());
      return;
    }
    const { result: r, error } = response;
    setBusy(false);
    if (error) {
      if (error.includes("INSUFFICIENT_BALANCE")) {
        toast.error(t("toast.insufficient"));
        navigate({ to: "/add-funds" });
        return;
      }
      { toast.error(friendlyError(error)); return; }
    }
    if (!r) return;
    idem.current = newIdemKey();
    refreshProfile();
    setDone((r as { order_code: string }).order_code);
  };

  if (done) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CheckCircle2 className="mx-auto h-20 w-20 animate-in zoom-in text-success" />
        <h1 className="text-gradient mt-3 text-3xl font-bold">{t("success.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("success.order_id")}</p>
        <Copyable value={done} className="text-lg font-bold" />
        <div className="mt-6 grid gap-3">
          <Link to="/" className="btn-ghost-glow">{t("success.home")}</Link>
          <Link to="/orders" className="btn-glow">{t("success.history")}</Link>
          <button onClick={() => { setDone(null); setLink(""); setQty(""); }} className="text-sm font-semibold text-primary">{t("success.new")}</button>
        </div>
      </Card>
    );
  }

  if (isError) return <ErrorState />;
  if (!isLoading && !data) return <Empty text={t("service.unavailable", "This platform is not available.")} />;

  const filteredServices = svcs.filter((s) => `${s.service_no ?? ""} ${s.name}`.toLowerCase().includes(search.trim().toLowerCase()));
  const fields = (
    <>
      {desktop && <div className="desktop-form-search"><Search aria-hidden /><input aria-label={tr("Search for a service...")} placeholder={tr("Search for a service...")} value={search} onChange={(e) => setSearch(e.target.value)} /></div>}
        <div>
          <label className={labelCls}>{t("order.category")}</label>
          {isLoading ? <Skeleton className="h-12 rounded-2xl" /> : cats.length === 0 ? <Empty text={t("order.empty_categories")} /> : (
            <Select value={selectedCatId} onValueChange={(v) => { setCatId(v); setSvcId(""); }}>
              <SelectTrigger className="h-auto min-h-12 rounded-2xl px-3 py-2 text-left text-sm">
                <SelectValue placeholder={t("order.category_placeholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {cats.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="py-2.5 text-sm leading-snug">
                    <span className="flex items-center gap-2.5">
                      <PlatformIcon slug={platform} logo={data?.platform?.logo_url} name={data?.platform?.name} className="h-5 w-5 shrink-0" />
                      <span className="whitespace-normal">{c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div>
          <label className={labelCls}>{t("order.service")}</label>
          <Select value={svc?.id ?? ""} onValueChange={setSvcId} disabled={!selectedCatId || svcs.length === 0}>
            <SelectTrigger className="h-auto min-h-12 rounded-2xl px-3 py-2 text-left text-sm">
              <SelectValue placeholder={catId && svcs.length === 0 ? t("order.empty_services") : t("order.service_placeholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {filteredServices.map((s) => (
                <SelectItem key={s.id} value={s.id} className="py-2.5 text-sm leading-snug">
                  <span className="flex items-start gap-2.5">
                    <PlatformIcon slug={platform} logo={data?.platform?.logo_url} name={data?.platform?.name} className="mt-0.5 h-5 w-5 shrink-0" />
                    <span className="flex flex-col whitespace-normal">
                      <span className="font-medium">
                        {s.service_no != null && <span className="font-bold text-primary">{s.service_no} - </span>}
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{rateMoney(s.rate)} per {s.rate_per}</span>
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!desktop && svc?.description && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{svc.description}</p>}
        </div>

        <div>
          <label className={labelCls} htmlFor="link">{t("order.link")} ({data?.platform.name ?? platform})</label>
          <input id="link" className={inputCls} placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
          {link && !linkOk && <p className="mt-1 text-xs text-destructive">Enter a valid URL starting with https://</p>}
        </div>
        <div>
          <label className={labelCls} htmlFor="qty">{t("order.quantity")}</label>
          <input id="qty" inputMode="numeric" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} />
          <p className={`mt-1 text-xs ${qty && svc && !qtyOk ? "text-destructive" : "text-muted-foreground"}`}>Min: {svc?.min_qty ?? "—"} — Max: {svc?.max_qty ?? "—"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/60 px-3 py-3 text-sm">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5 text-primary" /> {t("order.avg_time")}</div>
            <div className="mt-1 font-semibold">{svc?.avg_time || "—"}</div>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-primary/5 px-3 py-3 text-center">
            <div className="text-xs text-muted-foreground">{t("order.total")}</div>
            <div className="text-gradient font-display text-2xl font-extrabold sm:text-3xl">{money(charge)}</div>
          </div>
        </div>
        {desktop ? <Button disabled={busy} onClick={submit} className="h-12 w-full rounded-lg">{busy && <Spinner />}{t("order.submit")}</Button> : <button disabled={busy} onClick={submit} className="btn-glow w-full !py-4 text-lg">{busy && <Spinner />} {t("order.submit")}</button>}
    </>
  );
  if (!desktop) return <div className="mx-auto max-w-2xl space-y-4"><div className="flex items-center gap-3"><button aria-label="Back" onClick={() => history.back()} className="rounded-full p-2 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button><PlatformIcon slug={platform} logo={data?.platform?.logo_url} name={data?.platform?.name} className="h-12 w-12" /><h1 className="text-gradient text-3xl font-bold">{data?.platform.name ?? "…"} {t("service.title_suffix")}</h1></div><Card className="space-y-4">{fields}</Card></div>;
  return <div className="desktop-order-panels">
    <section className="desktop-order-panel" aria-label={tr("New Order")}>
      <header className="desktop-panel-heading"><Button variant="secondary" className="rounded-md" onClick={() => document.querySelector<HTMLInputElement>(".desktop-form-search input")?.focus()}><ShoppingCart />{tr("New Order")}</Button><Button asChild variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"><Link to={user ? "/add-funds" : "/sign-in"}><PlusCircle />{tr("Add Funds")}</Link></Button></header>
      <div className="desktop-panel-body space-y-5">{fields}</div>
    </section>
    <section className="desktop-order-panel" aria-label={tr("Service Details")}>
      <header className="desktop-panel-heading"><ShieldCheck /><h2>{tr("Service Details")}</h2></header>
      <div className="desktop-panel-body space-y-5">
        <div><p className={labelCls}>{t("order.service")}</p><div className="desktop-detail-value">{svc ? `${svc.service_no ?? ""} — ${svc.name}` : t("order.service_placeholder")}</div></div>
        <div className="grid grid-cols-2 gap-4">
          {[{label: tr("Average time"), value: svc?.avg_time}, {label: tr("Rate"), value: svc ? `${rateMoney(svc.rate)} / ${svc.rate_per}` : null}, {label: tr("Guarantee"), value: svc?.refill_info}, {label: tr("Min-Max"), value: svc ? `${svc.min_qty.toLocaleString()} – ${svc.max_qty.toLocaleString()}` : null}].map((d) => <div key={d.label}><p className={labelCls}>{d.label}</p><div className="desktop-detail-value">{d.value || "—"}</div></div>)}
        </div>
        <div><p className={labelCls}>{tr("Services Details")}</p><div className="desktop-detail-value min-h-48 whitespace-pre-wrap leading-relaxed">{svc?.description || "—"}</div></div>
      </div>
    </section>
  </div>;
}
