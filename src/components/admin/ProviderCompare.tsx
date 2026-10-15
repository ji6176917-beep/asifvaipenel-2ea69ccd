import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Check } from "lucide-react";
import { toast } from "sonner";
import { adminCompareServices, adminEditProviderService, adminPickService } from "@/lib/admin-providers.functions";
import { Card, Empty, ErrorState, inputCls } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";

/** Compare one kind of service across every connected panel and choose which panel's service customers see. */
export function ProviderCompare() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const compare = useServerFn(adminCompareServices), pick = useServerFn(adminPickService), edit = useServerFn(adminEditProviderService);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["admin-compare", q], queryFn: () => compare({ data: { q } }), enabled: q.length >= 2 });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-compare"] });
  const keepOnly = async (id: string) => {
    try { await pick({ data: { keep: id, off: (data ?? []).map((r) => r.id) } }); toast.success("এই প্যানেলের সার্ভিসটি চালু, বাকিগুলো বন্ধ করা হয়েছে"); refresh(); }
    catch { toast.error("পরিবর্তন করা যায়নি"); }
  };
  const toggle = async (id: string, active: boolean) => {
    try { await edit({ data: { id, active } }); refresh(); } catch { toast.error("পরিবর্তন করা যায়নি"); }
  };
  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-semibold">প্যানেল তুলনা করে সার্ভিস বাছাই</h3>
        <p className="text-sm text-muted-foreground">সার্ভিসের ধরন লিখুন (যেমন: instagram followers)। সব প্যানেলের মিল থাকা সার্ভিস কম দাম থেকে সাজানো দেখাবে — যেটা ভালো, সেটা রাখুন।</p>
      </div>
      <form className="relative" onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); }}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input className={`${inputCls} pl-9 pr-24`} placeholder="যেমন: instagram likes" value={input} onChange={(e) => setInput(e.target.value)} />
        <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">খুঁজুন</Button>
      </form>
      {isError && <ErrorState />}
      {isLoading && <Skeleton className="h-32" />}
      {data && data.length === 0 && <Empty text="মিল পাওয়া যায়নি" />}
      {data && data.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{r.provider}</span>
                  <span className="text-xs text-muted-foreground">#{r.service_no ?? "—"} · {r.platform} · {r.category}</span>
                  {!r.available && <span className="text-xs text-destructive">প্যানেলে বন্ধ</span>}
                </div>
                <p className="mt-1 font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">সর্বনিম্ন {r.min} · সর্বোচ্চ {r.max}</p>
              </div>
              <div className="text-right font-semibold">{money(r.rate)}<span className="block text-xs font-normal text-muted-foreground">প্রতি {r.rate_per}</span></div>
              <Switch checked={r.active} aria-label="চালু/বন্ধ" onCheckedChange={(v) => void toggle(r.id, v)} />
              <Button size="sm" variant="outline" onClick={() => void keepOnly(r.id)}><Check className="h-4 w-4" /> শুধু এটা রাখুন</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
