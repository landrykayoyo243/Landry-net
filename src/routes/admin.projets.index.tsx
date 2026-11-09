import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SortableList } from "@/components/admin/SortableList";
import { ConfirmDelete, EmptyState, ListLoading, LoadError, PageHeader, Toolbar, applyListView, type SortKey } from "@/components/admin/ui";
import { adminProjectsQuery, saveOrder, type ProjectRow } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/projets/")({ component: ProjectsAdmin });

function ProjectsAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isPending, isError, refetch } = useQuery(adminProjectsQuery);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("order");
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);
  const [busy, setBusy] = useState(false);
  const view = useMemo(
    () => applyListView(data ?? [], search, sort, (p) => `${p.title} ${p.tag} ${p.slug} ${p.technologies.join(" ")}`, (p) => p.title),
    [data, search, sort]
  );
  const canReorder = sort === "order" && !search.trim();
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["admin"] }), qc.invalidateQueries({ queryKey: ["public"] })]);

  async function reorder(items: ProjectRow[]) {
    qc.setQueryData(adminProjectsQuery.queryKey, items.map((p, i) => ({ ...p, sort_order: i })));
    try {
      await saveOrder("projects", items);
      toast.success("Ordre enregistré");
    } catch {
      toast.error("L'ordre n'a pas pu être enregistré.");
    }
    await refresh();
  }

  async function togglePublish(p: ProjectRow) {
    const nextStatus = p.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("projects").update({ status: nextStatus }).eq("id", p.id);
    if (error) {
      toast.error("Modification impossible. Réessayez.");
    } else {
      toast.success(nextStatus === "published" ? "Projet publié en ligne" : "Projet masqué (brouillon)");
    }
    await refresh();
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from("projects").delete().eq("id", deleting.id);
    setBusy(false);
    if (error) {
      toast.error("Suppression impossible. Réessayez.");
      return;
    }
    toast.success("Projet supprimé");
    setDeleting(null);
    await refresh();
  }

  const add = (
    <Button asChild className="min-h-11 rounded-full bg-gradient-primary">
      <Link to="/admin/projets/nouveau">
        <Plus size={16} /> Nouveau projet
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Projets" text="Études de cas affichées sur l'accueil et la page Projets." action={add} />
      <Toolbar search={search} onSearch={setSearch} sort={sort} onSort={setSort} count={view.length} />
      {!canReorder && (data?.length ?? 0) > 1 && (
        <p className="mb-4 text-xs text-muted-foreground">
          💡 Glisser-déposer disponible avec le tri « Ordre d'affichage » sans recherche active.
        </p>
      )}

      {isPending ? (
        <ListLoading />
      ) : isError ? (
        <LoadError onRetry={() => refetch()} />
      ) : view.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucun projet"}
          text={search ? "Essayez un autre mot-clé." : "Créez votre première étude de cas."}
          action={search ? undefined : add}
        />
      ) : (
        <div className="space-y-2.5">
          <SortableList
            items={view}
            onReorder={reorder}
            disabled={!canReorder}
            render={(p, handle) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate({ to: "/admin/projets/$id", params: { id: p.id } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate({ to: "/admin/projets/$id", params: { id: p.id } });
                  }
                }}
                className="group relative flex flex-col gap-3.5 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:bg-accent/5 cursor-pointer sm:flex-row sm:items-center sm:justify-between"
              >
                {/* Contenu principal cliquable pour éditer */}
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  {canReorder && (
                    <div onClick={(e) => e.stopPropagation()} className="cursor-grab active:cursor-grabbing">
                      {handle}
                    </div>
                  )}

                  {/* Miniature */}
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border/80">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-gradient-to-br from-accent to-secondary text-primary font-bold text-xs uppercase">
                        {p.slug.slice(0, 3)}
                      </div>
                    )}
                  </div>

                  {/* Informations */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {p.featured && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                          <Star size={11} className="fill-amber-400" />
                          À la une
                        </span>
                      )}
                      <p className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">
                        {p.title}
                      </p>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span>{p.tag}</span>
                      <span className="text-border">·</span>
                      <code className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[11px]">/{p.slug}</code>
                    </div>

                    {p.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.technologies.slice(0, 2).map((t: string) => (
                          <span
                            key={t}
                            className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {t}
                          </span>
                        ))}
                        {p.technologies.slice(2, 4).map((t: string) => (
                          <span
                            key={t}
                            className="hidden sm:inline-block rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {t}
                          </span>
                        ))}
                        {p.technologies.length > 2 && (
                          <span className="sm:hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            +{p.technologies.length - 2}
                          </span>
                        )}
                        {p.technologies.length > 4 && (
                          <span className="hidden sm:inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            +{p.technologies.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions propres et bien espacées */}
                <div
                  className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-border/40 sm:border-0 sm:pt-0 sm:shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Badge statut interactif (clic pour basculer publié/brouillon) */}
                  <button
                    type="button"
                    onClick={() => togglePublish(p)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      p.status === "published"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border"
                    }`}
                    title={p.status === "published" ? "Cliquer pour masquer (passer en brouillon)" : "Cliquer pour publier"}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${p.status === "published" ? "bg-emerald-500" : "bg-muted-foreground"}`}
                    />
                    {p.status === "published" ? "Publié" : "Brouillon"}
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Voir sur le site public */}
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                      title="Voir le projet en ligne"
                    >
                      <a href={`/projets/${p.slug}`} target="_blank" rel="noreferrer" aria-label="Voir la page publique">
                        <ExternalLink size={15} />
                      </a>
                    </Button>

                    {/* Supprimer */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Supprimer le projet"
                      title="Supprimer définitivement"
                      onClick={() => setDeleting(p)}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        label={deleting?.title ?? ""}
        onConfirm={remove}
        busy={busy}
      />
    </>
  );
}
