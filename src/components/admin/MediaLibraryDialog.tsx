import { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ImagePlus,
  Upload,
  Link2,
  Images,
  Loader2,
  Check,
  Trash2,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { uploadProjectImage } from "@/lib/admin-data";
import { compressImageBeforeUpload } from "@/lib/cloudinary";

export interface MediaInsertPayload {
  url: string;
  alt: string;
  caption?: string;
  align?: "left" | "center" | "right" | "full";
  width?: string;
}

export interface MediaItemRecord {
  url: string;
  title?: string;
  alt?: string;
}

export function MediaLibraryDialog({
  open,
  onClose,
  onInsert,
  existingMedia = [],
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (media: MediaInsertPayload) => void;
  existingMedia?: MediaItemRecord[];
}) {
  const [tab, setTab] = useState<"upload" | "library" | "url">("upload");
  const [selectedUrl, setSelectedUrl] = useState<string>("");
  const [altText, setAltText] = useState<string>("");
  const [caption, setCaption] = useState<string>("");
  const [align, setAlign] = useState<"left" | "center" | "right" | "full">("center");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Liste locale des médias uploadés récemment dans cette session
  const [sessionMedia, setSessionMedia] = useState<MediaItemRecord[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialisation à l'ouverture
  useEffect(() => {
    if (open) {
      setUploadProgress(null);
      setIsUploading(false);
      if (!selectedUrl && existingMedia.length > 0) {
        // Pré-sélection par défaut si bibliothèque disponible
      }
    }
  }, [open, existingMedia, selectedUrl]);

  const allLibraryMedia = useMemo(() => {
    const map = new Map<string, MediaItemRecord>();
    for (const item of sessionMedia) {
      if (item.url) map.set(item.url, item);
    }
    for (const item of existingMedia) {
      if (item.url && !map.has(item.url)) map.set(item.url, item);
    }
    return Array.from(map.values());
  }, [sessionMedia, existingMedia]);

  async function handleFileUpload(file: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image (PNG, JPG, WEBP, GIF, SVG).");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Image trop lourde (15 Mo maximum).");
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);

    try {
      // Étape 1 : Optimisation et compression côté client
      setUploadProgress(15);
      const optimizedFile = await compressImageBeforeUpload(file);
      setUploadProgress(30);

      // Étape 2 : Upload réel vers Cloudinary
      const uploadedUrl = await uploadProjectImage(optimizedFile, (pct) => {
        setUploadProgress(30 + Math.round((pct * 65) / 100));
      });

      setUploadProgress(100);
      toast.success("Image importée et stockée avec succès !");

      const newRecord: MediaItemRecord = {
        url: uploadedUrl,
        alt: file.name.replace(/\.[^.]+$/, ""),
      };

      setSessionMedia((prev) => [newRecord, ...prev]);
      setSelectedUrl(uploadedUrl);
      if (!altText) setAltText(newRecord.alt || "Illustration du projet");
      setTab("library");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'image.");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleInsert() {
    const url = tab === "url" ? externalUrl.trim() : selectedUrl.trim();
    if (!url) {
      toast.error("Veuillez sélectionner ou saisir une adresse d'image valide.");
      return;
    }

    onInsert({
      url,
      alt: altText.trim() || "Illustration du projet",
      caption: caption.trim() || undefined,
      align,
    });

    // Reset et fermeture
    setSelectedUrl("");
    setAltText("");
    setCaption("");
    setExternalUrl("");
    onClose();
  }

  const currentPreviewUrl = tab === "url" ? externalUrl : selectedUrl;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] h-[92dvh] sm:h-auto max-w-3xl rounded-2xl sm:rounded-3xl p-0 overflow-hidden border border-border bg-card shadow-2xl flex flex-col">
        <DialogHeader className="shrink-0 p-5 sm:p-6 pb-3 border-b border-border/80">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
                <Images size={18} />
              </span>
              Gestionnaire de médias
            </DialogTitle>
          </div>

          {/* Onglets */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === "upload"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload size={14} /> Importer un fichier
            </button>
            <button
              type="button"
              onClick={() => setTab("library")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === "library"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Images size={14} /> Bibliothèque ({allLibraryMedia.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("url")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === "url"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 size={14} /> Adresse URL web
            </button>
          </div>
        </DialogHeader>

        {/* Corps avec scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {tab === "upload" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`group relative flex flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/5 scale-[0.99]"
                    : "border-border hover:border-primary/50 hover:bg-accent/20"
                } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
              >
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  {isUploading ? (
                    <Loader2 size={26} className="animate-spin" />
                  ) : (
                    <ImagePlus size={26} />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Glissez-déposez une image ici, ou{" "}
                    <span className="text-primary underline underline-offset-2">
                      parcourez vos dossiers
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : PNG, JPG, WEBP, GIF, SVG · Compression automatique
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />

                {isUploading && uploadProgress !== null && (
                  <div className="w-full max-w-xs space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] font-semibold text-primary">
                      <span>Téléversement vers Cloudinary...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {selectedUrl && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={selectedUrl}
                      alt="Dernier upload"
                      className="h-12 w-12 rounded-lg object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">
                        Image prête à être insérée
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{selectedUrl}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-xs"
                    onClick={() => setTab("library")}
                  >
                    Voir dans la bibliothèque
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === "library" && (
            <div className="space-y-4">
              {allLibraryMedia.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
                  <Images size={32} className="mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Aucun média dans la bibliothèque pour le moment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTab("upload")}
                    className="text-xs"
                  >
                    Importer une première image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[280px] overflow-y-auto p-1">
                  {allLibraryMedia.map((m, idx) => {
                    const isSelected = selectedUrl === m.url;
                    return (
                      <button
                        key={`${m.url}-${idx}`}
                        type="button"
                        onClick={() => {
                          setSelectedUrl(m.url);
                          if (!altText && m.alt) setAltText(m.alt);
                        }}
                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 scale-[0.98]"
                            : "border-border hover:border-primary/40 bg-muted/40"
                        }`}
                      >
                        <img
                          src={m.url}
                          alt={m.alt || "Média"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                            <Check size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "url" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ext-url" className="text-xs font-semibold">
                  URL de l'image (HTTPS)
                </Label>
                <Input
                  id="ext-url"
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="h-10 text-xs sm:text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Insérez une URL d'image publique et permanente.
                </p>
              </div>

              {externalUrl && (
                <div className="rounded-xl border border-border p-2 bg-muted/20">
                  <img
                    src={externalUrl}
                    alt="Aperçu"
                    className="max-h-44 w-full rounded-lg object-contain bg-background"
                    onError={() => toast.error("Impossible de charger l'aperçu de cette image.")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Paramètres de l'image insérée */}
          {currentPreviewUrl && (
            <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" /> Options d'affichage
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="img-alt" className="text-xs">
                    Texte alternatif (accessibilité SEO)
                  </Label>
                  <Input
                    id="img-alt"
                    placeholder="Ex. Architecture du cluster Linux..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="img-caption" className="text-xs">
                    Légende sous l'image (optionnelle)
                  </Label>
                  <Input
                    id="img-caption"
                    placeholder="Ex. Schéma de réplication temps réel"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-medium text-muted-foreground">Alignement :</span>
                {(["left", "center", "right", "full"] as const).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setAlign(pos)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      align === pos
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {pos === "left"
                      ? "Gauche"
                      : pos === "center"
                      ? "Centre"
                      : pos === "right"
                      ? "Droite"
                      : "Pleine largeur"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pied de modal */}
        <DialogFooter className="shrink-0 p-4 sm:p-5 border-t border-border bg-card flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Annuler
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleInsert}
            disabled={!currentPreviewUrl || isUploading}
            className="text-xs bg-gradient-primary gap-1.5"
          >
            {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            Insérer dans le contenu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
