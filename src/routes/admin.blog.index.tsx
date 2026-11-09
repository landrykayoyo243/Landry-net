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
  ExternalLink,
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
        <div className="space-y-2.5">
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
              className="group relative flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* Contenu principal cliquable pour éditer */}
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                {/* Miniature */}
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/80">
                  {post.cover_url ? (
                    <img
                      src={post.cover_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-accent to-secondary text-primary font-bold text-xs uppercase">
                      LN
                    </div>
                  )}
                </div>

                {/* Informations */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    {post.featured && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                        ★ À la une
                      </span>
                    )}
                    <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                      {post.title || "Article sans titre"}
                    </p>
                  </div>

                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <span>{post.category || "Technologie"}</span>
                    <span className="text-border">·</span>
                    <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]">/blog/{post.slug}</code>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} /> {formatDate(post.published_at || post.created_at)}
                    </span>
                    {post.reading_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {post.reading_time} min
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions alignées comme sur les cartes de projets */}
              <div
                className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-border/40 sm:border-0 sm:pt-0 sm:shrink-0"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Button
                  type="button"
                  variant="ghost"
                  disabled={togglingId === post.id}
                  onClick={() => handleToggleStatus(post.id, post.status)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-all cursor-pointer ${
                    post.status === "published"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                      : "border-border bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                  title={post.status === "published" ? "Cliquer pour passer en brouillon" : "Cliquer pour publier"}
                  aria-label={post.status === "published" ? "Mettre en brouillon" : "Publier l'article"}
                >
                  {togglingId === post.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <span className={`h-1.5 w-1.5 rounded-full ${post.status === "published" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                  )}
                  {post.status === "published" ? "Publié" : "Brouillon"}
                </Button>

                <div className="flex items-center gap-1">
                  {post.status === "published" && (
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Voir l'article en ligne"
                    >
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" aria-label="Voir l'article en ligne">
                        <ExternalLink size={15} />
                      </a>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditor(post.id)}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Modifier l'article"
                    aria-label="Modifier l'article"
                  >
                    <Pencil size={15} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(post.id)}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Supprimer définitivement"
                    aria-label="Supprimer l'article"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
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
