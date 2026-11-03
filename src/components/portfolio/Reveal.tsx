import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal – animation d'entrée au défilement fluide et 100% non-bloquante.
 * Garantit que le contenu est TOUJOURS visible au chargement ou rafraîchissement.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "bottom" | "left" | "right" | "scale";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Si l'élément est déjà dans le champ de vision au chargement :
    // On ne fait RIEN : il reste affiché immédiatement, sans aucun clignotement ni disparition !
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      return;
    }

    // Uniquement pour les éléments situés plus bas dans la page :
    el.classList.add("reveal-pending");

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => {
              el?.classList.add("is-visible");
            }, delay);
          } else {
            el.classList.add("is-visible");
          }
          io.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "60px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  number,
  accent,
  description,
  centered = false,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  number?: string;
  accent?: string;
  description?: string;
  centered?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`mb-10 md:mb-14 ${centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}`}>
      <div
        className={`inline-flex items-center gap-3 text-xs md:text-sm font-semibold uppercase tracking-[0.22em] ${
          dark ? "text-primary-glow" : "text-primary"
        } ${centered ? "justify-center" : ""}`}
      >
        <span
          className={`h-[1.5px] w-7 rounded-full inline-block ${
            dark ? "bg-primary-glow/70" : "bg-primary/80"
          }`}
          aria-hidden="true"
        />
        <span>
          {number && <span className="mr-1.5 opacity-70">{number} ·</span>}
          {eyebrow}
        </span>
        {centered && (
          <span
            className={`h-[1.5px] w-7 rounded-full inline-block ${
              dark ? "bg-primary-glow/70" : "bg-primary/80"
            }`}
            aria-hidden="true"
          />
        )}
      </div>

      <h2
        className={`mt-4 font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-medium leading-[1.14] tracking-tight ${
          dark ? "text-ink-foreground" : "text-foreground"
        }`}
      >
        {title}
        {accent && (
          <>
            {" "}
            <span
              className={`italic font-serif ${
                dark ? "text-primary-glow" : "text-primary"
              }`}
            >
              {accent}
            </span>
          </>
        )}
      </h2>

      {description && (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            dark ? "text-ink-foreground/75" : "text-muted-foreground"
          }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
