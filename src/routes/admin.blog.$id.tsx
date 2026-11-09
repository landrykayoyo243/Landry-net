import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BlogPostEditor } from "@/components/admin/ProjectEditor";
import { EmptyState, ListLoading, LoadError } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { adminBlogPostQuery } from "@/lib/blog-data";

export const Route = createFileRoute("/admin/blog/$id")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Modifier l'article — Admin Landry Net" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(adminBlogPostQuery(params.id)),
  component: ModifierArticlePage,
});

function ModifierArticlePage() {
  const { id } = Route.useParams();
  const { data: row, isPending, isError, refetch } = useQuery(adminBlogPostQuery(id));

  if (isPending) return <ListLoading />;
  if (isError) return <LoadError onRetry={() => refetch()} />;
  if (!row) {
    return (
      <EmptyState
        title="Article introuvable"
        text="Cet article n'existe pas ou a été supprimé."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/blog">Retour aux articles</Link>
          </Button>
        }
      />
    );
  }

  return <BlogPostEditor key={row.id} row={row} />;
}
