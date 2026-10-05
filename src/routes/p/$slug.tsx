import { createFileRoute } from "@tanstack/react-router";
import { CmsPage } from "@/components/CmsPage";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => {
    const t = params.slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      meta: [
        { title: `${t} | Premium Apex SMM World` },
        { name: "description", content: `${t} — Premium Apex SMM World.` },
        { property: "og:title", content: `${t} | Premium Apex SMM World` },
        { property: "og:description", content: `${t} — Premium Apex SMM World.` },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  return <CmsPage slug={slug} fallbackTitle="Page" />;
}
