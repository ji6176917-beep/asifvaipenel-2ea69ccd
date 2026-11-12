import boxArt from "@/assets/orders-box.png";
import growthArt from "@/assets/social-growth.webp";
import { Trash2 } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Copy, RefreshCw, KeyRound, Link2, BookOpen, ShieldCheck, Code2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { settingsQuery } from "@/lib/queries";
import { copy, money } from "@/lib/format";
import { Card, PageTitle, Spinner } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useTr } from "@/lib/i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/reseller-api")({
  head: () => ({
    meta: [
      { title: "Reseller API | Premium Apex SMM World" },
      { name: "description", content: "Your personal API key, endpoint and full documentation for reselling our services." },
      { property: "og:title", content: "Reseller API | Premium Apex SMM World" },
      { property: "og:description", content: "Resell our SMM services through a simple JSON API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiPage,
});

const ERRS: Record<string, string> = { API_OFF: "The reseller API is turned off right now.", NEW_KEYS_CLOSED: "New API keys are not being issued right now. Contact support.", API_DISABLED: "API access has been disabled for your account. Contact support.", ACCOUNT_SUSPENDED: "Your account is suspended." };

function Code({ children }: { children: string }) {
  const tr = useTr();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-border bg-background/70 p-4 pr-12 text-xs leading-relaxed"><code>{children}</code></pre>
      <Button variant="ghost" size="icon" aria-label={tr("Copy code")} title={tr("Copy code")} onClick={() => copy(children)} className="absolute right-2 top-2 text-muted-foreground"><Copy className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function ParameterTable({ rows }: { rows: [string, string, string][] }) {
  const tr = useTr();
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60"><tr>
          {["Parameter", "Value", "Description"].map((heading) => <th key={heading} scope="col" className="border-b border-border px-4 py-3 font-semibold">{tr(heading)}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border">
          {rows.map(([parameter, value, description]) => <tr key={`${parameter}-${value}`}>
            <th scope="row" className="px-4 py-3 align-top font-mono font-medium text-primary">{parameter}</th>
            <td className="px-4 py-3 align-top font-mono text-xs">{value}</td>
            <td className="min-w-40 px-4 py-3 align-top text-muted-foreground">{tr(description)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function ApiPage() {
  const tr = useTr();
  const { profile } = useAuth();
  const { data: settings } = useQuery({ ...settingsQuery, refetchInterval: 15_000 });
  const qc = useQueryClient();
  const [show, setShow] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = settings?.api_url || `${origin}/api/public/v2`;

  const { data: key, error, isLoading } = useQuery({
    queryKey: ["my-api-key"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_api_key");
      if (error) throw new Error(Object.keys(ERRS).find((k) => error.message.includes(k)) ?? "FAIL");
      return (data as string | null) ?? null;
    },
    retry: false,
  });

  const regenerate = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("ensure_my_api_key", { _regenerate: true });
    setBusy(false); setConfirm(false);
    if (error) { toast.error("Could not regenerate key"); return; }
    qc.setQueryData(["my-api-key"], data);
    setShow(true);
    toast.success("New API key created — the old one no longer works");
  };

  const generate = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("ensure_my_api_key", { _regenerate: false });
    setBusy(false);
    if (error) { toast.error(tr(ERRS[Object.keys(ERRS).find((x) => error.message.includes(x)) ?? ""] ?? "Could not create API key")); return; }
    qc.setQueryData(["my-api-key"], data); setShow(true);
    toast.success(tr("API key created"));
  };
  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("delete_my_api_key");
    setBusy(false); setDel(false);
    if (error) { toast.error(tr("Could not delete API key")); return; }
    qc.setQueryData(["my-api-key"], null);
    toast.success(tr("API key deleted"));
  };

  const k = "YOUR_API_KEY";
  const masked = key ? key.slice(0, 6) + "•".repeat(20) + key.slice(-4) : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="page-banner page-banner--multi"><div className="relative z-10"><h1>{tr("Reseller API")}</h1><p>{tr("Sell our services on your own panel, website or bot.")}</p><div className="page-banner-stats"><span>{tr("Fast API")}</span><span>{tr("Same balance")}</span><span>{tr("24/7 support")}</span></div></div><div className="banner-art-stack"><img src={boxArt} alt="" /><img src={growthArt} alt="" /></div></section>

      <Card className="space-y-4">
        <div>
          <div className="label-premium mb-1.5 flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" /> Your API key</div>
          {isLoading ? <div className="h-12 animate-pulse rounded-2xl bg-muted" />
            : error ? <p className="text-sm text-destructive">{ERRS[(error as Error).message] ?? "Could not load your API key. Refresh to try again."}</p>
            : (
              !key ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-accent/40 px-4 py-4"><span className="text-sm text-muted-foreground">{tr("You have no API key yet.")}</span><Button onClick={generate} disabled={busy}>{busy && <Spinner />}<KeyRound className="h-4 w-4" />{tr("Generate API key")}</Button></div> :
              <div className="flex items-center gap-2">
                <button onClick={() => key && copy(key)} className="min-w-0 flex-1 truncate rounded-2xl border border-input bg-background/60 px-4 py-3 text-left font-mono text-sm" aria-label="Copy API key">
                  {show ? key : masked}
                </button>
                <button aria-label={show ? "Hide key" : "Show key"} onClick={() => setShow(!show)} className="btn-ghost-glow !px-3">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button aria-label="Copy key" onClick={() => key && copy(key)} className="btn-ghost-glow !px-3"><Copy className="h-4 w-4" /></button>
                <button aria-label={tr("Delete API key")} title={tr("Delete API key")} onClick={() => setDel(true)} className="btn-ghost-glow !px-3 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          {key && <button onClick={() => setConfirm(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><RefreshCw className="h-3.5 w-3.5" /> Regenerate key</button>}
        </div>
        <div>
          <div className="label-premium mb-1.5 flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> API URL</div>
          <button onClick={() => copy(url)} className="w-full truncate rounded-2xl border border-input bg-background/60 px-4 py-3 text-left font-mono text-sm">{url}</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent/50 px-4 py-3 text-sm">
          <span>API balance (same as your account): <b className="text-primary">{money(profile?.balance ?? 0)}</b></span>
          <Link to="/add-funds" className="btn-glow !px-4 !py-1.5 text-sm">Add Funds</Link>
        </div>
      </Card>

      {settings?.api_docs && <Card><div className="md-content"><ReactMarkdown>{settings.api_docs}</ReactMarkdown></div></Card>}
      {settings?.api_instructions && <Card><div className="md-content"><ReactMarkdown>{settings.api_instructions}</ReactMarkdown></div></Card>}
      {settings?.api_examples && <Card><div className="md-content"><ReactMarkdown>{settings.api_examples}</ReactMarkdown></div></Card>}

      <section className="space-y-6 border-t border-border pt-6" aria-labelledby="api-documentation">
        <div className="space-y-3">
          <h2 id="api-documentation" className="flex items-center gap-2 text-xl font-semibold"><BookOpen className="h-5 w-5 text-primary" />{tr("Documentation")}</h2>
          <ParameterTable rows={[
            ["HTTP method", "GET / POST", "POST accepts form data or JSON. GET accepts query parameters."],
            ["Response", "JSON", "All responses, including errors, return HTTP 200 with a JSON body."],
            ["Authentication", "key", "Include your API key with every request."],
          ]} />
        </div>
        <section className="space-y-4 border-t border-border pt-6" aria-labelledby="api-services">
          <h3 id="api-services" className="text-lg font-semibold">{tr("Services")} <code className="ml-2 text-sm font-normal text-muted-foreground">services</code></h3>
          <ParameterTable rows={[
            ["key", "YOUR_API_KEY", "Required. Your API key."],
            ["action", "services", "Required. Returns the active service catalog."],
          ]} />
          <h4 className="text-sm font-semibold">{tr("Response example")}</h4>
          <Code>{`[
  {
    "service": 101,
    "name": "Instagram Followers",
    "type": "Default",
    "category": "Instagram - Followers",
    "rate": "1.2",
    "min": "100",
    "max": "10000",
    "refill": false,
    "cancel": false
  }
]`}</Code>
        </section>
        <section className="space-y-4 border-t border-border pt-6" aria-labelledby="api-add">
          <h3 id="api-add" className="text-lg font-semibold">{tr("Add order")} <code className="ml-2 text-sm font-normal text-muted-foreground">add</code></h3>
          <ParameterTable rows={[
            ["key", "YOUR_API_KEY", "Required. Your API key."],
            ["action", "add", "Required. Places a new order."],
            ["service", "101", "Required. Integer service ID from the services response."],
            ["link", "https://instagram.com/username", "Required. Full public profile or post URL."],
            ["quantity", "1000", "Required. Integer quantity within the service minimum and maximum."],
          ]} />
          <h4 className="text-sm font-semibold">{tr("Response example")}</h4>
          <Code>{`{
  "order": 4829103756
}`}</Code>
        </section>
        <section className="space-y-4 border-t border-border pt-6" aria-labelledby="api-status">
          <h3 id="api-status" className="text-lg font-semibold">{tr("Order status")} <code className="ml-2 text-sm font-normal text-muted-foreground">status</code></h3>
          <ParameterTable rows={[
            ["key", "YOUR_API_KEY", "Required. Your API key."],
            ["action", "status", "Required. Returns order status."],
            ["order", "4829103756", "Required for a single order. Use order or orders, not both."],
            ["orders", "4829103756,4829103757", "Alternative to order. Up to 100 comma-separated order IDs; results are keyed by order ID."],
          ]} />
          <p className="text-sm text-muted-foreground">{tr("Statuses")}: <code>Pending</code>, <code>In progress</code>, <code>Completed</code>, <code>Partial</code>, <code>Canceled</code>.</p>
          <h4 className="text-sm font-semibold">{tr("Single order response")}</h4>
          <Code>{`{
  "charge": "1.20000",
  "start_count": "0",
  "status": "Partial",
  "remains": "300",
  "currency": "USD"
}`}</Code>
          <h4 className="text-sm font-semibold">{tr("Multiple orders response")}</h4>
          <Code>{`{
  "4829103756": {
    "charge": "1.20000",
    "start_count": "0",
    "status": "Completed",
    "remains": "0",
    "currency": "USD"
  },
  "4829103757": { "error": "Incorrect order ID" }
}`}</Code>
        </section>
        <section className="space-y-4 border-t border-border pt-6" aria-labelledby="api-balance">
          <h3 id="api-balance" className="text-lg font-semibold">{tr("Balance")} <code className="ml-2 text-sm font-normal text-muted-foreground">balance</code></h3>
          <ParameterTable rows={[
            ["key", "YOUR_API_KEY", "Required. Your API key."],
            ["action", "balance", "Required. Returns your account balance and currency."],
          ]} />
          <h4 className="text-sm font-semibold">{tr("Response example")}</h4>
          <Code>{`{
  "balance": "48.80",
  "currency": "USD"
}`}</Code>
        </section>
        <section className="space-y-4 border-t border-border pt-6" aria-labelledby="api-errors">
          <h3 id="api-errors" className="text-lg font-semibold">{tr("Errors")}</h3>
          <ParameterTable rows={[
            ["error", "Invalid API key", "The API key is missing or invalid."],
            ["error", "Incorrect request", "The action or request parameters are invalid."],
            ["error", "Incorrect order ID", "The order does not exist or does not belong to your account."],
            ["error", "Insufficient balance. Add funds to your account first.", "Your account does not have enough funds for the order."],
            ["error", "Rate limit exceeded", "The request limit has been exceeded."],
          ]} />
          <p className="text-sm text-muted-foreground">{tr("Requests per minute")}: {settings?.api_rate_per_min ?? 60}</p>
          <Code>{`{
  "error": "Invalid API key"
}`}</Code>
        </section>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><Code2 className="h-5 w-5 text-primary" /> Code samples</h2>

          <section className="space-y-3"><h3 className="text-sm font-semibold">{tr("cURL")}</h3><Code>{`curl -X POST "${url}" \\\n  -d key=${k} \\\n  -d action=add \\\n  -d service=SERVICE_ID \\\n  -d link=https://instagram.com/username \\\n  -d quantity=1000`}</Code></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{tr("PHP")}</h3><Code>{`<?php\n$ch = curl_init("${url}");\ncurl_setopt($ch, CURLOPT_POST, true);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\ncurl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([\n  "key" => "${k}",\n  "action" => "balance",\n]));\n$res = json_decode(curl_exec($ch), true);\necho $res["balance"];`}</Code></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{tr("Python")}</h3><Code>{`import requests\n\nr = requests.post("${url}", data={\n    "key": "${k}",\n    "action": "status",\n    "order": "4829103756",\n})\nprint(r.json())`}</Code></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{tr("Node.js")}</h3><Code>{`const res = await fetch("${url}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ key: "${k}", action: "services" }),\n});\nconsole.log(await res.json());`}</Code></section>
          <section className="space-y-3"><h3 className="text-sm font-semibold">{tr("Telegram bot")}</h3><Code>{`# pip install python-telegram-bot requests\nimport requests\nfrom telegram.ext import ApplicationBuilder, CommandHandler\n\nAPI = "${url}"\nKEY = "${k}"\n\nasync def balance(update, ctx):\n    r = requests.post(API, data={"key": KEY, "action": "balance"}).json()\n    await update.message.reply_text(f"Balance: {r.get('balance', r.get('error'))}")\n\nasync def order(update, ctx):\n    service, link, qty = ctx.args\n    r = requests.post(API, data={"key": KEY, "action": "add",\n        "service": service, "link": link, "quantity": qty}).json()\n    await update.message.reply_text(str(r))\n\napp = ApplicationBuilder().token("BOT_TOKEN").build()\napp.add_handler(CommandHandler("balance", balance))\napp.add_handler(CommandHandler("order", order))\napp.run_polling()`}</Code></section>
      </section>

      <Card>
        <h2 className="label-premium mb-3 flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" /> Rules & API Policy</h2>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Add funds to this account first — every API order is charged from its balance.</li>
          <li>Orders are delivered manually by our team and appear in your Order History.</li>
          <li>Keep your key secret. If it leaks, regenerate it — the old key stops working at once.</li>
          <li>Use public profile or post links in full https:// form.</li>
        </ul>
        <div className="md-content"><ReactMarkdown>{settings?.api_policy ?? ""}</ReactMarkdown></div>
      </Card>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate API key?</AlertDialogTitle>
            <AlertDialogDescription>Your current key will stop working immediately. Any panel or bot using it must be updated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); regenerate(); }} disabled={busy}>{busy && <Spinner />} Regenerate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("Delete API key?")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("This key stops working immediately. You can generate a new one any time.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} disabled={busy}>{busy && <Spinner />} {tr("Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
