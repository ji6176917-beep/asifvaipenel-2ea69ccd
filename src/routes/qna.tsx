import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, pickLang } from "@/lib/i18n";
import { Empty, PageTitle } from "@/components/ui-kit";
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
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>{t("qna.title", "QnA")}</PageTitle>
      {isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !data?.length ? <Empty text={tr("No questions yet.")} /> : (
        <div className="space-y-3">
          {data.map((q) => {
            const isOpen = open === q.id;
            return (
              <div key={q.id} className="glass rounded-3xl">
                <button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : q.id)} className="flex w-full items-center justify-between gap-3 p-5 text-left">
                  <span className="label-premium text-lg">{pickLang(q.question, lang)}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-primary transition ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <div className="md-content px-5 pb-5 text-muted-foreground"><ReactMarkdown>{pickLang(q.answer, lang)}</ReactMarkdown></div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
