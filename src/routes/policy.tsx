import { createFileRoute, Link } from "@tanstack/react-router";
import { CmsPage } from "@/components/CmsPage";

export const Route = createFileRoute("/policy")({
  head: () => ({
    meta: [
      { title: "Policy, Terms & Refunds | Premium SMM Store" },
      { name: "description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:title", content: "Policy, Terms & Refunds | Premium SMM Store" },
      { property: "og:description", content: "Our terms of service, privacy policy and refund rules." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <CmsPage slug="policy" fallbackTitle="Policy" />
      <div className="mx-auto flex max-w-2xl flex-wrap gap-2">
        {[["terms", "Terms of Service"], ["privacy", "Privacy Policy"], ["refund", "Refund & Delivery Policy"], ["api-policy", "API Policy"]].map(([s, l]) => (
          <Link key={s} to="/p/$slug" params={{ slug: s! }} className="btn-ghost-glow !py-2 text-sm">{l}</Link>
        ))}
      </div>
    </div>
  );
}
