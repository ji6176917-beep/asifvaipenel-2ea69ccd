import { createFileRoute } from "@tanstack/react-router";
import { OrderForm } from "@/components/OrderForm";

export const Route = createFileRoute("/_authenticated/service/$platform")({
  head: ({ params }) => {
    const n = params.platform.charAt(0).toUpperCase() + params.platform.slice(1);
    return {
      meta: [
        { title: `${n} Services | Premium Apex SMM World` },
        { name: "description", content: `Order ${n} growth services, delivered manually by our team.` },
        { property: "og:title", content: `${n} Services | Premium Apex SMM World` },
        { property: "og:description", content: `Buy ${n} followers, likes and more.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { platform } = Route.useParams();
  return <OrderForm key={platform} platform={platform} />;
}
