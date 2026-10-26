import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, ConfirmDelete } from "@/components/admin/ui";
import { uploadToCloudinary, validatePdf } from "@/lib/cloudinary";

export const Route = createFileRoute("/admin/medias")({ component: CvAdminPage });

// ─── Clé Supabase pour stocker l'URL du CV ───────────────────────────────────
const CV_KEY = "cv_url";

function useCvUrl() {
  return useQuery({
    queryKey: ["admin", "settings", CV_KEY],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", CV_KEY).maybeSingle();
      if (!data?.value) return null;
      if (typeof data.value === "string") return data.value;
      if (typeof data.value === "object" && "url" in data.value) return (data.value as { url: string }).url;
      return String(data.value);
    },
  });
}

function extractFilename(url: string): string {
  try {
    const raw = url.split("/").pop() ?? "curriculum-vitae.pdf";
    return decodeURIComponent(raw);
  } catch {
    return "curriculum-vitae.pdf";
  }
}

// ─── Barre de progression ────────────────────────────────────────────────────
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className="h-2 rounded-full bg-primary transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Zone de Drag & Drop pour upload PDF ──────────────────────────────────────
function PdfDropZone({
  onFile,
  disabled,
  label = "Déposez votre CV ici ou cliquez pour parcourir",
  hint = "Format PDF uniquement · 10 Mo maximum",
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handle(file: File | undefined) {
    if (file) onFile(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center transition-all
        ${drag ? "border-primary bg-primary/5 scale-[0.99]" : "border-border hover:border-primary/50 hover:bg-accent/20"}
        ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110 shadow-sm">
        <Upload size={30} />
      </div>
      <div>
        <p className="font-semibold text-base text-foreground">{label}</p>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{hint}</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm transition-transform group-hover:translate-y-[-1px]">
        <FileText size={15} />
        Sélectionner le fichier PDF
      </span>
    </div>
  );
}

// ─── Carte d'affichage élégante du CV déjà uploadé ───────────────────────────
function CurrentCvCard({
  cvUrl,
  onReplace,
  onDelete,
  uploading,
  progress,
}: {
  cvUrl: string;
  onReplace: (file: File) => void;
  onDelete: () => void;
  uploading: boolean;
  progress: number;
}) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  // Sur mobile, les navigateurs n'embarquent pas les PDF dans <iframe> — auto-activer
  // Google Docs Viewer + afficher directement l'aperçu sans que l'utilisateur clique.
  const isMobileDevice =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  const [showPreview, setShowPreview] = useState(isMobileDevice);
  const [accessStatus, setAccessStatus] = useState<"checking" | "ok" | "blocked">("checking");
  const [testing, setTesting] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(isMobileDevice);
  const filename = extractFilename(cvUrl);

  async function checkAccess() {
    setTesting(true);
    try {
      const res = await fetch(cvUrl, { method: "GET" });
      const contentType = res.headers.get("content-type") ?? "";
      if (res.ok && (contentType.includes("pdf") || contentType.includes("octet-stream"))) {
        setAccessStatus("ok");
      } else {
        const text = await res.text().catch(() => "");
        if (text.includes("ACL") || text.includes("401") || !res.ok) {
          setAccessStatus("blocked");
        } else {
          setAccessStatus("ok");
        }
      }
    } catch {
      setAccessStatus("blocked");
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    checkAccess();
  }, [cvUrl]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-sm transition-all hover:shadow-md">
      {/* En-tête de la carte */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive shadow-sm">
            <FileText size={26} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base sm:text-lg text-foreground">Curriculum Vitae</h3>
              {accessStatus === "blocked" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={12} />
                  Action Cloudinary requise
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  En ligne & Actif
                </span>
              )}
            </div>
            <p className="truncate text-xs sm:text-sm text-muted-foreground max-w-sm sm:max-w-md font-mono mt-0.5">
              {filename}
            </p>
          </div>
        </div>

        {/* Badges d'information */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            PDF · Cloudinary
          </span>
          <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Dossier: Landry_Media
          </span>
        </div>
      </div>

      {/* Barre de progression si remplacement en cours */}
      {uploading && (
        <div className="my-5 rounded-2xl border border-primary/30 bg-primary/5 p-5 text-center">
          <div className="flex items-center justify-center gap-2 font-semibold text-primary">
            <Loader2 className="animate-spin" size={18} />
            Mise à jour du CV en cours… {progress}%
          </div>
          <ProgressBar value={progress} />
        </div>
      )}

      {/* Détails & notification de synchronisation */}
      <div className="my-5 rounded-2xl bg-muted/40 p-4 text-xs sm:text-sm text-muted-foreground flex items-start gap-3">
        <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Ce fichier est directement synchronisé avec le bouton <strong className="text-foreground">« Télécharger mon CV »</strong> de la page d'accueil. Toute modification prend effet immédiatement pour tous les visiteurs.
        </p>
      </div>

      {/* Aperçu intégré du PDF avec gestion automatique du déblocage Cloudinary */}
      {showPreview && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-inner">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-muted/60 border-b border-border text-xs text-muted-foreground font-medium flex-wrap gap-2">
            <span>Aperçu en direct du document</span>
            <div className="flex items-center gap-2">
              {accessStatus === "ok" && (
                <button
                  type="button"
                  onClick={() => setUseGoogleViewer((g) => !g)}
                  className="rounded-md bg-secondary/80 px-2 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-secondary transition-colors"
                  title="Basculer entre aperçu Google Docs (optimisé mobile) et lecteur direct"
                >
                  {useGoogleViewer ? "📱 Vue Mobile (Google Docs)" : "💻 Lecteur direct"}
                </button>
              )}
              {accessStatus === "blocked" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={checkAccess}
                  disabled={testing}
                >
                  {testing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Re-tester
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowPreview(false)}
              >
                <EyeOff size={13} /> Masquer
              </Button>
            </div>
          </div>

          {testing || accessStatus === "checking" ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <Loader2 className="animate-spin text-primary" size={28} />
              <p className="text-sm font-medium">Vérification de l'accès au document Cloudinary…</p>
            </div>
          ) : accessStatus === "blocked" ? (
            <div className="p-6 sm:p-8 text-center bg-card">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto mb-3 shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <h4 className="font-bold text-base sm:text-lg text-foreground">
                Distribution des PDF à autoriser sur votre compte Cloudinary
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Par défaut, Cloudinary restreint la distribution directe des fichiers PDF sur les comptes gratuits (erreur <em>« deny or ACL failure »</em>).
                Vous pouvez l'autoriser en 30 secondes :
              </p>

              <div className="mt-5 mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-xs sm:text-sm space-y-2 text-foreground">
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 shrink-0">1.</span>
                  <span>
                    Ouvrez la section Sécurité de votre compte :{" "}
                    <a
                      href="https://console.cloudinary.com/settings/security"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-primary underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-1"
                    >
                      console.cloudinary.com/settings/security <ExternalLink size={12} />
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 shrink-0">2.</span>
                  <span>
                    Faites défiler jusqu'à <strong>« PDF and ZIP files delivery »</strong>.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 shrink-0">3.</span>
                  <span>
                    Cochez <strong>« Allow delivery of PDF and ZIP files »</strong> (ou décochez la restriction).
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 shrink-0">4.</span>
                  <span>
                    Cliquez sur le bouton <strong>Save</strong> en bas de page.
                  </span>
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="sm"
                  onClick={checkAccess}
                  disabled={testing}
                  className="gap-2 bg-gradient-primary rounded-full px-5"
                >
                  {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  J'ai activé l'option · Re-tester l'aperçu
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href="https://console.cloudinary.com/settings/security" target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Ouvrir Cloudinary Settings
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <iframe
              src={
                useGoogleViewer
                  ? `https://docs.google.com/viewer?url=${encodeURIComponent(cvUrl)}&embedded=true`
                  : `${cvUrl}#toolbar=0&view=FitH`
              }
              title="Aperçu du CV Landry Net"
              className="h-[480px] sm:h-[540px] w-full border-0 bg-background"
            />
          )}
        </div>
      )}

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Voir */}
          <Button asChild variant="outline" size="sm" className="h-10 gap-1.5 min-w-24">
            <a href={cvUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Consulter
            </a>
          </Button>

          {/* Bouton Toggle Aperçu */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            onClick={() => setShowPreview((p) => !p)}
          >
            {showPreview ? (
              <>
                <EyeOff size={14} /> Masquer l'aperçu
              </>
            ) : (
              <>
                <Eye size={14} /> Aperçu direct
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bouton Remplacer */}
          <input
            ref={replaceInputRef}
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = "";
            }}
            disabled={uploading}
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-10 gap-1.5"
            onClick={() => replaceInputRef.current?.click()}
            disabled={uploading}
          >
            <RefreshCw size={14} /> Remplacer le CV
          </Button>

          {/* Bouton Supprimer */}
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 text-destructive hover:bg-destructive/10 hover:border-destructive/30"
            onClick={onDelete}
            disabled={uploading}
          >
            <Trash2 size={14} /> Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal : Gestion exclusive du CV ────────────────────────────
function CvAdminPage() {
  const qc = useQueryClient();
  const { data: cvUrl, isPending, isError, refetch } = useCvUrl();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleUpload(file: File) {
    const err = validatePdf(file, 10);
    if (err) {
      toast.error(err);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const result = await uploadToCloudinary(file, "raw", setProgress, "cv");
      // Stocker l'URL Cloudinary dans app_settings
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: CV_KEY, value: result.secure_url }, { onConflict: "key" });

      if (error) throw new Error(error.message);

      toast.success("Votre CV a été mis en ligne et synchronisé avec succès !");
      await qc.invalidateQueries({ queryKey: ["admin", "settings", CV_KEY] });
      await qc.invalidateQueries({ queryKey: ["public"] });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? (e instanceof Error ? e.message : "Erreur lors de l'envoi du CV.");
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function removeCV() {
    setDeleting(true);
    try {
      const { error } = await supabase.from("app_settings").delete().eq("key", CV_KEY);
      if (error) throw new Error(error.message);

      toast.success("Le CV a été supprimé. Le lien public est maintenant désactivé.");
      setConfirmDelete(false);
      await qc.invalidateQueries({ queryKey: ["admin", "settings", CV_KEY] });
      await qc.invalidateQueries({ queryKey: ["public"] });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? (e instanceof Error ? e.message : "Erreur lors de la suppression.");
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Curriculum Vitae"
        text="Gérez votre CV au format PDF. Le document est hébergé en haute disponibilité sur Cloudinary et mis à jour en temps réel sur votre portfolio."
      />

      <div className="space-y-6 max-w-4xl">
        {/* Chargement initial */}
        {isPending ? (
          <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-8">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm text-muted-foreground font-medium">Chargement des données du CV…</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="font-semibold text-destructive">Impossible de charger le CV actuel.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : cvUrl ? (
          /* Carte propre et détaillée du CV existant */
          <div className="space-y-6">
            <CurrentCvCard
              cvUrl={cvUrl}
              onReplace={handleUpload}
              onDelete={() => setConfirmDelete(true)}
              uploading={uploading}
              progress={progress}
            />

            {/* Zone rapide de glisser-déposer pour remplacer */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Déposer un nouveau fichier pour remplacer l'actuel
              </h4>
              <PdfDropZone
                onFile={handleUpload}
                disabled={uploading}
                label="Glissez-déposez le nouveau CV ici pour le mettre à jour"
                hint="Le nouveau fichier remplacera immédiatement l'ancien sur le site"
              />
            </div>
          </div>
        ) : (
          /* Aucun CV en ligne : Zone d'upload initiale */
          <div className="space-y-5">
            {uploading ? (
              <div className="rounded-3xl border border-border bg-card p-10 text-center shadow-sm">
                <Loader2 className="mx-auto animate-spin text-primary" size={36} />
                <p className="mt-4 font-semibold text-foreground text-lg">Envoi vers Cloudinary… {progress}%</p>
                <p className="mt-1 text-sm text-muted-foreground">Veuillez patienter pendant le traitement du document.</p>
                <div className="mx-auto max-w-md mt-4">
                  <ProgressBar value={progress} />
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                <div className="mb-6 flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">Mettre votre CV en ligne</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Uploadez votre fichier PDF. Dès qu'il sera en ligne, le bouton « Télécharger mon CV » du portfolio deviendra actif et téléchargeable pour tous les recruteurs et visiteurs.
                    </p>
                  </div>
                </div>

                <PdfDropZone onFile={handleUpload} disabled={uploading} />
              </div>
            )}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        <ConfirmDelete
          open={confirmDelete}
          onOpenChange={(o) => !o && setConfirmDelete(false)}
          label="le CV actuel"
          title="Supprimer définitivement le CV ?"
          description="Le fichier sera dissocié de votre portfolio. Le bouton « Télécharger mon CV » utilisera la version de secours ou deviendra inactif jusqu'au prochain upload."
          onConfirm={removeCV}
          busy={deleting}
        />
      </div>
    </>
  );
}
