import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Camera, ImageIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { IMMERSION_KEY, type PublicImmersionItem } from "@/lib/content.queries";
import { uploadToCloudinary, validateImage } from "@/lib/cloudinary";
import { SortableList } from "@/components/admin/SortableList";
import {
  ConfirmDelete,
  EmptyState,
  ListLoading,
  LoadError,
  PageHeader,
  Toolbar,
  type SortKey,
} from "@/components/admin/ui";

export const Route = createFileRoute("/admin/immersion")({
  component: ImmersionAdminPage,
});

function useAdminImmersion() {
  return useQuery({
    queryKey: ["admin", "settings", IMMERSION_KEY],
    queryFn: async (): Promise<PublicImmersionItem[]> => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", IMMERSION_KEY)
        .maybeSingle();
      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        return (data.value as PublicImmersionItem[]).sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
      }
      return [];
    },
  });
}

function ImmersionAdminPage() {
  const qc = useQueryClient();
  const { data = [], isPending, isError, refetch } = useAdminImmersion();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("order");
  const [editing, setEditing] = useState<PublicImmersionItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<PublicImmersionItem | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [published, setPublished] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit(item: PublicImmersionItem | "new") {
    if (item === "new") {
      setTitle("");
      setTag("Infrastructure");
      setImageUrl("");
      setImageAlt("");
      setPublished(true);
    } else {
      setTitle(item.title);
      setTag(item.tag);
      setImageUrl(item.image_url);
      setImageAlt(item.image_alt ?? "");
      setPublished(item.published);
    }
    setUploadProgress(null);
    setIsUploading(false);
    setEditing(item);
  }

  async function persist(newItems: PublicImmersionItem[], successMsg?: string) {
    const { error } = await supabase.from("app_settings").upsert({
      key: IMMERSION_KEY,
      value: newItems,
      updated_at: new Date().toISOString(),
    });
    if (error) { toast.error("Erreur lors de la sauvegarde."); return false; }
    if (successMsg) toast.success(successMsg);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "settings", IMMERSION_KEY] }),
      qc.invalidateQueries({ queryKey: ["public", "immersion"] }),
    ]);
    return true;
  }

  const filtered = useMemo(() => {
    let items = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (it) => it.title.toLowerCase().includes(q) || it.tag.toLowerCase().includes(q),
      );
    }
    if (sort === "title") items.sort((a, b) => a.title.localeCompare(b.title, "fr"));
    else if (sort === "recent") items.reverse();
    else items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return items;
  }, [data, search, sort]);

  const canReorder = sort === "order" && !search.trim();

  async function handleReorder(reordered: PublicImmersionItem[]) {
    const updated = reordered.map((item, index) => ({ ...item, sort_order: index }));
    qc.setQueryData(["admin", "settings", IMMERSION_KEY], updated);
    await persist(updated, "Ordre enregistre");
  }

  async function togglePublish(item: PublicImmersionItem) {
    const updated = data.map((b) => (b.id === item.id ? { ...b, published: !b.published } : b));
    await persist(updated, item.published ? "Masque" : "Publie");
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const updated = data
      .filter((b) => b.id !== deleting.id)
      .map((item, idx) => ({ ...item, sort_order: idx }));
    const ok = await persist(updated, "Photo supprimee");
    setBusy(false);
    if (ok) setDeleting(null);
  }

  async function handleFileUpload(file: File) {
    const err = validateImage(file, 5);
    if (err) { toast.error(err); return; }
    try {
      setIsUploading(true);
      setUploadProgress(15);
      const result = await uploadToCloudinary(file, "image", (pct) => setUploadProgress(pct), "immersion");
      setImageUrl(result.secure_url);
      if (!imageAlt) setImageAlt(file.name.replace(/\.[^/.]+$/, ""));
      setUploadProgress(null);
      setIsUploading(false);
      toast.success("Image televersee !");
    } catch (e) {
      setIsUploading(false);
      setUploadProgress(null);
      toast.error(e instanceof Error ? e.message : "Echec de l upload.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Le titre est obligatoire."); return; }
    if (!tag.trim()) { toast.error("La categorie est obligatoire."); return; }
    if (!imageUrl.trim()) { toast.error("Veuillez ajouter une image."); return; }

    setBusy(true);
    let updated: PublicImmersionItem[];
    if (editing === "new") {
      const newItem: PublicImmersionItem = {
        id: crypto.randomUUID(),
        title: title.trim(),
        tag: tag.trim(),
        image_url: imageUrl.trim(),
        image_alt: imageAlt.trim() || title.trim(),
        published,
        sort_order: data.length,
      };
      updated = [...data, newItem];
    } else if (editing) {
      updated = data.map((b) =>
        b.id === editing.id
          ? { ...b, title: title.trim(), tag: tag.trim(), image_url: imageUrl.trim(), image_alt: imageAlt.trim() || title.trim(), published }
          : b,
      );
    } else {
      setBusy(false);
      return;
    }

    const ok = await persist(updated, editing === "new" ? "Realisation ajoutee" : "Enregistre");
    setBusy(false);
    if (ok) setEditing(null);
  }

  const addButton = (
    <Button onClick={() => openEdit("new")} className="min-h-11 rounded-full bg-gradient-primary">
      <Plus size={16} /> Ajouter
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Immersion terrain"
        text="Photos affichees dans la galerie visuelle de la page d accueil."
        action={addButton}
      />

      <Toolbar
        search={search}
        onSearch={setSearch}
        sort={sort}
        onSort={setSort}
        count={filtered.length}
      />

      {!canReorder && data.length > 1 && (
        <p className="mb-4 text-xs text-muted-foreground">
          Glisser-deposer disponible avec le tri Ordre d affichage.
        </p>
      )}

      {isPending ? (
        <ListLoading />
      ) : isError ? (
        <LoadError onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Aucun resultat" : "Aucune photo dans la galerie"}
          text={search ? "Essayez un autre mot-cle." : "Ajoutez une premiere photo de terrain."}
          action={search ? undefined : addButton}
        />
      ) : (
        <div className="space-y-2.5">
          <SortableList
            items={filtered}
            onReorder={handleReorder}
            disabled={!canReorder}
            render={(item, handle) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => openEdit(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(item);
                  }
                }}
                className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-4 shadow-xs transition hover:border-primary/40 hover:bg-accent/5 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {canReorder && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition"
                    >
                      {handle}
                    </div>
                  )}

                  <div className="grid h-11 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-card">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.image_alt ?? item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground/30">
                        <ImageIcon size={16} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{item.title}</p>
                    <p
                      className={`text-xs mt-0.5 font-medium ${item.published ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
                    >
                      {item.published ? item.tag : `${item.tag} · masque`}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t border-border/40 sm:border-0 sm:pt-0 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => togglePublish(item)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      item.published
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border"
                    }`}
                    title={item.published ? "Cliquer pour masquer" : "Cliquer pour publier"}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${item.published ? "bg-emerald-500" : "bg-muted-foreground"}`}
                    />
                    {item.published ? "Publie" : "Masque"}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleting(item)}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Modal */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] sm:w-full max-w-md overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-border bg-card">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-lg font-bold">
              {editing === "new" ? "Ajouter une realisation" : "Modifier la realisation"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette photo apparaitra dans la galerie Immersion de la page d accueil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="im-title" className="text-sm font-medium">Titre *</Label>
              <Input
                id="im-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Cablage structure & baie reseau PME"
                required
                maxLength={120}
                disabled={busy || isUploading}
                className="h-11 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="im-tag" className="text-sm font-medium">Categorie *</Label>
              <Input
                id="im-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ex : Infrastructure physique, Securite, Web..."
                required
                maxLength={60}
                disabled={busy || isUploading}
                className="h-11 text-base sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Photo *</Label>

              {imageUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-card">
                      <img src={imageUrl} alt={imageAlt || title} className="h-full w-full object-cover" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">Photo selectionnee</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => { setImageUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                    disabled={busy}
                  >
                    Changer
                  </Button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition hover:border-primary/60 hover:bg-accent/15 ${isUploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Televersement... {uploadProgress ? `${uploadProgress}%` : ""}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Upload size={16} />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Cliquez pour choisir une photo
                      </p>
                      <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP - max 5 Mo</p>
                    </>
                  )}
                </div>
              )}

              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Ou collez l URL directe de l image"
                className="h-9 text-xs text-muted-foreground mt-1"
                disabled={busy || isUploading}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="im-alt" className="text-sm font-medium">
                Texte alternatif <span className="text-muted-foreground font-normal text-xs">(SEO)</span>
              </Label>
              <Input
                id="im-alt"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Description pour les lecteurs d ecran et Google"
                disabled={busy || isUploading}
                className="h-11 text-base sm:text-sm"
              />
            </div>

            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2">
              <span className="text-sm font-medium">Visible sur le site</span>
              <Switch checked={published} onCheckedChange={setPublished} disabled={busy || isUploading} />
            </label>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full sm:w-auto"
                onClick={() => setEditing(null)}
                disabled={busy || isUploading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={busy || isUploading}
                className="min-h-11 w-full sm:w-auto bg-gradient-primary"
              >
                {busy && <Loader2 className="animate-spin" size={16} />} Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        label={deleting?.title ?? ""}
        onConfirm={handleDelete}
        busy={busy}
      />
    </>
  );
}
