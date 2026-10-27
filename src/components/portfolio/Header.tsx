import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  ChevronRight,
  Cpu,
  GraduationCap,
  Mail,
  Menu,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { nav } from "@/content/portfolio";

const logo = { url: "/landry-net-logo.jpg" };

const desktopLink =
  "rounded-md text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

const navIcons: Record<string, typeof User> = {
  "À propos": User,
  "Compétences": Cpu,
  "Projets": Briefcase,
  "Parcours": GraduationCap,
  "Contact": Mail,
};

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Détection du scroll fluide et non-bloquante (100% rAF + passive)
  useEffect(() => {
    let ticking = false;
    const updateScroll = () => {
      const currentY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(Math.max(currentY / docHeight, 0), 1) : 0;

      setScrolled(currentY > 12);
      setProgress(pct);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    updateScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermeture automatique lors d'un clic ou touch à l'extérieur du menu
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Fermeture sur touche Échap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/80 bg-background shadow-xs py-0"
          : "border-b border-border/80 bg-background py-0.5"
      }`}
    >
      {/* Jauge discrète de lecture au scroll (GPU transform, 100% non-bloquante) */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full bg-gradient-primary origin-left transition-transform duration-75 ease-out"
        style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
        aria-hidden="true"
      />
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 md:h-20 md:px-8">
        {/* Logo */}
        <Link
          to="/"
          hash="top"
          onClick={() => setOpen(false)}
          className="flex shrink-0 items-center gap-2.5 rounded-md whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={logo.url}
            alt=""
            width={880}
            height={880}
            className="h-9 w-9 shrink-0 rounded-md sm:h-10 sm:w-10"
          />
          <span className="font-sans text-lg font-bold uppercase tracking-wide sm:text-xl">
            <span className="text-primary">Landry</span>{" "}
            <span className="text-foreground">Net</span>
          </span>
        </Link>

        {/* Navigation Desktop */}
        <nav aria-label="Navigation principale" className="hidden items-center gap-7 md:flex">
          {nav.map((n) =>
            "to" in n ? (
              <Link key={n.label} to={n.to} className={desktopLink}>
                {n.label}
              </Link>
            ) : (
              <Link key={n.label} to="/" hash={n.href.slice(1)} className={desktopLink}>
                {n.label}
              </Link>
            ),
          )}
        </nav>

        {/* CTA Desktop & Bouton burger Mobile */}
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline-flex">
            <Button asChild className="rounded-full bg-gradient-primary px-5 shadow-sm">
              <Link to="/contact">Me contacter</Link>
            </Button>
          </span>

          {/* Bouton burger animé avec ref pour exclusion clic extérieur */}
          <button
            ref={buttonRef}
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all duration-200 hover:bg-accent active:scale-95 md:h-11 md:w-11"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            <div className="relative h-5 w-5">
              <Menu
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                  open ? "rotate-90 opacity-0 scale-75" : "rotate-0 opacity-100 scale-100"
                }`}
              />
              <X
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                  open ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-75"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Arrière-plan assombri (ferme au clic) */}
      <div
        className={`fixed inset-0 top-16 z-40 bg-black/40 transition-opacity duration-300 ease-in-out md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Tiroir de navigation mobile 100% opaque (zéro transparence) */}
      <div
        ref={menuRef}
        className={`fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-card shadow-2xl transition-all duration-200 ease-out md:hidden ${
          open
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        <div className="mx-auto flex max-w-lg flex-col px-4 py-4 sm:px-6">
          <nav aria-label="Navigation mobile" className="flex flex-col gap-1.5">
            {nav.map((n) => {
              const Icon = navIcons[n.label] ?? ChevronRight;
              const content = (
                <>
                  <div className="flex items-center gap-3.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon size={19} />
                    </div>
                    <span className="font-semibold text-base text-foreground transition-colors group-hover:text-primary">
                      {n.label}
                    </span>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary"
                  />
                </>
              );

              const linkClasses =
                "group flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-150 hover:bg-accent border border-transparent hover:border-border/60 active:scale-[0.99]";

              return "to" in n ? (
                <Link
                  key={n.label}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className={linkClasses}
                >
                  {content}
                </Link>
              ) : (
                <Link
                  key={n.label}
                  to="/"
                  hash={n.href.slice(1)}
                  onClick={() => setOpen(false)}
                  className={linkClasses}
                >
                  {content}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
