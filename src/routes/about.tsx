import { createFileRoute } from "@tanstack/react-router";
import { CmsPage } from "@/components/CmsPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us | Premium Apex SMM World" },
      { name: "description", content: "Who we are and how we deliver." },
      { property: "og:title", content: "About Us | Premium Apex SMM World" },
      { property: "og:description", content: "Who we are and how we deliver." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Page,
});

function Page() {
  return <CmsPage slug="about" fallbackTitle="About Us" />;
}
