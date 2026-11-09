import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Github, Globe, Sparkles, X } from "lucide-react";
import { sanitizeProjectHtml } from "@/lib/project-content";
import type { ProjectSidePanelData } from "./ProjectSidePanel";

export function ProjectPreviewModal({
  open,
  onClose,
  title,
  htmlContent,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  htmlContent: string;
  settings: ProjectSidePanelData;
}) {
  const cleanHtml = useMemo(() => sanitizeProjectHtml(htmlContent), [htmlContent]);
  const container = "mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8";

  // L'affiche / couverture sélectionnée ou par défaut la première image de l'article
  const coverUrl = useMemo(() => {
    if (settings.image_url?.trim()) return settings.image_url.trim();
    const match = htmlContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1].trim() : "";
  }, [settings.image_url, htmlContent]);

  // Déduplication stricte : si l'affiche est présentée en haut à sa manière,
  // on retire son double dans le corps du texte pour ne jamais avoir deux fois la même image.
  const displayHtml = useMemo(() => {
    if (!cleanHtml) return "";
    if (!coverUrl) return cleanHtml;

    const normalize = (u: string) => {
      try {
        return u.split("?")[0].replace(/\/upload\/(?:[a-z0-9_,:]+\/)?/, "/upload/");
      } catch {
        return u;
      }
    };

    const target = normalize(coverUrl);
    let stripped = false;

    // 1. Balise figure englobante
    let clean = cleanHtml.replace(
      /<figure[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>(?:\s*<figcaption>.*?<\/figcaption>)?\s*<\/figure>/i,
      (match, src) => {
        if (!stripped && (normalize(src) === target || src === coverUrl)) {
          stripped = true;
          return "";
        }
        return match;
      }
    );

    // 2. Balise p englobante
    if (!stripped) {
      clean = clean.replace(
        /<p[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/p>/i,
        (match, src) => {
          if (!stripped && (normalize(src) === target || src === coverUrl)) {
            stripped = true;
            return "";
          }
          return match;
        }
      );
    }

    // 3. Balise img seule
    if (!stripped) {
      clean = clean.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
        (match, src) => {
          if (!stripped && (normalize(src) === target || src === coverUrl)) {
            stripped = true;
            return "";
          }
          return match;
        }
      );
    }

    return clean;
  }, [cleanHtml, coverUrl]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94dvh] h-[94dvh] w-[calc(100vw-1rem)] sm:w-[calc(100vw-3rem)] max-w-5xl overflow-y-auto p-0 rounded-2xl sm:rounded-3xl border border-border bg-background shadow-2xl">
        <DialogTitle className="sr-only">Aperçu du projet</DialogTitle>

        <div className="bg-background pb-16 pt-6 text-foreground min-w-0">
          {/* Bandeau d'aperçu fixé */}
          <div className="mx-4 sm:mx-8 mb-8 flex items-center justify-between gap-3 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles size={14} className="shrink-0" />
              <span className="truncate">
                Aperçu fidèle · {settings.status === "published" ? "Publié en ligne" : "Brouillon privé"}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={14} className="mr-1" /> Fermer
            </Button>
          </div>

          {/* En-tête de la page */}
          <section className={container}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles size={11} /> Étude de cas
              </span>
              {settings.tag && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                  {settings.tag}
                </span>
              )}
            </div>

            <h1 className="max-w-4xl text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight break-words">
              {title || "Titre du projet"}
            </h1>

            {settings.intro && (
              <p className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground break-words">
                {settings.intro}
              </p>
            )}

            {settings.technologies.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-1.5 sm:gap-2">
                {settings.technologies.map((t) => (
                  <li
                    key={t}
                    className="rounded-full border border-border bg-secondary/70 px-3 py-1 text-xs font-semibold text-secondary-foreground"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            )}

            {/* Boutons d'action */}
            {(settings.external_url || settings.github_url) && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                {settings.external_url && (
                  <Button size="default" className="rounded-full bg-gradient-primary gap-1.5" asChild>
                    <a href={settings.external_url} target="_blank" rel="noopener noreferrer">
                      <Globe size={15} /> Voir le projet en ligne <ArrowUpRight size={14} />
                    </a>
                  </Button>
                )}
                {settings.github_url && (
                  <Button size="default" variant="outline" className="rounded-full gap-1.5" asChild>
                    <a href={settings.github_url} target="_blank" rel="noopener noreferrer">
                      <Github size={15} /> Code source GitHub <ArrowUpRight size={14} />
                    </a>
                  </Button>
                )}
              </div>
            )}

            {/* Affiche de couverture principale (affichée à sa manière) */}
            {coverUrl && (
              <div className="mt-8 sm:mt-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm">
                <img
                  src={coverUrl}
                  alt={settings.image_alt || title || "Affiche du projet"}
                  className="aspect-[16/10] sm:aspect-[16/9] w-full object-cover"
                />
              </div>
            )}
          </section>

          {/* Corps de rédaction rendu HTML */}
          <section className={`${container} mt-8 sm:mt-12`}>
            {displayHtml ? (
              <div
                className="project-prose"
                dangerouslySetInnerHTML={{ __html: displayHtml }}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Aucun contenu rédigé pour le moment.
              </div>
            )}
          </section>

          {/* Galerie additionnelle si présente */}
          {settings.gallery.length > 0 && (
            <section className={`${container} mt-12 sm:mt-16 pt-8 border-t border-border`}>
              <h3 className="text-xl font-bold mb-4">Galerie du projet</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {settings.gallery.map((img, i) => (
                  <figure
                    key={img.id || i}
                    className="overflow-hidden rounded-xl border border-border bg-card shadow-xs"
                  >
                    <img src={img.url} alt={img.alt || ""} className="aspect-video w-full object-cover" />
                    {img.caption && (
                      <figcaption className="p-2.5 text-xs text-muted-foreground text-center italic">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
