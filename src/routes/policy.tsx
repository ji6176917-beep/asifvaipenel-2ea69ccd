import { createFileRoute, Link } from "@tanstack/react-router";
import { CmsPage } from "@/components/CmsPage";
import { useTr } from "@/lib/i18n";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy, Terms & Refunds | Premium Apex SMM World" },
      { name: "description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:title", content: "Policy, Terms & Refunds | Premium Apex SMM World" },
      { property: "og:description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const tr = useTr();
  const links: [string, string][] = [["terms", "Terms of Service"], ["privacy", "Privacy Policy"], ["refund", "Refund & Delivery Policy"], ["api-policy", "API Policy"]];
  return (
    <div className="space-y-4">
      <CmsPage slug="policy" fallbackTitle="Policy" />
      <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
        {links.map(([s, l]) => (
          <Link key={s} to="/p/$slug" params={{ slug: s! }} className="btn-ghost-glow !py-2 text-sm">{tr(l)}</Link>
        ))}
      </div>
    </div>
  );
}
