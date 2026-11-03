import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Globe } from "lucide-react";
import { projectPage as copy } from "@/content/portfolio";
import type { PublicProject as Project } from "@/lib/content.queries";
import { getOptimizedImageUrl } from "@/lib/siteConfig";

export function ProjectCard({
  p,
  featured = false,
}: {
  p: Project;
  featured?: boolean;
}) {
  return (
    <article
      className={`group pillar-card relative flex h-full flex-col overflow-hidden rounded-[24px] border border-border/70 bg-card p-2.5 sm:p-3 shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md focus-within:outline-none focus-within:ring-2 focus-within:ring-ring ${
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
          className={`aspect-[16/9] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
            featured ? "md:h-full" : ""
          }`}
        />
        {/* Dégradé léger en surimpression */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-40"
          aria-hidden="true"
        />

        {/* Catégorie du projet */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full border border-white/20 bg-background/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md">
            {p.tag}
          </span>
        </div>
      </div>

      {/* Corps éditorial de la carte */}
      <div
        className={`flex flex-1 flex-col px-2.5 sm:px-3 pt-4 pb-2 ${
          featured ? "md:w-2/5 md:justify-center md:px-6 md:py-4" : ""
        }`}
      >
        {/* Titre du projet */}
        <h3
          className={`mt-2.5 font-serif font-medium leading-snug tracking-tight text-foreground transition-colors duration-300 group-hover:text-primary ${
            featured ? "text-2xl md:text-3xl" : "text-xl sm:text-2xl"
          }`}
        >
          {p.title}
        </h3>

        {/* Résumé textuel */}
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {p.summary}
        </p>

        {/* Chips technologiques */}
        <ul
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Technologies utilisées"
        >
          {p.technologies.slice(0, 3).map((t) => (
            <li
              key={t}
              className="rounded-full border border-border/50 bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition-colors group-hover:border-primary/25"
            >
              {t}
            </li>
          ))}
        </ul>

        {/* Barre d'action inférieure */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-3.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all duration-300 group-hover:gap-2.5">
            <span>{copy.readMore}</span>
            <ArrowUpRight size={15} />
          </span>

          {p.external_url && (
            <a
              href={p.external_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="relative z-20 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
