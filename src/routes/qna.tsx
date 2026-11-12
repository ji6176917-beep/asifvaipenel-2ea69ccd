import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import qnaArt from "@/assets/qna-help.png";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLang } from "@/lib/i18n";
import { Empty } from "@/components/ui-kit";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/qna")({
  head: () => ({
    meta: [
      { title: "QnA | Premium Apex SMM World" },
      { name: "description", content: "Answers to the most common questions about orders and payments." },
      { property: "og:title", content: "QnA | Premium Apex SMM World" },
      { property: "og:description", content: "Answers to the most common questions about orders and payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { lang, t, tr } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["qna"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("qna").select("id, question, answer").order("sort");
      if (error) throw error;
      return data;
    },
  });
  const items = [...(data ?? []), ...EXTRA.map((e, i) => ({ id: "extra-" + i, question: { en: e[0] }, answer: { en: e[1] } }))].slice(0, Math.max(12, data?.length ?? 0));
  return (
    <div className="space-y-5">
      <section className="page-banner"><div className="relative z-10"><h1>{t("qna.title", "QnA")}</h1><p>{tr("Answers to the most common questions about orders and payments.")}</p><div className="page-banner-stats"><span><MessageCircleQuestion className="mr-1 inline h-3 w-3" />{items.length} {tr("questions")}</span></div></div><img src={qnaArt} alt="" width={816} height={816} /></section>
      {isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !items.length ? <Empty text={tr("No questions yet.")} /> : (
        <div className="qna-grid">
          {items.map((q, i) => {
            const isOpen = open === q.id;
            return (
              <div key={q.id} className="qna-item" data-open={isOpen}>
                <button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
                  <span className="flex items-center gap-3"><span className="qna-num"><MessageCircleQuestion className="h-4 w-4" /></span><span className="qna-index">{i + 1}.</span><span className="font-semibold">{pickLang(q.question, lang)}</span></span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <div className="md-content border-t px-4 pb-4 pt-3 text-sm text-muted-foreground"><ReactMarkdown>{pickLang(q.answer, lang)}</ReactMarkdown></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EXTRA: [string, string][] = [
  ["How do I place an order?", "Open New Order, choose a platform, category and service, paste your link, enter the quantity and press Submit."],
  ["How do I add funds?", "Go to Add Funds, choose a payment method, pay the amount and submit the transaction ID."],
  ["How long does delivery take?", "Most services start within minutes. The average time is shown on every service."],
  ["What if my order is partial?", "The undelivered part is refunded to your balance automatically."],
  ["Can I cancel an order?", "Pending orders that have not started can be canceled from Order History for a full refund."],
  ["Is my account safe?", "Yes. We never ask for your social media passwords; only a public link is needed."],
  ["What is refill?", "Some services include refill. If counts drop within the refill period, open a ticket with your Order ID."],
  ["How do I contact support?", "Create a ticket from My Tickets or use the WhatsApp button. We reply 24/7."],
  ["Why is my deposit pending?", "Deposits are verified automatically; some methods need a few minutes or a manual check."],
  ["Do you have an API?", "Yes. Resellers can use the Reseller API from the menu to connect their own panel."],
  ["Can I order for any link?", "The link must be public. Private accounts or deleted posts cannot be delivered."],
  ["How do account levels work?", "Your level grows with total spending. Tap your badge to see all levels."],
];
