import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { BRANDS_KEY, type PublicBrand } from "@/lib/content.queries";
import { brands as defaultBrands } from "@/content/portfolio";
import { uploadToCloudinary, validateImage } from "@/lib/cloudinary";
import { SortableList } from "@/components/admin/SortableList";
import { ConfirmDelete, EmptyState, ListLoading, LoadError, PageHeader, Toolbar, type SortKey } from "@/components/admin/ui";

export const Route = createFileRoute("/admin/organisations")({ component: OrganisationsAdminPage });

function useAdminBrands() {
  return useQuery({
    queryKey: ["admin", "settings", BRANDS_KEY],
    queryFn: async (): Promise<PublicBrand[]> => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", BRANDS_KEY).maybeSingle();
      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        return (data.value as PublicBrand[]).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }
      return defaultBrands.map((b, i) => ({
        id: `brand-${i + 1}`,
        name: b.name,
        logo_url: null,
        published: true,
        sort_order: i,
      }));
    },
  });
}

function OrganisationsAdminPage() {
  const qc = useQueryClient();
  const { data = [], isPending, isError, refetch } = useAdminBrands();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("order");
  const [editing, setEditing] = useState<PublicBrand | "new" | null>(null);
  const [deleting, setDeleting] = useState<PublicBrand | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit(item: PublicBrand | "new") {
    if (item === "new") {
      setName("");
      setLogoUrl("");
      setPublished(true);
    } else {
      setName(item.name);
      setLogoUrl(item.logo_url ?? "");
      setPublished(item.published);
    }
    setUploadProgress(null);
    setIsUploading(false);
    setEditing(item);
  }

  async function persist(newItems: PublicBrand[], successMsg?: string) {
    const { error } = await supabase.from("app_settings").upsert({
      key: BRANDS_KEY,
      value: newItems,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      toast.error("Erreur lors de la sauvegarde.");
      return false;
    }
    if (successMsg) toast.success(successMsg);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "settings", BRANDS_KEY] }),
      qc.invalidateQueries({ queryKey: ["public", "brands"] }),
    ]);
    return true;
  }

  const filtered = useMemo(() => {
    let items = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((b) => b.name.toLowerCase().includes(q));
    }
    if (sort === "alpha") {
      items.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    } else if (sort === "recent") {
      items.reverse();
    } else {
      items.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return items;
  }, [data, search, sort]);

  const canReorder = sort === "order" && !search.trim();

  async function handleReorder(reordered: PublicBrand[]) {
    const updated = reordered.map((item, index) => ({ ...item, sort_order: index }));
    qc.setQueryData(["admin", "settings", BRANDS_KEY], updated);
    await persist(updated, "Ordre enregistré");
  }

  async function togglePublish(item: PublicBrand) {
    const updated = data.map((b) => (b.id === item.id ? { ...b, published: !b.published } : b));
    await persist(updated, item.published ? "Masqué" : "Publié");
  }

  async function handleDelete() {
    if (!deleting) return;
    setBusy(true);
    const updated = data.filter((b) => b.id !== deleting.id);
    const ok = await persist(updated, "Supprimé");
    setBusy(false);
    if (ok) setDeleting(null);
  }

  async function handleFileUpload(file: File) {
    const err = validateImage(file, 5);
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(15);
      const result = await uploadToCloudinary(file, "image", (pct) => setUploadProgress(pct), "organisations");
      setLogoUrl(result.secure_url);
      setUploadProgress(null);
      setIsUploading(false);
      toast.success("Logo téléversé");
    } catch (e) {
      setIsUploading(false);
      setUploadProgress(null);
      toast.error(e instanceof Error ? e.message : "Échec de l'upload.");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Le nom est obligatoire.");
      return;
    }

    setBusy(true);
    let updated: PublicBrand[];
    if (editing === "new") {
      const newBrand: PublicBrand = {
        id: crypto.randomUUID(),
        name: cleanName,
        logo_url: logoUrl.trim() || null,
        published,
        sort_order: data.length,
      };
      updated = [...data, newBrand];
    } else if (editing) {
      updated = data.map((b) =>
        b.id === editing.id
          ? {
              ...b,
              name: cleanName,
              logo_url: logoUrl.trim() || null,
              published,
            }
          : b,
      );
    } else {
      setBusy(false);
      return;
    }

    const ok = await persist(updated, editing === "new" ? "Organisation ajoutée" : "Enregistré");
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
        title="Organisations"
        text="Logos affichés dans le bandeau de défilement."
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
          💡 Glisser-déposer disponible avec le tri « Ordre d'affichage ».
        </p>
      )}

      {isPending ? (
        <ListLoading />
      ) : isError ? (
        <LoadError onRetry={() => refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Aucun résultat" : "Aucune organisation"}
          text={search ? "Essayez un autre mot-clé." : "Ajoutez une première organisation."}
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
                {/* Gauche : Poignée + Vignette logo + Nom */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {canReorder && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground shrink-0"
                    >
                      <span {...handle} className="grid h-8 w-8 place-items-center rounded-lg">
                        <GripVertical size={16} />
                      </span>
                    </div>
                  )}

                  {/* Vignette logo */}
                  <div className="grid h-11 w-14 shrink-0 place-items-center rounded-xl border border-border/70 bg-background/90 p-1 overflow-hidden">
                    {item.logo_url ? (
                      <img
                        src={item.logo_url}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Building2 size={18} className="text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Nom */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.logo_url ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Logo actif
                        </span>
                      ) : (
                        <span className="text-muted-foreground/70">
                          Texte seul
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Droite : Badge Statut + Supprimer */}
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
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.published ? "bg-emerald-500" : "bg-muted-foreground"
                      }`}
                    />
                    {item.published ? "Publié" : "Masqué"}
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

      {/* Modal Ajout / Édition responsive et épuré */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] sm:w-full max-w-md overflow-y-auto rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-border bg-card">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-lg font-bold">
              {editing === "new" ? "Ajouter une organisation" : "Modifier l'organisation"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Seul le logo sera affiché dans le bandeau défilant.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="brand-name" className="text-sm font-medium">Nom *</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. XSECURITY, INPP, PayLix..."
                required
                maxLength={80}
                disabled={busy || isUploading}
                className="h-11 text-base sm:text-sm"
              />
            </div>

            {/* Téléversement du Logo */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Logo (SVG ou image)</Label>

              {logoUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-12 shrink-0 place-items-center rounded-lg border border-border bg-card p-1">
                      <img src={logoUrl} alt={name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">Logo sélectionné</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setLogoUrl("")}
                    className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
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
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-center transition hover:border-primary/60 hover:bg-accent/15 ${
                    isUploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFileUpload(file);
                    }}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">
                        Téléversement... {uploadProgress ? `${uploadProgress}%` : ""}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                        <Upload size={16} />
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Cliquez pour choisir un SVG ou image
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        SVG, PNG ou WEBP
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* URL manuelle discrète */}
              <Input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Ou collez l'URL directe du logo"
                className="h-9 text-xs text-muted-foreground mt-1"
                disabled={busy || isUploading}
              />
            </div>

            {/* Toggle Publié */}
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-2">
              <span className="text-sm font-medium">Visible sur le site</span>
              <Switch
                checked={published}
                onCheckedChange={setPublished}
                disabled={busy || isUploading}
              />
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

      {/* Confirmation suppression */}
      <ConfirmDelete
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        label={deleting?.name ?? ""}
        onConfirm={handleDelete}
        busy={busy}
      />
    </>
  );
}
