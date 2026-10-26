import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandsQuery } from "@/lib/content.queries";
import { getOptimizedImageUrl } from "@/lib/siteConfig";

/** Bandeau de marques / partenaires à défilement infini.
 *  Géré dynamiquement depuis l'espace admin.
 *  Affiche les logos avec taille harmonisée, agrandie et révélation de couleur au survol ou toucher mobile. */
export function BrandsMarquee() {
  const { data: list = [] } = useQuery(brandsQuery);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);

  // Réinitialise la marque active après 4 secondes pour reprendre le défilement
  useEffect(() => {
    if (!activeBrandId) return;
    const timer = window.setTimeout(() => setActiveBrandId(null), 4000);
    return () => clearTimeout(timer);
  }, [activeBrandId]);

  if (list.length === 0) return null;

  // On duplique la liste pour que le défilement soit sans fin
  const doubled = [...list, ...list];

  const handleToggleBrand = (id: string) => {
    setActiveBrandId((prev) => (prev === id ? null : id));
  };

  return (
    <section
      aria-label="Institutions et partenaires de confiance"
      className="border-y border-border bg-card py-10 md:py-16 overflow-hidden"
    >
      {/* En-tête épuré */}
      <div className="mx-auto mb-8 w-full max-w-6xl px-5 text-center md:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Ils m'ont fait confiance
        </p>
      </div>

      {/* Piste de défilement avec pause au survol ou au toucher actif */}
      <div
        className={`marquee-pause relative ${
          activeBrandId ? "[&_.marquee-track]:[animation-play-state:paused]" : ""
        }`}
      >
        {/* Dégradés masquant les bords pour un rendu cinématique */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 sm:w-36"
          style={{ background: "linear-gradient(to right, var(--color-card), transparent)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 sm:w-36"
          style={{ background: "linear-gradient(to left, var(--color-card), transparent)" }}
          aria-hidden
        />

        <ul className="marquee-track gap-0 items-center" role="list" aria-label="Partenaires">
          {doubled.map((b, i) => {
            const isHighlighted = activeBrandId === b.id;
            return (
              <li
                key={`${b.id}-${i}`}
                className="flex shrink-0 items-center gap-6 sm:gap-10 px-6 sm:px-10"
                aria-hidden={i >= list.length}
              >
                {/* Séparateur discret */}
                <span className="h-8 sm:h-10 w-[1.5px] rounded-full bg-border/60 shrink-0" aria-hidden />

                <button
                  type="button"
                  onClick={() => handleToggleBrand(b.id)}
                  className="group relative flex items-center justify-center min-w-[110px] sm:min-w-[150px] md:min-w-[170px] h-16 sm:h-20 px-2 rounded-2xl bg-transparent border-0 cursor-pointer transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`${b.name} - toucher ou survoler pour afficher la couleur`}
                  title={b.name}
                >
                  {b.logo_url ? (
                    <img
                      src={getOptimizedImageUrl(b.logo_url, { width: 240 })}
                      alt={b.name}
                      loading="lazy"
                      decoding="async"
                      className={`h-11 sm:h-14 md:h-16 max-h-12 sm:max-h-16 md:max-h-20 w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[230px] object-contain transition-all duration-300 select-none ${
                        isHighlighted
                          ? "opacity-100 grayscale-0 scale-110 drop-shadow-md"
                          : "opacity-75 grayscale contrast-125 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 group-active:opacity-100 group-active:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0 dark:brightness-125 dark:contrast-100"
                      }`}
                    />
                  ) : (
                    <span
                      className={`font-serif text-lg sm:text-2xl font-medium tracking-tight whitespace-nowrap transition-all duration-300 ${
                        isHighlighted
                          ? "text-primary scale-105"
                          : "text-foreground/80 group-hover:text-foreground group-hover:scale-105"
                      }`}
                    >
                      {b.name}
                    </span>
                  )}

                  {/* Badge infobulle discret au toucher mobile */}
                  {isHighlighted && (
                    <span className="pointer-events-none absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background shadow-lg">
                      {b.name}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
