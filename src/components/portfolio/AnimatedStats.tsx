import { useEffect, useRef, useState } from "react";
import { Award, Briefcase, FolderGit2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { certificationsQuery, experiencesQuery, projectsQuery } from "@/lib/content.queries";

export function AnimatedCounter({ end, duration = 1200 }: { end: number; duration?: number }) {
  // Valeur réelle affichée immédiatement par défaut (SSR, JS en chargement ou désactivé)
  const [count, setCount] = useState(end);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    // Si l'utilisateur désactive les animations ou si end <= 0, conserver la valeur finale
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    if (prefersReducedMotion || end <= 0) {
      setCount(end);
      return;
    }

    if (started.current) {
      setCount(end);
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setCount(end);
      return;
    }

    let animationFrameId: number;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          setCount(0);
          const startTime = performance.now();
          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing fluide quad out
            const easeOut = 1 - (1 - progress) * (1 - progress);
            setCount(Math.round(easeOut * end));
            if (progress < 1) {
              animationFrameId = requestAnimationFrame(step);
            }
          };
          animationFrameId = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {count}
    </span>
  );
}

export function AnimatedStats({ className = "" }: { className?: string }) {
  const { data: projects } = useQuery(projectsQuery);
  const { data: certs } = useQuery(certificationsQuery);
  const { data: experiences } = useQuery(experiencesQuery);

  const projectsCount = projects?.length ?? 0;
  const certsCount = certs?.length ?? 0;
  const experiencesCount = experiences?.length ?? 0;

  const items = [
    {
      icon: FolderGit2,
      count: projectsCount,
      label: "Projets réalisés",
      desc: "Études de cas & livrables",
    },
    {
      icon: Award,
      count: certsCount,
      label: "Certifications",
      desc: "Formations suivies",
    },
    {
      icon: Briefcase,
      count: experiencesCount,
      label: "Expériences clés",
      desc: "Parcours professionnel",
    },
  ];

  return (
    <div
      className={`overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-sm ${className}`}
    >
      <div className="grid grid-cols-3 divide-x divide-border/60 py-3 sm:py-5 px-1 sm:px-4">
        {items.map(({ icon: Icon, count, label, desc }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center text-center px-1 sm:px-4 transition-colors"
          >
            <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-xl bg-primary/10 text-primary mb-1 sm:mb-2">
              <Icon size={16} className="sm:w-5 sm:h-5" aria-hidden />
            </div>
            <div className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-gradient">
              <AnimatedCounter end={count} />
            </div>
            <p className="mt-0.5 text-[11px] sm:text-sm font-semibold text-foreground leading-tight">
              {label}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground hidden md:block">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
