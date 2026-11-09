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
  Wand2,
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
  created_at?: string;
  updated_at?: string;
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

  // Technologies
  const [techInput, setTechInput] = useState("");
  function handleAddTech() {
    const val = techInput.trim();
    if (val && !data.technologies.includes(val) && val.length <= 60) {
      onChange({ technologies: [...data.technologies, val] });
    }
    setTechInput("");
  }

  // Upload manuel d'affiche
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

  // Génération magique SEO par l'agent IA
  const [generatingSeo, setGeneratingSeo] = useState(false);

  const handleGenerateAiSeo = async () => {
    if (!projectTitle.trim() && !projectHtml.trim()) {
      toast.error("Veuillez d'abord saisir un titre ou un paragraphe de contenu.");
      return;
    }

    setGeneratingSeo(true);
    const toastId = toast.loading("L'agent IA analyse le projet et rédige le SEO...");

    try {
      // Nettoyage sommaire du HTML pour transmettre le texte pur
      const plainText = projectHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);

      const prompt = `Projet: "${projectTitle || "Nouveau projet"}"
Catégorie: ${data.tag || "Technologie / Cloud / Réseaux"}
Technologies: ${data.technologies.join(", ") || "Non spécifiées"}
Contenu du projet :
${plainText || "Projet en cours de rédaction."}

Rédige des métadonnées SEO captivantes, professionnelles et axées sur l'expertise technique de Landry Kayoyo.`;

      const systemInstruction = `Tu es un expert SEO senior. À partir du projet, génère :
1. Un titre SEO optimisé (50 à 60 caractères max, accrocheur, contenant les mots-clés importants).
2. Une méta-description percutante (140 à 160 caractères max, incisive, qui donne envie de cliquer depuis Google ou les réseaux sociaux).

Réponds STRICTEMENT par un objet JSON valide avec cette structure, sans balises markdown :
{"seo_title": "...", "seo_description": "..."}`;

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
          summary: parsed.seo_description.trim(), // Synchronise aussi le résumé pour les cartes
        });
        toast.success("Métadonnées SEO magiques générées avec succès !", { id: toastId });
        setOpenSections((prev) => ({ ...prev, seo: true }));
      } else {
        throw new Error("Format JSON non reconnu.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erreur de génération SEO.", { id: toastId });
    } finally {
      setGeneratingSeo(false);
    }
  };

  // L'affiche actuelle sélectionnée (ou par défaut la première image uploadée dans le texte)
  const currentCover = data.image_url || (availableImages.length > 0 ? availableImages[0] : "");

  return (
    <div className="w-full flex flex-col p-3 space-y-2.5 text-xs select-none">

      {/* AFFICHE & COUVERTURE */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("cover")}
          className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            <ImageIcon size={13} className="text-primary" /> Affiche & Couverture
          </span>
          {openSections["cover"] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections["cover"] && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-border/40">
            {currentCover ? (
              <div className="space-y-1.5 pt-2">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-border bg-muted">
                  <img src={currentCover} alt="Affiche" className="h-full w-full object-cover" />
                  <div className="absolute top-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-medium text-white flex items-center gap-1">
                    <Check size={9} className="text-emerald-400" /> Active
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{data.image_url ? "Image personnalisée" : "1ère image du contenu"}</span>
                  {data.image_url && (
                    <button type="button" onClick={() => onChange({ image_url: "" })} className="text-primary hover:underline cursor-pointer">
                      Réinitialiser
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-3 text-center bg-muted/20 text-muted-foreground mt-2">
                <ImageIcon size={18} className="mx-auto mb-1 opacity-50" />
                <p className="text-[10px] font-medium text-foreground">Aucune affiche</p>
                <p className="text-[10px] mt-0.5">La 1ère image insérée dans l&apos;article sera utilisée automatiquement.</p>
              </div>
            )}

            {availableImages.length > 0 && (
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold text-foreground">
                  Choisir parmi les images ({availableImages.length})
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {availableImages.map((imgUrl, idx) => {
                    const isSelected = currentCover === imgUrl;
                    return (
                      <button
                        key={imgUrl}
                        type="button"
                        onClick={() => onChange({ image_url: imgUrl })}
                        className={`relative aspect-video rounded-md overflow-hidden border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/40"
                            : "border-border hover:border-primary/50 opacity-70 hover:opacity-100"
                        }`}
                        title={isSelected ? "Affiche actuelle" : "Définir comme affiche"}
                      >
                        <img src={imgUrl} alt={`Image ${idx + 1}`} className="h-full w-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/20 grid place-items-center">
                            <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-white">
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

            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleManualUpload(e.target.files?.[0])} />
              <Button
                type="button" variant="outline" size="sm" disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-7 text-[11px] gap-1.5 cursor-pointer"
              >
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Téléverser une affiche
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RÉFÉRENCEMENT (SEO) */}
      <div className="rounded-xl border border-primary/25 bg-card overflow-hidden">
        <div className="flex w-full items-center justify-between px-3 py-2.5 bg-primary/5 border-b border-border/40">
          <button type="button" onClick={() => toggleSection("seo")} className="flex items-center gap-2 cursor-pointer">
            <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-primary font-bold">
              <Search size={13} /> Référencement (SEO)
            </span>
            {openSections["seo"] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <Button
            type="button" size="sm" disabled={generatingSeo} onClick={handleGenerateAiSeo}
            className="h-6 px-2 text-[10px] font-semibold gap-1 bg-gradient-primary text-white cursor-pointer hover:opacity-90"
            title="Générer le SEO automatiquement avec l'IA"
          >
            {generatingSeo ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Magie IA
          </Button>
        </div>

        {openSections["seo"] && (
          <div className="px-3 pb-3 space-y-3 pt-2.5">
            {/* Aperçu Google */}
            <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-0.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Search size={9} className="text-primary" /> Aperçu Google
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate pt-0.5">
                landrynet.vercel.app › projets › {data.slug || "..."}
              </p>
              <p className="text-[11px] font-semibold text-primary truncate">{data.seo_title || projectTitle || "Titre du projet"}</p>
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                {data.seo_description || "Rédigez ou générez avec l'IA une description attractive..."}
              </p>
            </div>

            {/* Titre SEO */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-seo-title" className="text-[11px] font-semibold">Titre SEO</Label>
                <span className={`text-[9px] ${data.seo_title.length > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                  {data.seo_title.length}/60
                </span>
              </div>
              <Input
                id="side-seo-title"
                value={data.seo_title}
                onChange={(e) => onChange({ seo_title: e.target.value })}
                placeholder={projectTitle || "Titre optimisé..."}
                className="h-7 text-xs"
              />
            </div>

            {/* Description SEO */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-seo-desc" className="text-[11px] font-semibold">Méta-description</Label>
                <span className={`text-[9px] ${data.seo_description.length > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"}`}>
                  {data.seo_description.length}/160
                </span>
              </div>
              <Textarea
                id="side-seo-desc"
                rows={3}
                maxLength={250}
                value={data.seo_description}
                onChange={(e) => onChange({ seo_description: e.target.value, summary: e.target.value })}
                placeholder="Description percutante pour Google..."
                className="text-xs resize-none leading-relaxed"
              />
            </div>
          </div>
        )}
      </div>

      {/* LIEN & CATÉGORIE */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("general")}
          className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            <Sliders size={13} className="text-primary" /> Lien & Catégorie
          </span>
          {openSections["general"] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections["general"] && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-border/40 pt-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="side-slug" className="text-[11px] font-semibold">Slug (URL)</Label>
                <button type="button" onClick={() => onChange({ slug: slugify(projectTitle) })} className="text-[10px] text-primary hover:underline cursor-pointer">
                  Générer auto
                </button>
              </div>
              <Input
                id="side-slug"
                value={data.slug}
                onChange={(e) => onChange({ slug: slugify(e.target.value) || e.target.value.toLowerCase() })}
                placeholder="mon-projet"
                className="h-7 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                /projets/<span className="text-primary font-medium">{data.slug || "..."}</span>
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="side-tag" className="text-[11px] font-semibold">Étiquette / Tag</Label>
              <Input
                id="side-tag"
                value={data.tag}
                onChange={(e) => onChange({ tag: e.target.value })}
                placeholder="Ex. Projet personnel, Production..."
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* TECHNOLOGIES */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("tech")}
          className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            <Layers size={13} className="text-primary" /> Technologies ({data.technologies.length})
          </span>
          {openSections["tech"] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections["tech"] && (
          <div className="px-3 pb-3 space-y-2 border-t border-border/40 pt-2.5">
            <div className="flex flex-wrap gap-1 min-h-[1.25rem]">
              {data.technologies.map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  {t}
                  <button
                    type="button"
                    onClick={() => onChange({ technologies: data.technologies.filter((x) => x !== t) })}
                    className="grid h-3 w-3 place-items-center rounded-full hover:bg-background cursor-pointer ml-0.5"
                    title={`Retirer ${t}`}
                  >
                    <X size={8} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-1.5">
              <Input
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddTech(); } }}
                placeholder="Ex. Linux, Docker, React..."
                className="h-7 text-xs flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTech} className="h-7 px-2 text-xs shrink-0 cursor-pointer">
                <Plus size={12} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* LIENS & MISE EN AVANT */}
      <div className="rounded-xl border border-border/70 bg-card overflow-hidden">
        <button
          type="button"
          onClick={() => toggleSection("links")}
          className="flex w-full items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            <LinkIcon size={13} className="text-primary" /> Liens & Mise en avant
          </span>
          {openSections["links"] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections["links"] && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-border/40 pt-2.5">
            <div className="space-y-1">
              <Label htmlFor="side-ext-url" className="text-[11px] font-semibold flex items-center gap-1.5">
                <Globe size={11} className="text-primary" /> Démo en ligne
              </Label>
              <Input id="side-ext-url" type="url" placeholder="https://..." value={data.external_url} onChange={(e) => onChange({ external_url: e.target.value })} className="h-7 text-xs" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="side-git-url" className="text-[11px] font-semibold flex items-center gap-1.5">
                <Github size={11} /> Dépôt GitHub
              </Label>
              <Input id="side-git-url" type="url" placeholder="https://github.com/..." value={data.github_url} onChange={(e) => onChange({ github_url: e.target.value })} className="h-7 text-xs" />
            </div>

            <label className="flex items-center justify-between rounded-lg border border-border p-2 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-1.5">
                <Star size={12} className={data.featured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"} />
                <div>
                  <p className="font-semibold text-[11px] text-foreground">Mis en avant</p>
                  <p className="text-[9px] text-muted-foreground">Visible sur la page d&apos;accueil</p>
                </div>
              </div>
              <Switch checked={data.featured} onCheckedChange={(checked) => onChange({ featured: checked })} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
