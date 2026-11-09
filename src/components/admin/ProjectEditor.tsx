import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Eye,
  Loader2,
  Save,
  Send,
  SlidersHorizontal,
  Sparkles,
  X,
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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { slugify, sectionTextToRichBlocks } from "@/lib/blocks";
import { type ProjectRow } from "@/lib/admin-data";
import {
  normalizeProjectContent,
  legacyBlocksToHtml,
  type ProjectGalleryItem,
  type ProjectContentPayload,
} from "@/lib/project-content";
import { BloggerToolbar } from "./BloggerToolbar";
import { WysiwygEditor } from "./WysiwygEditor";
import { HtmlCodeEditor } from "./HtmlCodeEditor";
import { formatHtml } from "@/lib/formatHtml";
import { ProjectSidePanel, type ProjectSidePanelData } from "./ProjectSidePanel";
import { MediaLibraryDialog, type MediaInsertPayload } from "./MediaLibraryDialog";
import {
  LinkInsertDialog,
  VideoInsertDialog,
  TableInsertDialog,
} from "./EditorModals";
import { ProjectPreviewModal } from "./ProjectPreviewModal";
import { ProjectAiAssistant } from "./ProjectAiAssistant";

interface ProjectEditorProps {
  row: ProjectRow | null;
  nextOrder: number;
  asModal?: boolean;
  onClose?: () => void;
  onSaved?: () => Promise<unknown> | void;
}

export function ProjectEditor({
  row,
  nextOrder,
  asModal,
  onClose,
  onSaved,
}: ProjectEditorProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // ID du projet (null si création)
  const [id, setId] = useState<string | null>(row?.id ?? null);

  // État initial normalisé (supporte à la fois les anciens blocs et le nouveau format)
  const initialData = useMemo(() => {
    if (!row) {
      return {
        title: "",
        slug: "",
        tag: "Projet personnel",
        intro: "",
        summary: "",
        image_url: "",
        image_alt: "",
        technologies: [] as string[],
        external_url: "",
        github_url: "",
        seo_title: "",
        seo_description: "",
        status: "draft" as "draft" | "published",
        featured: false,
        gallery: [] as ProjectGalleryItem[],
        html: `<h2>Contexte du projet</h2><p>Présentez ici le cadre du projet, l'organisation et la situation de départ.</p><h2>Problématique & Objectifs</h2><p>Quel besoin ou quelle difficulté technique fallait-il résoudre ?</p><h2>Architecture & Solution développée</h2><p>Décrivez la solution technique mise en œuvre, les composants clés et vos choix d'ingénierie.</p><h2>Résultats & Impact</h2><p>Quels résultats concrets le projet a-t-il apportés ?</p>`,
        created_at: undefined,
        updated_at: undefined,
      };
    }

    const norm = normalizeProjectContent(row.content);
    return {
      title: row.title ?? "",
      slug: row.slug ?? "",
      tag: row.tag ?? "",
      intro: row.intro ?? "",
      summary: row.summary ?? "",
      image_url: row.image_url ?? "",
      image_alt: row.image_alt ?? "",
      technologies: row.technologies ?? [],
      external_url: row.external_url ?? "",
      github_url: norm.github_url || "",
      seo_title: norm.seo_title || "",
      seo_description: norm.seo_description || "",
      status: (row.status === "published" ? "published" : "draft") as "draft" | "published",
      featured: Boolean(row.featured),
      gallery: norm.gallery || [],
      html: norm.html || "",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }, [row]);

  // Titre principal
  const [title, setTitle] = useState(initialData.title);
  const [slugTouched, setSlugTouched] = useState(Boolean(row));

  // Contenu HTML source de vérité
  const [htmlContent, setHtmlContent] = useState(initialData.html);

  // Mode actif : "wysiwyg" (Rédiger) ou "html" (Code)
  const [mode, setMode] = useState<"wysiwyg" | "html">("wysiwyg");

  // Panneau latéral visible (fermé par défaut sur mobile pour libérer l'espace)
  const [showSidePanel, setShowSidePanel] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  // Données des paramètres du panneau latéral
  const [settings, setSettings] = useState<ProjectSidePanelData>({
    slug: initialData.slug,
    tag: initialData.tag,
    intro: initialData.intro,
    summary: initialData.summary,
    technologies: initialData.technologies,
    image_url: initialData.image_url,
    image_alt: initialData.image_alt,
    gallery: initialData.gallery,
    external_url: initialData.external_url,
    github_url: initialData.github_url,
    seo_title: initialData.seo_title,
    seo_description: initialData.seo_description,
    status: initialData.status,
    featured: initialData.featured,
    created_at: initialData.created_at,
    updated_at: initialData.updated_at,
  });

  // États de sauvegarde et de statut
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const savingRef = useRef(false);

  // Instance de l'éditeur Tiptap
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);

  // Dialogs
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  // Dialog de confirmation de sortie (remplace window.confirm)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const pendingBlockerRef = useRef<(() => void) | null>(null);

  // Mise à jour des paramètres
  const updateSettings = (patch: Partial<ProjectSidePanelData>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  // Synchronisation du titre avec le slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setDirty(true);
    if (!slugTouched) {
      setSettings((prev) => ({ ...prev, slug: slugify(val) }));
    }
  };

  // Extraction dynamique de toutes les images présentes dans le projet (corps HTML + galerie)
  const availableProjectImages = useMemo(() => {
    const list: string[] = [];
    if (htmlContent) {
      const matches = htmlContent.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
      for (const m of matches) {
        if (m[1] && !list.includes(m[1])) {
          list.push(m[1]);
        }
      }
    }
    if (settings.gallery) {
      for (const item of settings.gallery) {
        if (item.url && !list.includes(item.url)) {
          list.push(item.url);
        }
      }
    }
    return list;
  }, [htmlContent, settings.gallery]);

  // Bascule de mode avec synchronisation fluide et sans blocage
  const handleModeChange = (nextMode: "wysiwyg" | "html") => {
    if (nextMode === mode) return;

    if (mode === "wysiwyg" && editorInstance) {
      // De Rédiger vers HTML : on extrait le HTML généré par Tiptap et on le structure proprement
      try {
        const currentHtml = editorInstance.getHTML();
        setHtmlContent(formatHtml(currentHtml));
      } catch (err) {
        console.error("Erreur synchronisation Tiptap vers HTML:", err);
      }
    } else if (nextMode === "wysiwyg" && editorInstance) {
      // De HTML vers Rédiger : on injecte le HTML édité dans Tiptap qui est toujours monté
      try {
        editorInstance.commands.setContent(htmlContent, false);
      } catch (err) {
        console.error("Erreur injection HTML vers Tiptap:", err);
      }
    }

    setMode(nextMode);
  };

  // ── Validation ──
  const validate = useCallback(() => {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Le titre du projet est obligatoire.");
    if (title.length > 200) errs.push("Le titre ne doit pas dépasser 200 caractères.");
    if (!settings.slug.trim()) errs.push("Le slug du projet est obligatoire.");
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(settings.slug)) {
      errs.push("Le slug ne doit contenir que des lettres minuscules, chiffres et tirets.");
    }
    if (settings.external_url && !/^https?:\/\//i.test(settings.external_url)) {
      errs.push("Le lien de démo doit commencer par https:// ou http://");
    }
    if (settings.github_url && !/^https?:\/\//i.test(settings.github_url)) {
      errs.push("Le lien GitHub doit commencer par https:// ou http://");
    }
    return errs;
  }, [title, settings.slug, settings.external_url, settings.github_url]);

  // ── Enregistrement dans Supabase ──
  const save = useCallback(
    async (opts: { silent?: boolean; forceStatus?: "draft" | "published" } = {}) => {
      if (savingRef.current) return false;

      const finalStatus = opts.forceStatus ?? settings.status;
      const errs = validate();

      if (errs.length > 0) {
        if (!opts.silent) toast.error(errs[0]);
        return false;
      }

      // Si en mode WYSIWYG, récupérer le HTML frais
      let currentHtml = htmlContent;
      if (mode === "wysiwyg" && editorInstance) {
        currentHtml = editorInstance.getHTML();
        setHtmlContent(currentHtml);
      }

      savingRef.current = true;
      setSaving(true);

      const payloadContent: ProjectContentPayload = {
        version: 2,
        html: currentHtml,
        gallery: settings.gallery,
        github_url: settings.github_url.trim() || undefined,
        seo_title: settings.seo_title.trim() || undefined,
        seo_description: settings.seo_description.trim() || undefined,
      };

      // Extraction automatique de la première image du projet si aucune image spécifique n'est choisie
      let resolvedCover = settings.image_url.trim();
      if (!resolvedCover && availableProjectImages.length > 0) {
        resolvedCover = availableProjectImages[0];
      }

      // Résumé automatique dérivé du SEO ou du texte de l'article si vide
      const plainText = currentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const autoSummary =
        settings.summary.trim() ||
        settings.seo_description.trim() ||
        plainText.slice(0, 300);

      const projectPayload = {
        title: title.trim(),
        slug: settings.slug.trim(),
        tag: settings.tag.trim(),
        intro: settings.intro.trim(),
        summary: autoSummary,
        image_url: resolvedCover || null,
        image_alt: settings.image_alt.trim() || title.trim(),
        technologies: settings.technologies,
        external_url: settings.external_url.trim() || null,
        featured: settings.featured,
        status: finalStatus,
        content: payloadContent as unknown as Record<string, unknown>,
      };

      try {
        const res = id
          ? await supabase.from("projects").update(projectPayload).eq("id", id).select("id").single()
          : await supabase.from("projects").insert({ ...projectPayload, sort_order: nextOrder }).select("id").single();

        savingRef.current = false;
        setSaving(false);

        if (res.error) {
          if (!opts.silent) {
            toast.error(
              res.error.code === "23505"
                ? "Ce slug est déjà utilisé par un autre projet."
                : "Échec de l'enregistrement."
            );
          }
          return false;
        }

        if (opts.forceStatus) {
          setSettings((prev) => ({ ...prev, status: opts.forceStatus! }));
        }

        setDirty(false);
        setLastSaved(new Date());

        void qc.invalidateQueries({ queryKey: ["admin"] });
        void qc.invalidateQueries({ queryKey: ["public"] });

        if (onSaved) await onSaved();

        if (!opts.silent) {
          toast.success(
            finalStatus === "published"
              ? "Projet publié en ligne avec succès !"
              : "Brouillon enregistré avec succès"
          );
        }

        if (!id && res.data?.id) {
          setId(res.data.id);
          if (!asModal) {
            navigate({ to: "/admin/projets/$id", params: { id: res.data.id }, replace: true });
          }
        }

        return true;
      } catch (e) {
        savingRef.current = false;
        setSaving(false);
        console.error(e);
        if (!opts.silent) toast.error("Une erreur réseau inattendue s'est produite.");
        return false;
      }
    },
    [
      validate,
      settings,
      htmlContent,
      mode,
      editorInstance,
      title,
      id,
      nextOrder,
      qc,
      onSaved,
      asModal,
      navigate,
    ]
  );

  // ── Sauvegarde automatique des brouillons (toutes les 4 secondes d'inactivité) ──
  useEffect(() => {
    if (!dirty || settings.status !== "draft" || asModal) return;
    const timer = setTimeout(() => {
      void save({ silent: true });
    }, 4000);
    return () => clearTimeout(timer);
  }, [dirty, settings.status, asModal, save]);

  // ── Protection contre la perte de modifications non enregistrées ──
  // Utilise un AlertDialog React élégant au lieu du window.confirm natif du navigateur
  const blocker = useBlocker({
    shouldBlockFn: () => !asModal && dirty,
    enableBeforeUnload: () => !asModal && dirty,
  });

  // Quand le routeur tente de bloquer la navigation, on affiche notre dialog custom
  useEffect(() => {
    if (blocker.status === "blocked") {
      setShowLeaveDialog(true);
      pendingBlockerRef.current = () => blocker.proceed();
    }
  }, [blocker.status]);

  // ── Raccourcis clavier (Ctrl+S / Cmd+S pour enregistrer) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  // ── Insertion d'image depuis la bibliothèque de médias ──
  const handleInsertMedia = (media: MediaInsertPayload) => {
    if (mode === "wysiwyg" && editorInstance) {
      editorInstance
        .chain()
        .focus()
        .setImage({ src: media.url, alt: media.alt })
        .run();
    } else {
      const imgTag = `<figure>\n  <img\n    src="${media.url}"\n    alt="${media.alt || ""}"\n  />${
        media.caption ? `\n  <figcaption>${media.caption}</figcaption>` : ""
      }\n</figure>`;
      setHtmlContent((prev) => (prev ? prev + "\n\n" + imgTag : imgTag));
      setDirty(true);
    }
    toast.success("Média inséré dans l'article !");
  };

  // ── Insertion de vidéo avec conversion automatique d'URL ──
  const handleInsertVideo = (url: string) => {
    let embedUrl = url.trim();
    // YouTube Shorts: youtube.com/shorts/ID
    const shortsMatch = embedUrl.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
    if (shortsMatch && shortsMatch[1]) {
      embedUrl = `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}`;
    } else {
      const ytMatch = embedUrl.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
      if (ytMatch && ytMatch[1]) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
      } else {
        const vimeoMatch = embedUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
        if (vimeoMatch && vimeoMatch[1]) {
          embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
      }
    }

    if (mode === "wysiwyg" && editorInstance) {
      editorInstance.chain().focus().setYoutubeVideo({ src: embedUrl }).run();
    } else {
      const videoTag = `<figure class="video-container">\n  <iframe\n    src="${embedUrl}"\n    allowfullscreen\n  ></iframe>\n</figure>`;
      setHtmlContent((prev) => (prev ? prev + "\n\n" + videoTag : videoTag));
      setDirty(true);
    }
    toast.success("Vidéo intégrée et mise en forme !");
  };

  // ── Insertion de tableau ──
  const handleInsertTable = (rows: number, cols: number) => {
    if (mode === "wysiwyg" && editorInstance) {
      editorInstance
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    } else {
      let tableHtml = "<table>\n  <thead>\n    <tr>\n";
      for (let c = 0; c < cols; c++) tableHtml += `      <th>Entête ${c + 1}</th>\n`;
      tableHtml += "    </tr>\n  </thead>\n  <tbody>\n";
      for (let r = 0; r < rows; r++) {
        tableHtml += "    <tr>\n";
        for (let c = 0; c < cols; c++) tableHtml += `      <td>Cellule</td>\n`;
        tableHtml += "    </tr>\n";
      }
      tableHtml += "  </tbody>\n</table>";
      setHtmlContent((prev) => prev + "\n" + tableHtml);
    }
    toast.success("Tableau inséré !");
  };

  // ── Insertion de lien ──
  const handleInsertLink = (url: string, text?: string) => {
    if (mode === "wysiwyg" && editorInstance) {
      if (text) {
        editorInstance
          .chain()
          .focus()
          .insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`)
          .run();
      } else {
        editorInstance.chain().focus().setLink({ href: url }).run();
      }
    } else {
      const linkTag = `<a href="${url}" target="_blank" rel="noopener noreferrer">${
        text || url
      }</a>`;
      setHtmlContent((prev) => prev + " " + linkTag);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground relative">
      {/* ════════════════════════════════════════════════════════════════════════
          BLOC SUPÉRIEUR FIXE AU SCROLL : HEADER + TITRE + BARRE D'OUTILS
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-card border-b border-border shadow-xs shrink-0">
        {/* 1. Header d'actions et de statut */}
        <header className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-border/70 bg-card">
          {/* Côté gauche : Retour & Statut */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {asModal ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                onClick={onClose}
                title="Fermer la fenêtre"
              >
                <X size={18} />
              </Button>
            ) : (
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                title="Tous les projets"
              >
                <Link to="/admin/projets">
                  <ArrowLeft size={18} />
                </Link>
              </Button>
            )}

            {/* Indicateur de sauvegarde automatique */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none" aria-live="polite">
              {saving ? (
                <span className="flex items-center gap-1 text-primary animate-pulse font-medium">
                  <Loader2 size={13} className="animate-spin" />
                  <span className="hidden sm:inline">Enregistrement...</span>
                </span>
              ) : dirty ? (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="hidden md:inline">Non enregistré</span>
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 size={13} />
                  <span className="hidden sm:inline">
                    Enregistré à {lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Cloud size={13} />
                  <span className="hidden sm:inline">Prêt</span>
                </span>
              )}
            </div>
          </div>

          {/* Côté droit : Actions rapides */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Assistant IA */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAiAssistant(true)}
              className="h-8 px-2.5 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10 shadow-2xs cursor-pointer"
              title="Générer ou enrichir avec l'IA"
            >
              <Sparkles size={14} />
              <span className="hidden md:inline font-semibold">Assistant IA</span>
            </Button>

            {/* Aperçu */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              className="h-8 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground shadow-2xs cursor-pointer"
              title="Aperçu du rendu final de la page"
            >
              <Eye size={14} />
              <span className="hidden sm:inline">Aperçu</span>
            </Button>

            {/* Enregistrer (Brouillon) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => save({ forceStatus: "draft" })}
              className="h-8 px-3 text-xs gap-1.5 font-medium shadow-2xs cursor-pointer"
              title="Enregistrer en brouillon (Ctrl+S)"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={14} />}
              <span className="hidden sm:inline">Enregistrer</span>
            </Button>

            {/* Publier / Mettre à jour */}
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => save({ forceStatus: "published" })}
              className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-primary shadow-sm cursor-pointer"
              title={settings.status === "published" ? "Mettre à jour la version en ligne" : "Publier immédiatement"}
            >
              <Send size={13} />
              <span>{settings.status === "published" ? "Mettre à jour" : "Publier"}</span>
            </Button>
          </div>
        </header>

        {/* 2. Zone de Titre avec ligne d'accentuation Blogger */}
        <div className="bg-card px-4 sm:px-8 pt-2.5 pb-2">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Titre du projet"
            className="w-full bg-transparent text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none py-1 transition-colors"
          />
          <div className="h-0.5 w-full bg-gradient-to-r from-primary via-primary/50 to-transparent mt-1 rounded-full" />
        </div>

        {/* 3. Barre d'outils de mise en forme */}
        <BloggerToolbar
          editor={editorInstance}
          mode={mode}
          onModeChange={handleModeChange}
          onOpenMedia={() => setShowMediaDialog(true)}
          onOpenLink={() => setShowLinkDialog(true)}
          onOpenVideo={() => setShowVideoDialog(true)}
          onOpenTable={() => setShowTableDialog(true)}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          CORPS PRINCIPAL : ZONE DE RÉDACTION + PANNEAU LATÉRAL PARAMÈTRES
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Zone centrale de rédaction fluide */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-muted/15 flex flex-col items-center">
          <div className="w-full max-w-4xl flex-1 flex flex-col">
            <div className={`w-full flex-1 flex flex-col ${mode === "wysiwyg" ? "flex" : "hidden"}`}>
              <WysiwygEditor
                initialHtml={htmlContent}
                onChange={(html) => {
                  setHtmlContent(html);
                  setDirty(true);
                }}
                onEditorReady={setEditorInstance}
              />
            </div>
            <div className={`w-full flex-1 flex flex-col ${mode === "html" ? "flex" : "hidden"}`}>
              <HtmlCodeEditor
                value={htmlContent}
                onChange={(html) => {
                  setHtmlContent(html);
                  setDirty(true);
                }}
              />
            </div>
          </div>
        </main>

        {/* ── Bouton flottant discret centré verticalement pour réouvrir (jamais sur la toolbar) ── */}
        {!showSidePanel && (
          <button
            type="button"
            onClick={() => setShowSidePanel(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex h-10 w-10 items-center justify-center rounded-l-xl border border-r-0 border-border bg-card shadow-lg hover:bg-muted text-primary transition-all duration-200 hover:-translate-x-0.5 cursor-pointer"
            title="Ouvrir les paramètres du projet"
            aria-label="Ouvrir les paramètres du projet"
          >
            <SlidersHorizontal size={18} />
          </button>
        )}

        {/* ── Panneau latéral droit épuré ── */}
        {showSidePanel && (
          <>
            {/* Backdrop sombre sur mobile / tablette */}
            <div
              className="fixed inset-0 bg-background/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
              onClick={() => setShowSidePanel(false)}
              aria-hidden
            />

            <aside className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] sm:w-96 max-w-md border-l border-border bg-card shadow-2xl transition-all duration-300 lg:static lg:w-80 xl:w-84 lg:z-10 lg:shadow-xs flex flex-col overflow-hidden">
              <div className="sticky top-0 bg-card/95 backdrop-blur-xs border-b border-border/80 px-4 py-2.5 flex items-center justify-between text-xs font-bold text-foreground shrink-0 z-10">
                <span className="uppercase tracking-wider text-muted-foreground text-[11px] flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-primary" /> Paramètres du projet
                </span>
                <button
                  type="button"
                  onClick={() => setShowSidePanel(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  title="Fermer les paramètres"
                  aria-label="Fermer les paramètres"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/50 hover:[&::-webkit-scrollbar-thumb]:bg-border">
                <ProjectSidePanel
                  data={settings}
                  onChange={updateSettings}
                  projectTitle={title}
                  projectHtml={htmlContent}
                  availableImages={availableProjectImages}
                />
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODALES ET DIALOGUES
      ════════════════════════════════════════════════════════════════════════ */}
      <MediaLibraryDialog
        open={showMediaDialog}
        onClose={() => setShowMediaDialog(false)}
        onInsert={handleInsertMedia}
        existingMedia={[
          ...(settings.image_url ? [{ url: settings.image_url, alt: settings.image_alt }] : []),
          ...settings.gallery.map((g) => ({ url: g.url, alt: g.alt })),
        ]}
      />

      <LinkInsertDialog
        open={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
        onConfirm={handleInsertLink}
        initialUrl={editorInstance?.getAttributes("link")?.["href"] ?? ""}
        onRemove={() => editorInstance?.chain().focus().unsetLink().run()}
      />

      <VideoInsertDialog
        open={showVideoDialog}
        onClose={() => setShowVideoDialog(false)}
        onConfirm={handleInsertVideo}
      />

      <TableInsertDialog
        open={showTableDialog}
        onClose={() => setShowTableDialog(false)}
        onConfirm={handleInsertTable}
      />

      <ProjectPreviewModal
        open={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={title}
        htmlContent={htmlContent}
        settings={settings}
      />

      <ProjectAiAssistant
        open={showAiAssistant}
        onOpenChange={setShowAiAssistant}
        projectData={{
          title,
          tag: settings.tag,
          intro: settings.intro,
          summary: settings.summary,
          technologies: settings.technologies,
          content: [],
        }}
        onApplySummary={(aiIntro, aiSummary) => {
          setSettings((prev) => ({
            ...prev,
            ...(aiIntro ? { intro: aiIntro.trim() } : {}),
            ...(aiSummary ? { summary: aiSummary.trim() } : {}),
          }));
          setDirty(true);
        }}
        onApplyTechnologies={(aiTechs) => {
          setSettings((prev) => ({ ...prev, technologies: aiTechs }));
          setDirty(true);
        }}
        onApplyCaseStudyBlocks={(blocks, opts) => {
          const { html: convertedHtml } = legacyBlocksToHtml(blocks);
          if (opts?.replace) {
            setHtmlContent(convertedHtml);
            if (editorInstance) editorInstance.commands.setContent(convertedHtml, false);
          } else {
            const combined = htmlContent + "\n" + convertedHtml;
            setHtmlContent(combined);
            if (editorInstance) editorInstance.commands.setContent(combined, false);
          }
          setDirty(true);
        }}
        onAppendSingleSection={(secTitle, secContent) => {
          const richBlocks = sectionTextToRichBlocks(secTitle, secContent);
          const { html: convertedHtml } = legacyBlocksToHtml(richBlocks);
          const combined = htmlContent ? `${htmlContent}\n${convertedHtml}` : convertedHtml;
          setHtmlContent(combined);
          if (editorInstance) editorInstance.commands.setContent(combined, false);
          setDirty(true);
        }}
        onApplySeo={(seoTitle, seoDesc) => {
          setSettings((prev) => ({
            ...prev,
            seo_title: seoTitle.trim(),
            seo_description: seoDesc.trim(),
          }));
          setDirty(true);
        }}
      />

      {/* ── Dialog de confirmation de sortie (remplace window.confirm générique) ── */}
      <AlertDialog
        open={showLeaveDialog}
        onOpenChange={(o) => {
          if (!o) {
            setShowLeaveDialog(false);
            pendingBlockerRef.current = null;
            if (blocker.status === "blocked") blocker.reset();
          }
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-6">
          <AlertDialogHeader className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Modifications non enregistrées
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Vous avez des modifications non enregistrées sur ce projet. Si vous quittez maintenant, elles seront perdues définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <AlertDialogCancel
              className="flex-1 rounded-xl cursor-pointer"
              onClick={() => {
                setShowLeaveDialog(false);
                pendingBlockerRef.current = null;
                if (blocker.status === "blocked") blocker.reset();
              }}
            >
              Continuer l&apos;édition
            </AlertDialogCancel>
            <AlertDialogAction
              className="flex-1 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => {
                setShowLeaveDialog(false);
                const proceed = pendingBlockerRef.current;
                pendingBlockerRef.current = null;
                if (proceed) proceed();
              }}
            >
              Quitter sans enregistrer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
