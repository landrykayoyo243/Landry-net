import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BlogPostEditor } from "@/components/admin/ProjectEditor";
import { adminBlogPostQuery } from "@/lib/blog-data";

export const Route = createFileRoute("/admin/blog/$id")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Modifier l'article — Admin Landry Net" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(adminBlogPostQuery(params.id)),
  component: ModifierArticlePage,
});

function ModifierArticlePage() {
  const { id } = Route.useParams();
  const { data: row } = useSuspenseQuery(adminBlogPostQuery(id));
  return <BlogPostEditor row={row} />;
}
