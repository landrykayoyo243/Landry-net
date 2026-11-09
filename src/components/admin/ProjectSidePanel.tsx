import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  Github,
  Globe,
  Plus,
  Search,
  X,
  Layers,
  Link as LinkIcon,
  Sliders,
  Star,
  Image as ImageIcon,
  Check,
  Upload,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { slugify } from "@/lib/blocks";
import { uploadProjectImage } from "@/lib/admin-data";
import { compressImageBeforeUpload } from "@/lib/cloudinary";
import { adminApi } from "@/lib/admin-api-client";
import type { ProjectGalleryItem } from "@/lib/project-content";

export interface ProjectSidePanelData {
  slug: string;
  tag: string;
  intro: string;
  summary: string;
  technologies: string[];
  image_url: string;
  image_alt: string;
  gallery: ProjectGalleryItem[];
  external_url: string;
  github_url: string;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published";
  featured: boolean;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export function ProjectSidePanel({
  data,
  onChange,
  projectTitle,
  projectHtml = "",
  availableImages = [],
}: {
  data: ProjectSidePanelData;
  onChange: (patch: Partial<ProjectSidePanelData>) => void;
  projectTitle: string;
  projectHtml?: string;
  availableImages?: string[];
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    cover: true,
    general: true,
    tech: true,
    links: true,
    seo: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [techInput, setTechInput] = useState("");
  function handleAddTech() {
    const val = techInput.trim();
    if (val && !data.technologies.includes(val) && val.length <= 60) {
      onChange({ technologies: [...data.technologies, val] });
    }
    setTechInput("");
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleManualUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    const toastId = toast.loading("Téléversement de l'affiche...");
    try {
      const optimized = await compressImageBeforeUpload(file);
      const url = await uploadProjectImage(optimized);
      onChange({
        image_url: url,
        image_alt: data.image_alt || projectTitle || "Affiche du projet",
      });
      toast.success("Affiche enregistrée !", { id: toastId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de téléversement.", { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const [generatingSeo, setGeneratingSeo] = useState(false);

  const handleGenerateAiSeo = async () => {
    if (!projectTitle.trim() && !projectHtml.trim()) {
      toast.error("Veuillez d'abord saisir un titre ou un paragraphe.");
      return;
    }

    setGeneratingSeo(true);
    const toastId = toast.loading("Génération du SEO...");

    try {
      const plainText = projectHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);

      const prompt = `Projet: "${projectTitle || "Nouveau projet"}"
Catégorie: ${data.tag || "Technologie"}
Technologies: ${data.technologies.join(", ") || "Non spécifiées"}
Contenu :
${plainText || "Projet en cours de rédaction."}

Rédige des métadonnées SEO captivantes et professionnelles.`;

      const systemInstruction = `Tu es un expert SEO. Génère un JSON strict :
{"seo_title": "titre 50-60 car.", "seo_description": "description 140-160 car."}`;

      const res = await adminApi.generateAiText({
        prompt,
        systemInstruction,
        temperature: 0.7,
      });

      const cleanJson = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanJson);

      if (parsed.seo_title && parsed.seo_description) {
        onChange({
          seo_title: parsed.seo_title.trim(),
          seo_description: parsed.seo_description.trim(),
          summary: parsed.seo_description.trim(),
        });
        toast.success("SEO généré avec succès !", { id: toastId });
        setOpenSections((prev) => ({ ...prev, seo: true }));
      } else {
        throw new Error("Réponse inattendue.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur génération SEO.", { id: toastId });
    } finally {
      setGeneratingSeo(false);
    }
  };

  const currentCover = data.image_url || (availableImages.length > 0 ? availableImages[0] : "");

  return (
    <div className="w-full flex flex-col p-3.5 sm:p-4 space-y-3 text-xs select-none">
      {/* ── AFFICHE & COUVERTURE ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("cover")}
          className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
            <ImageIcon size={14} className="text-primary" /> Affiche & Couverture
          </span>
          <span className="text-muted-foreground/70">
            {openSections["cover"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {openSections["cover"] && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border/30">
            {currentCover ? (
              <div className="space-y-2">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border/40 bg-muted/40">
                  <img src={currentCover} alt="Affiche" className="h-full w-full object-cover" />
                  <div className="absolute top-2 left-2 rounded-md bg-black/65 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                    <Check size={10} className="text-emerald-400" /> Active
                  </div>
                </div>
                {data.image_url && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => onChange({ image_url: "" })}
                      className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      Supprimer l&apos;image personnalisée
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/50 p-4 text-center bg-muted/15 text-muted-foreground">
                <ImageIcon size={20} className="mx-auto mb-1.5 opacity-40 text-primary" />
                <p className="text-[11px] font-medium text-foreground/80">Aucune affiche sélectionnée</p>
              </div>
            )}

            {availableImages.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Images du document ({availableImages.length})
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {availableImages.map((imgUrl, idx) => {
                    const isSelected = currentCover === imgUrl;
                    return (
                      <button
                        key={imgUrl}
                        type="button"
                        onClick={() => onChange({ image_url: imgUrl })}
                        className={`relative aspect-video rounded-md overflow-hidden border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-border/40 hover:border-border opacity-70 hover:opacity-100"
                        }`}
                        title={isSelected ? "Affiche active" : "Utiliser comme affiche"}
                      >
                        <img src={imgUrl} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/25 grid place-items-center">
                            <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-primary-foreground">
                              <Check size={10} />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleManualUpload(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8 text-xs gap-2 border-border/50 hover:bg-muted/40 cursor-pointer"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              Téléverser une affiche
            </Button>
          </div>
        )}
      </div>

      {/* ── RÉFÉRENCEMENT (SEO) ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-2xs">
        <div className="flex w-full items-center justify-between px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => toggleSection("seo")}
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
              <Search size={14} className="text-primary" /> Référencement (SEO)
            </span>
            <span className="text-muted-foreground/70">
              {openSections["seo"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          </button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={generatingSeo}
            onClick={handleGenerateAiSeo}
            className="h-7 px-2 text-[11px] font-medium gap-1.5 text-primary hover:bg-primary/10 cursor-pointer"
            title="Générer avec l'IA"
          >
            {generatingSeo ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Générer
          </Button>
        </div>

        {openSections["seo"] && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-3.5 border-t border-border/30">
            {/* Aperçu épuré du résultat dans les moteurs de recherche */}
            <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                /projets/{data.slug || "..."}
              </p>
              <p className="text-xs font-semibold text-primary truncate">
                {data.seo_title || projectTitle || "Titre du projet"}
              </p>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {data.seo_description || "Description de présentation du projet..."}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-seo-title" className="text-xs font-medium text-foreground/90">
                  Titre SEO
                </Label>
                <span
                  className={`text-[10px] ${
                    data.seo_title.length > 60 ? "text-amber-500 font-semibold" : "text-muted-foreground/70"
                  }`}
                >
                  {data.seo_title.length}/60
                </span>
              </div>
              <Input
                id="side-seo-title"
                value={data.seo_title}
                onChange={(e) => onChange({ seo_title: e.target.value })}
                placeholder={projectTitle || "Titre optimisé..."}
                className="h-8 text-xs border-border/40"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-seo-desc" className="text-xs font-medium text-foreground/90">
                  Méta-description
                </Label>
                <span
                  className={`text-[10px] ${
                    data.seo_description.length > 160 ? "text-amber-500 font-semibold" : "text-muted-foreground/70"
                  }`}
                >
                  {data.seo_description.length}/160
                </span>
              </div>
              <Textarea
                id="side-seo-desc"
                rows={3}
                maxLength={250}
                value={data.seo_description}
                onChange={(e) => onChange({ seo_description: e.target.value, summary: e.target.value })}
                placeholder="Description concise pour les moteurs de recherche..."
                className="text-xs resize-none leading-relaxed border-border/40"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── LIEN & CATÉGORIE ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("general")}
          className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
            <Sliders size={14} className="text-primary" /> Lien & Catégorie
          </span>
          <span className="text-muted-foreground/70">
            {openSections["general"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {openSections["general"] && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border/30">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-slug" className="text-xs font-medium text-foreground/90">
                  Slug (URL)
                </Label>
                <button
                  type="button"
                  onClick={() => onChange({ slug: slugify(projectTitle) })}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  Générer auto
                </button>
              </div>
              <Input
                id="side-slug"
                value={data.slug}
                onChange={(e) => onChange({ slug: slugify(e.target.value) || e.target.value.toLowerCase() })}
                placeholder="mon-projet"
                className="h-8 text-xs font-mono border-border/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="side-tag" className="text-xs font-medium text-foreground/90">
                Catégorie / Tag
              </Label>
              <Input
                id="side-tag"
                value={data.tag}
                onChange={(e) => onChange({ tag: e.target.value })}
                placeholder="Ex. Web, Cloud, Réseaux..."
                className="h-8 text-xs border-border/40"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TECHNOLOGIES ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("tech")}
          className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
            <Layers size={14} className="text-primary" /> Technologies ({data.technologies.length})
          </span>
          <span className="text-muted-foreground/70">
            {openSections["tech"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {openSections["tech"] && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border/30">
            {data.technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {data.technologies.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => onChange({ technologies: data.technologies.filter((x) => x !== t) })}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      title={`Retirer ${t}`}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTech();
                  }
                }}
                placeholder="Ajouter (ex. React, Docker...)"
                className="h-8 text-xs flex-1 border-border/40"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTech}
                className="h-8 px-2.5 text-xs shrink-0 border-border/40 cursor-pointer"
              >
                <Plus size={13} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── LIENS & MISE EN AVANT ── */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => toggleSection("links")}
          className="flex w-full items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold text-foreground/80">
            <LinkIcon size={14} className="text-primary" /> Liens & Visibilité
          </span>
          <span className="text-muted-foreground/70">
            {openSections["links"] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {openSections["links"] && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-border/30">
            <div className="space-y-1.5">
              <Label htmlFor="side-ext-url" className="text-xs font-medium text-foreground/90 flex items-center gap-1.5">
                <Globe size={12} className="text-primary" /> Démo en ligne
              </Label>
              <Input
                id="side-ext-url"
                type="url"
                placeholder="https://..."
                value={data.external_url}
                onChange={(e) => onChange({ external_url: e.target.value })}
                className="h-8 text-xs border-border/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="side-git-url" className="text-xs font-medium text-foreground/90 flex items-center gap-1.5">
                <Github size={12} /> Dépôt GitHub
              </Label>
              <Input
                id="side-git-url"
                type="url"
                placeholder="https://github.com/..."
                value={data.github_url}
                onChange={(e) => onChange({ github_url: e.target.value })}
                className="h-8 text-xs border-border/40"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/15 p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <Star
                    size={14}
                    className={data.featured ? "text-amber-500 fill-amber-500" : "text-muted-foreground/60"}
                  />
                  <span className="text-xs font-medium text-foreground">Mettre en avant sur l&apos;accueil</span>
                </div>
                <Switch checked={data.featured} onCheckedChange={(checked) => onChange({ featured: checked })} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
