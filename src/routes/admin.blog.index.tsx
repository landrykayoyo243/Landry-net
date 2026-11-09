import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminBlogPostsQuery } from "@/lib/blog-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Tag,
  FileText,
  BookOpen,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/blog/")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Gestion du Blog — Admin Landry Net" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(adminBlogPostsQuery),
  component: AdminBlogIndex,
});

function formatDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function AdminBlogIndex() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const posts = useQuery(adminBlogPostsQuery).data ?? [];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const published = posts.filter((p) => p.status === "published").length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  async function handleDelete(id: string) {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast.error("Impossible de supprimer l'article.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin", "blog"] });
    await qc.invalidateQueries({ queryKey: ["blog"] });
    toast.success("Article supprimé.");
    setDeletingId(null);
  }

  async function handleToggleStatus(id: string, current: string) {
    setTogglingId(id);
    const newStatus = current === "published" ? "draft" : "published";
    const patch: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === "published") patch.published_at = new Date().toISOString();

    const { error } = await supabase.from("blog_posts").update(patch).eq("id", id);
    setTogglingId(null);
    if (error) {
      toast.error("Impossible de changer le statut.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin", "blog"] });
    await qc.invalidateQueries({ queryKey: ["blog"] });
    toast.success(newStatus === "published" ? "Article publié en ligne !" : "Article mis en brouillon.");
  }

  function openEditor(id: string) {
    void navigate({ to: "/admin/blog/$id", params: { id } });
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Articles du Blog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {published} publié{published > 1 ? "s" : ""} · {drafts} brouillon{drafts > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-xl cursor-pointer">
            <a href="/blog" target="_blank" rel="noopener noreferrer">
              <span>Voir le blog</span>
              <ArrowUpRight size={14} />
            </a>
          </Button>
          <Button asChild size="sm" className="gap-1.5 rounded-xl bg-gradient-primary shadow-sm cursor-pointer">
            <Link to="/admin/blog/nouveau">
              <Plus size={15} /> Nouvel article
            </Link>
          </Button>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total articles", value: posts.length, icon: BookOpen },
          { label: "Publiés", value: published, icon: Eye },
          { label: "Brouillons", value: drafts, icon: FileText },
          { label: "À la une", value: posts.filter((p) => p.featured).length, icon: Tag },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Icon size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste des articles */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen size={36} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-semibold text-foreground mb-1">Aucun article de blog</p>
          <p className="text-xs text-muted-foreground mb-4">
            Rédigez votre premier article technique avec l&apos;éditeur professionnel et l&apos;assistant IA.
          </p>
          <Button asChild size="sm" className="gap-1.5 rounded-xl bg-gradient-primary cursor-pointer">
            <Link to="/admin/blog/nouveau">
              <Plus size={14} /> Rédiger un article
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
          {posts.map((post) => (
            <div
              key={post.id}
              role="button"
              tabIndex={0}
              aria-label={`Modifier l'article ${post.title || "sans titre"}`}
              onClick={() => openEditor(post.id)}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEditor(post.id);
                }
              }}
              className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              {/* Miniature */}
              <div className="shrink-0 w-16 h-11 rounded-lg overflow-hidden border border-border bg-muted">
                {post.cover_url ? (
                  <img src={post.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-primary/40 text-sm font-bold">LN</div>
                )}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold ${
                      post.status === "published"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}
                  >
                    {post.status === "published" ? "Publié" : "Brouillon"}
                  </span>
                  {post.featured && (
                    <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary">
                      ★ À la une
                    </span>
                  )}
                  {post.category && (
                    <span className="text-[11px] text-muted-foreground font-medium">{post.category}</span>
                  )}
                </div>

                <p className="font-semibold text-sm text-foreground truncate mt-0.5">{post.title || "Article sans titre"}</p>

                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {formatDate(post.published_at || post.created_at)}
                  </span>
                  {post.reading_time > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {post.reading_time} min
                    </span>
                  )}
                  <span className="text-muted-foreground/60 font-mono">/blog/{post.slug}</span>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={togglingId === post.id}
                  onClick={() => handleToggleStatus(post.id, post.status)}
                  className="h-9 w-9 cursor-pointer"
                  title={post.status === "published" ? "Mettre en brouillon" : "Publier"}
                  aria-label={post.status === "published" ? "Mettre en brouillon" : "Publier l'article"}
                >
                  {togglingId === post.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : post.status === "published" ? (
                    <EyeOff size={14} />
                  ) : (
                    <Eye size={14} />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditor(post.id)}
                  className="h-9 w-9 cursor-pointer"
                  title="Modifier l'article"
                  aria-label="Modifier l'article"
                >
                  <Pencil size={14} />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingId(post.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Supprimer l'article"
                  aria-label="Supprimer l'article"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation de suppression */}
      <AlertDialog open={Boolean(deletingId)} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L&apos;article sera définitivement supprimé de la base de données et du blog public.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl cursor-pointer">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
