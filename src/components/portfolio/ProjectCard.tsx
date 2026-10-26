import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Globe } from "lucide-react";
import { projectPage as copy } from "@/content/portfolio";
import type { PublicProject as Project } from "@/lib/content.queries";
import { getOptimizedImageUrl } from "@/lib/siteConfig";

export function ProjectCard({
  p,
  index,
  featured = false,
}: {
  p: Project;
  index: number;
  featured?: boolean;
}) {
  return (
    <article
      className={`group pillar-card relative flex h-full flex-col overflow-hidden rounded-[28px] border border-border/70 bg-card p-3 sm:p-3.5 shadow-sm transition-all duration-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring ${
        featured ? "md:col-span-2 md:flex-row md:p-4" : ""
      }`}
    >
      {/* Lien étendu : tout le bloc reste cliquable vers la page de détail */}
      <Link
        to="/projets/$slug"
        params={{ slug: p.slug }}
        aria-label={`${copy.readMore} : ${p.title}`}
        className="absolute inset-0 z-10 rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      {/* Cadre de prévisualisation média */}
      <div
        className={`relative overflow-hidden rounded-[20px] bg-muted/70 ${
          featured ? "md:w-3/5" : ""
        }`}
      >
        <img
          src={getOptimizedImageUrl(p.image_url, { width: featured ? 900 : 700 })}
          alt={p.image_alt}
          width={featured ? 900 : 700}
          height={featured ? 600 : 466}
          loading="lazy"
          decoding="async"
          className={`aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
            featured ? "md:h-full" : ""
          }`}
        />
        {/* Dégradé léger en surimpression */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40"
          aria-hidden="true"
        />

        {/* Badges flottants sur l'image */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-2">
          <span className="rounded-full border border-white/20 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md">
            {p.tag}
          </span>
        </div>

        {p.external_url && (
          <div className="absolute right-3.5 top-3.5 flex items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/95 px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              {copy.liveBadge}
            </span>
          </div>
        )}
      </div>

      {/* Corps éditorial de la carte */}
      <div
        className={`flex flex-1 flex-col px-3 sm:px-4 pt-4 sm:pt-5 pb-2 ${
          featured ? "md:w-2/5 md:justify-center md:px-6 md:py-4" : ""
        }`}
      >
        {/* En-tête numéroté */}
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-bold text-primary">
              0{index + 1}
            </span>
            <span className="h-[1.5px] w-4 rounded-full bg-primary/40" />
            <span className="text-muted-foreground tracking-wider">{p.tag}</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-medium text-muted-foreground/70">
            {copy.eyebrow}
          </span>
        </div>

        {/* Titre du projet */}
        <h3
          className={`mt-2.5 font-serif font-medium leading-snug tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary ${
            featured ? "text-2xl md:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {p.title}
        </h3>

        {/* Résumé textuel */}
        <p className="mt-2.5 line-clamp-3 text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
          {p.summary}
        </p>

        {/* Chips technologiques */}
        <ul
          className="mt-5 flex flex-wrap gap-1.5"
          aria-label="Technologies utilisées"
        >
          {p.technologies.slice(0, 4).map((t) => (
            <li
              key={t}
              className="rounded-full border border-border/50 bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition-colors group-hover:border-primary/25"
            >
              {t}
            </li>
          ))}
        </ul>

        {/* Barre d'action inférieure */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all duration-300 group-hover:gap-3">
            <span>{copy.readMore}</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow">
              <ArrowUpRight size={14} />
            </span>
          </span>

          {p.external_url && (
            <a
              href={p.external_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="relative z-20 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Globe size={12} className="text-primary" />
              <span>{copy.liveShort}</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
