import { createFileRoute } from "@tanstack/react-router";
import { BlogPostEditor } from "@/components/admin/ProjectEditor";

export const Route = createFileRoute("/admin/blog/nouveau")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Rédiger un article — Admin Landry Net" }, { name: "robots", content: "noindex" }],
  }),
  component: NouvelArticlePage,
});

function NouvelArticlePage() {
  return <BlogPostEditor row={null} />;
}
