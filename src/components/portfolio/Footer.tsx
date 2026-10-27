import { Link } from "@tanstack/react-router";
import { ArrowUp, Github, Globe, Linkedin, Mail, MapPin, Phone, ShieldCheck, Sparkles, Youtube } from "lucide-react";
import { profile } from "@/content/portfolio";

const logo = { url: "/landry-net-logo.jpg" };

export function Footer() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="border-t border-border bg-ink text-ink-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:py-16 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 md:gap-12">
          {/* Colonne 1 : Identité & Positionnement */}
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <Link
              to="/"
              hash="top"
              className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <img
                src={logo.url}
                alt="Logo Landry Net"
                width={880}
                height={880}
                className="h-9 w-9 shrink-0 rounded-md sm:h-10 sm:w-10"
              />
              <span className="font-sans text-xl font-bold uppercase tracking-wide">
                <span className="text-primary">Landry</span>{" "}
                <span className="text-white">Net</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-ink-foreground/75">
              Administrateur systèmes & réseaux et développeur web à {profile.location}.
              Conception d'infrastructures résilientes et d'outils web sécurisés.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-ink-foreground/80">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-glow animate-pulse" />
                Disponible pour missions & postes
              </span>
            </div>
          </div>

          {/* Colonne 2 : Navigation */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
              Navigation
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="text-ink-foreground/70 transition-colors hover:text-white">
                  Accueil
                </Link>
              </li>
              <li>
                <Link to="/a-propos" className="text-ink-foreground/70 transition-colors hover:text-white">
                  Mon histoire & Vision
                </Link>
              </li>
              <li>
                <Link to="/projets" className="text-ink-foreground/70 transition-colors hover:text-white">
                  Toutes les réalisations
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-ink-foreground/70 transition-colors hover:text-white">
                  Page de contact direct
                </Link>
              </li>
            </ul>
          </div>

          {/* Colonne 3 : Canaux & Réseaux */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
              Réseaux & Contact
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-foreground/70 transition-colors hover:text-white"
                >
                  <Linkedin size={15} /> LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-foreground/70 transition-colors hover:text-white"
                >
                  <Github size={15} /> GitHub
                </a>
              </li>
              <li>
                <a
                  href={profile.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-ink-foreground/70 transition-colors hover:text-white"
                >
                  <Youtube size={15} /> YouTube
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-flex items-center gap-2 text-ink-foreground/70 transition-colors hover:text-white"
                >
                  <Mail size={15} /> {profile.email}
                </a>
              </li>
              <li>
                <a
                  href={profile.phoneHref}
                  className="inline-flex items-center gap-2 text-ink-foreground/70 transition-colors hover:text-white"
                >
                  <Phone size={15} /> {profile.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Ligne inférieure de copyright et retour en haut */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-foreground/60">
          <p className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Landry Kayoyo.</span>
            <span>·</span>
            <span>{profile.location}</span>
          </p>

          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-ink-foreground/70 hover:text-white hover:border-white/20 transition-all duration-200"
          >
            <span>Haut de page</span>
            <ArrowUp size={13} />
          </button>
        </div>
      </div>
    </footer>
  );
}
