import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { adminActivateServices, adminListDraftServices } from "@/lib/admin-services.functions";
import { Card, Empty, ErrorState, PageTitle, Spinner } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformIcon } from "@/lib/brand";
import { money } from "@/lib/format";

export function AdminServices() {
  const list = useServerFn(adminListDraftServices);
  const activate = useServerFn(adminActivateServices);
  const qc = useQueryClient();
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-draft-services"], queryFn: () => list() });
  const all = data ?? [];
  const groups = new Map<string, typeof all>();
  for (const s of all) groups.set(`${s.platform} · ${s.category}`, [...(groups.get(`${s.platform} · ${s.category}`) ?? []), s]);
  const toggle = (ids: string[], on: boolean) => setSel((x) => on ? [...new Set([...x, ...ids])] : x.filter((i) => !ids.includes(i)));
  const go = async () => {
    setBusy(true);
    try {
      const r = await activate({ data: { ids: sel } });
      toast.success(`${r.count} services activated — now visible to customers`);
      setSel([]); qc.invalidateQueries({ queryKey: ["admin-draft-services"] });
    } catch { toast.error("Could not activate"); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <PageTitle>Services</PageTitle>
      {isError ? <ErrorState /> : isLoading ? <Skeleton className="h-40 rounded-3xl" /> : !all.length ? <Empty text="No draft services need review." /> : (<>
        <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm backdrop-blur">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <span className="font-semibold">{all.length} draft services need review</span>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={sel.length === all.length} onChange={(e) => toggle(all.map((s) => s.id), e.target.checked)} /> Select all</label>
          <button disabled={!sel.length || busy} onClick={go} className="btn-glow ml-auto !px-4 !py-1.5 text-sm">{busy ? <Spinner /> : <Check className="h-4 w-4" />} Activate selected ({sel.length})</button>
        </div>
        <p className="text-xs text-muted-foreground">Prices are placeholders — review before activating.</p>
        {[...groups].map(([name, items]) => (
          <Card key={name} className="!p-4">
            <label className="mb-2 flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={items.every((s) => sel.includes(s.id))} onChange={(e) => toggle(items.map((s) => s.id), e.target.checked)} />
              <PlatformIcon slug={items[0]!.slug} className="h-5 w-5" /> {name}
            </label>
            <div className="space-y-1">
              {items.map((s) => (
                <label key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-accent">
                  <input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => toggle([s.id], e.target.checked)} />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{money(s.rate)} / {s.rate_per} · {s.min_qty}–{s.max_qty} · {s.avg_time}</span>
                </label>
              ))}
            </div>
          </Card>
        ))}
      </>)}
    </div>
  );
}
