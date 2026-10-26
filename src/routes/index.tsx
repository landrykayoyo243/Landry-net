import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Briefcase,
  Camera,
  CheckCircle2,
  Code2,
  GraduationCap,
  HelpCircle,
  Layers,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Network,
  Phone,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Button } from "@/components/ui/button";
import { Reveal, SectionHeading } from "@/components/portfolio/Reveal";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { useQuery } from "@tanstack/react-query";
import { ContentError, ContentLoading } from "@/components/portfolio/ContentState";
import {
  certificationsQuery,
  cvUrlQuery,
  experiencesQuery,
  immersionQuery,
  projectsQuery,
} from "@/lib/content.queries";
import { about, conviction, profile, shareImage, skills } from "@/content/portfolio";
import { AnimatedStats } from "@/components/portfolio/AnimatedStats";
import { BrandsMarquee } from "@/components/portfolio/BrandsMarquee";
import { absoluteUrl, getOptimizedImageUrl } from "@/lib/siteConfig";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const photo = {
  webp: "/landry-a-propos.webp",
  fallback: "/landry-a-propos.jpg",
};

const TITLE = "Landry Kayoyo — Administrateur systèmes & réseaux | Développeur web";
const DESC =
  "Portfolio de Landry Kayoyo, administrateur systèmes et réseaux et développeur web à Lubumbashi : réseaux, haute disponibilité, sécurité et applications web.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: shareImage.url },
      { property: "og:image:secure_url", content: shareImage.url },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: String(shareImage.width) },
      { property: "og:image:height", content: String(shareImage.height) },
      { property: "og:image:alt", content: shareImage.alt },
      { name: "twitter:image", content: shareImage.url },
      { name: "twitter:image:alt", content: shareImage.alt },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(projectsQuery),
      context.queryClient.prefetchQuery(experiencesQuery),
      context.queryClient.prefetchQuery(certificationsQuery),
      context.queryClient.prefetchQuery(immersionQuery),
    ]),
  component: Index,
});

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-300 hover:brightness-110 ${focus}`;
const btnGhostDark = `inline-flex items-center justify-center gap-2 rounded-full border border-ink-foreground/20 bg-ink-foreground/5 px-6 py-3.5 text-sm font-semibold text-ink-foreground backdrop-blur-sm transition duration-300 hover:bg-ink-foreground/15 hover:border-ink-foreground/35 ${focus}`;
const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const skillIcons = {
  server: Server,
  network: Network,
  shield: ShieldCheck,
  code: Code2,
  wrench: Wrench,
} as const;

/** Questions fréquentes des décideurs et clients */
const FAQS = [
  {
    q: "Quels types d'entreprises ou structures accompagnez-vous ?",
    a: "J'accompagne les PME, institutions, établissements scolaires et entreprises commerciales à Lubumbashi et dans tout le Haut-Katanga pour leurs besoins en réseaux, sécurité et serveurs, ainsi que des clients à distance pour la conception d'applications web modernes.",
  },
  {
    q: "Comment garantissez-vous la continuité de service pendant vos interventions ?",
    a: "Chaque opération critique (mise à jour de serveurs, bascule de switchs, recâblage de baie) est planifiée en dehors des heures de forte activité (heures creuses ou week-end). Une procédure stricte de retour arrière (rollback) est systématiquement prête avant toute manipulation.",
  },
  {
    q: "Assurez-vous le support et la maintenance après la livraison ?",
    a: "Oui. Chaque installation s'accompagne d'une période de garantie et de support technique. Je propose également des contrats de maintenance préventive et d'infogérance pour veiller en continu sur la santé de vos systèmes.",
  },
  {
    q: "Développez-vous également des applications web sur-mesure ?",
    a: "Absolument. En plus de l'administration réseau, je conçois des applications web complètes (comme PayLix pour les écoles ou MarketNet pour le commerce sur WhatsApp), alliant rapidité, sécurité des données et interface mobile moderne.",
  },
] as const;

function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero text-ink-foreground">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className={`${container} relative pb-24 pt-32 sm:pt-40 md:pb-36 md:pt-52`}>
        <div className="grid items-center gap-10 md:grid-cols-[1fr_420px] md:gap-16 lg:gap-20">
          {/* Colonne texte */}
          <div className="order-2 md:order-1">
            {/* Badge de disponibilité */}
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-ink-foreground/15 bg-ink-foreground/5 px-4 py-1.5 text-xs font-semibold text-ink-foreground/85 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-primary-glow" />
              </span>
              Disponible pour un poste ou une mission
            </div>

            {/* Nom */}
            <h1 className="font-serif text-5xl font-normal leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Landry{" "}
              <span className="italic font-serif text-primary-glow">Kayoyo</span>
            </h1>

            {/* Rôle compact */}
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-ink-foreground/55">
              Administrateur systèmes & réseaux · Développeur web · Lubumbashi
            </p>

            {/* Accroche éditoriale */}
            <p className="mt-7 max-w-lg font-serif text-xl sm:text-2xl font-normal leading-snug text-ink-foreground/90 lg:text-[1.65rem]">
              Je conçois des infrastructures résilientes et des applications web{" "}
              <span className="italic font-serif text-primary-glow">immédiatement utiles.</span>
            </p>

            {/* 2 CTAs */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/contact" className={btnPrimary}>
                Échangeons sur votre projet <ArrowRight size={16} />
              </Link>
              <a href="#projets" className={btnGhostDark}>
                Voir mes réalisations ↓
              </a>
            </div>
          </div>

          {/* Photo avec badge */}
          <div className="order-1 flex justify-center md:order-2">
            <div className="relative w-[210px] sm:w-[250px] md:w-full md:max-w-[380px]">
              {/* Halo lumineux */}
              <div
                className="absolute -inset-3 rounded-full md:rounded-[2.5rem] opacity-45 blur-2xl"
                style={{ background: "var(--gradient-primary)" }}
                aria-hidden
              />
              {/* Cadre dégradé */}
              <div
                className="relative rounded-full md:rounded-[2.2rem] p-[3px] shadow-2xl"
                style={{ background: "var(--gradient-primary)" }}
              >
                <picture>
                  <source srcSet={photo.webp} type="image/webp" />
                  <img
                    src={photo.fallback}
                    alt="Landry Kayoyo en costume, assis à son poste de travail"
                    width={800}
                    height={800}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="aspect-square md:aspect-[4/5] w-full rounded-full md:rounded-[2rem] object-cover object-[55%_20%]"
                  />
                </picture>
              </div>

              {/* Bulle discrète */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full md:rounded-2xl border border-border/70 bg-card/95 px-3.5 py-1.5 md:px-4 md:py-2.5 text-card-foreground shadow-card backdrop-blur-md whitespace-nowrap">
                <p className="flex items-center gap-2 text-xs font-semibold">
                  <GraduationCap size={14} className="text-primary" />
                  Licence · Université Don Bosco 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Index() {
  const projectsQ = useQuery(projectsQuery);
  const timelineQ = useQuery(experiencesQuery);
  const certsQ = useQuery(certificationsQuery);
  const immersionQ = useQuery(immersionQuery);
  const projects = projectsQ.data ?? [];
  const featured = projects.filter((p) => p.featured);
  const immersionItems = immersionQ.data ?? [];

  return (
    <div id="top" className="bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Aller au contenu
      </a>
      <Header />
      <main id="main">
        <Hero />

        {/* Conviction & Philosophie */}
        <section className="relative overflow-hidden border-b border-border bg-card py-14 md:py-20">
          <div className={`${container} text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <blockquote className="font-serif text-xl sm:text-2xl md:text-3xl font-normal leading-relaxed text-foreground">
                « {conviction.text}{" "}
                <span className="italic font-serif text-primary font-medium">
                  {conviction.highlight}
                </span>{" "}
                »
              </blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                Philosophie & exigence de conception
              </p>
            </Reveal>
          </div>
        </section>

        {/* 01 · À propos — résumé court & métriques d'impact */}
        <section id="apropos" className="py-20 md:py-28">
          <div className={container}>
            <Reveal>
              <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <SectionHeading
                    number="01"
                    eyebrow="À propos"
                    title="Avant de sécuriser et développer,"
                    accent="je construisais les fondations."
                    description="Administrateur systèmes & réseaux et développeur web à Lubumbashi, j'interviens de bout en bout pour garantir la stabilité et la performance de vos outils numériques."
                  />
                  <div className="space-y-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
                    {about.map((p, i) => (
                      <p
                        key={i}
                        className={i === 0 ? "text-lg sm:text-xl font-medium text-foreground" : ""}
                      >
                        {p}
                      </p>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <Button asChild size="lg" className="rounded-full bg-gradient-primary">
                      <Link to="/a-propos">
                        Lire mon histoire complète <ArrowRight size={16} />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-full">
                      <a href="#competences">Découvrir mes compétences</a>
                    </Button>
                  </div>
                </div>

                <div className="lg:pl-6">
                  <div className="rounded-[32px] border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
                    <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          Repères clés
                        </p>
                        <h3 className="font-serif text-xl font-medium text-foreground">
                          Impact & qualifications
                        </h3>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Expérience terrain
                      </span>
                    </div>

                    <AnimatedStats />

                    <div className="mt-6 space-y-2.5">
                      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs sm:text-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                          1
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">
                            Université Don Bosco de Lubumbashi
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Licence en Administration des Systèmes & Réseaux
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs sm:text-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                          2
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">XSECURITY — Lubumbashi</p>
                          <p className="text-xs text-muted-foreground">
                            Membre de l'équipe technique, sécurité & maintenance
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 p-3 text-xs sm:text-sm">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary font-bold">
                          3
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">INPP & CNSS</p>
                          <p className="text-xs text-muted-foreground">
                            Maintien en condition opérationnelle d'infrastructures critiques
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 02 · Compétences — Piliers d'expertise */}
        <section id="competences" className="border-y border-border bg-muted/40 py-20 md:py-28">
          <div className={container}>
            <Reveal>
              <SectionHeading
                number="02"
                eyebrow="Compétences"
                title="Cinq univers d'intervention,"
                accent="une expertise intégrée."
                description="Une vision 360° du numérique : du câblage physique et du routage réseau jusqu'à l'expérience utilisateur finale."
              />
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {skills.map((g, i) => {
                const Icon = skillIcons[g.icon as keyof typeof skillIcons];
                return (
                  <Reveal key={g.category} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}>
                    <div className="pillar-card flex h-full flex-col justify-between rounded-[28px] border border-border/70 bg-card p-7 sm:p-8 shadow-sm">
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Icon size={22} aria-hidden />
                          </div>
                          <span className="font-serif text-sm font-semibold text-primary/70">
                            0{i + 1}
                          </span>
                        </div>
                        <h3 className="mt-5 font-serif text-xl sm:text-2xl font-medium text-foreground">
                          {g.category}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {g.description}
                        </p>
                      </div>
                      <ul
                        className="mt-6 flex flex-wrap gap-1.5 border-t border-border/50 pt-4"
                        aria-label={`Technologies pour ${g.category}`}
                      >
                        {g.items.map((s) => (
                          <li
                            key={s}
                            className="rounded-full border border-border/40 bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* 03 · Projets clés */}
        <section id="projets" className="py-20 md:py-28">
          <div className={container}>
            <Reveal>
              <SectionHeading
                number="03"
                eyebrow="Projets"
                title="Des problèmes réels,"
                accent="des solutions concrètes."
                description="Études de cas sélectionnées : architectures réseaux déployées, plateformes web complètes et solutions de haute disponibilité."
              />
            </Reveal>
            {projectsQ.isPending ? (
              <ContentLoading rows={2} className="h-72" />
            ) : projectsQ.isError ? (
              <ContentError label="les projets" onRetry={() => projectsQ.refetch()} />
            ) : (
              <>
                <div className="grid gap-7 lg:gap-8 md:grid-cols-2">
                  {featured.map((p, i) => (
                    <Reveal
                      key={p.slug}
                      className={i === 3 ? "hidden md:block" : i > 3 ? "hidden" : ""}
                    >
                      <ProjectCard p={p} index={i} />
                    </Reveal>
                  ))}
                </div>
                <div className="mt-12 flex justify-center">
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 hover:bg-card"
                  >
                    <Link to="/projets">
                      Voir tous les projets (+
                      <span className="md:hidden">
                        {projects.length - Math.min(featured.length, 3)}
                      </span>
                      <span className="hidden md:inline">
                        {projects.length - Math.min(featured.length, 4)}
                      </span>
                      )
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 04 · Immersion & Coulisses de terrain */}
        {immersionItems.length > 0 && (
          <section className="border-t border-border bg-card py-20 md:py-28">
            <div className={container}>
              <Reveal>
                <SectionHeading
                  number="04"
                  eyebrow="Immersion"
                  title="Au cœur des infrastructures,"
                  accent="en images."
                  description="Aperçu visuel de nos interventions concrètes : baies de brassage ordonnées, monitoring en temps réel, cybersécurité et applications web en production."
                />
              </Reveal>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {immersionItems.map((item) => (
                  <Reveal key={item.id} className="group">
                    <div className="relative aspect-[4/3] sm:aspect-[16/11] overflow-hidden rounded-[26px] border border-border/80 bg-muted/40 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
                      <img
                        src={getOptimizedImageUrl(item.image_url, { width: 600 })}
                        alt={item.image_alt ?? item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {/* Dégradé cinématique pour lisibilité */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

                      {/* Étiquette et titre */}
                      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                        <span className="inline-block rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary-foreground backdrop-blur-sm">
                          {item.tag}
                        </span>
                        <h4 className="mt-2 font-serif text-base sm:text-lg font-medium leading-snug tracking-tight text-white drop-shadow-sm">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 05 · Partenaires & Références — bandeau marquee avec zoom tactile mobile */}
        <BrandsMarquee />

        {/* 05 · Parcours & Formations */}
        <section id="parcours" className="border-y border-border bg-muted/40 py-20 md:py-28">
          <div className={`${container} grid gap-14 lg:grid-cols-[1.2fr_0.8fr]`}>
            <div>
              <Reveal>
                <SectionHeading
                  number="05"
                  eyebrow="Parcours"
                  title="Une trajectoire forgée sur le terrain,"
                  accent="pas héritée."
                  description="Des débuts universitaires à Don Bosco jusqu'aux interventions pratiques en production chez XSECURITY, l'INPP et la CNSS."
                />
              </Reveal>
              {timelineQ.isPending ? (
                <ContentLoading rows={4} />
              ) : timelineQ.isError ? (
                <ContentError label="le parcours" onRetry={() => timelineQ.refetch()} />
              ) : (
                <ol className="relative ml-5 border-l-2 border-border/80">
                  {(timelineQ.data ?? []).map((t) => {
                    const Icon = t.kind === "formation" ? GraduationCap : Briefcase;
                    return (
                      <li key={t.id} className="relative mb-8 pl-10 last:mb-0">
                        <span
                          className="absolute -left-[21px] grid h-10 w-10 place-items-center rounded-full border-4 border-muted/80 bg-gradient-primary text-primary-foreground shadow-sm"
                          aria-hidden
                        >
                          <Icon size={16} />
                        </span>
                        <Reveal className="pillar-card rounded-[24px] border border-border/70 bg-card p-5 sm:p-6 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                              {t.period}
                            </span>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                              {t.kind === "formation" ? "Formation" : "Expérience"}
                            </span>
                          </div>
                          <h3 className="mt-2 font-serif text-lg sm:text-xl font-medium tracking-tight text-foreground">
                            {t.title}
                          </h3>
                          <p className="text-sm font-semibold text-foreground/80">{t.organization}</p>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {t.description}
                          </p>
                        </Reveal>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div className="space-y-6 lg:pt-28">
              <Reveal className="pillar-card rounded-[28px] border border-border/70 bg-card p-7 shadow-sm">
                <h3 className="flex items-center gap-2.5 font-serif text-xl font-medium text-foreground">
                  <Award size={20} className="text-primary" /> Formations & Certifications
                </h3>
                {certsQ.isPending ? (
                  <div className="mt-5">
                    <ContentLoading rows={3} className="h-12" />
                  </div>
                ) : certsQ.isError ? (
                  <div className="mt-5">
                    <ContentError label="les formations" onRetry={() => certsQ.refetch()} />
                  </div>
                ) : (
                  <ul className="mt-5 space-y-4">
                    {(certsQ.data ?? []).map((c) => (
                      <li
                        key={c.id}
                        className="border-b border-border/50 pb-4 last:border-0 last:pb-0"
                      >
                        <p className="font-semibold text-foreground">{c.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.issuer} · {c.date_label}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Reveal>
            </div>
          </div>
        </section>

        {/* 08 · Questions fréquentes (FAQ) — Inspiré des meilleures pratiques internationales */}
        <section className="py-20 md:py-28">
          <div className={`${container} max-w-4xl`}>
            <Reveal className="text-center mb-12">
              <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <HelpCircle size={15} /> Questions fréquentes
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal leading-tight text-foreground">
                Tout ce que vous devez savoir avant de{" "}
                <span className="italic font-serif text-primary">démarrer</span>.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground">
                Des réponses transparentes sur nos interventions, nos garanties et notre méthode de travail.
              </p>
            </Reveal>

            <Reveal>
              <div className="rounded-[32px] border border-border/80 bg-card p-6 sm:p-10 shadow-sm">
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border/60 py-2">
                      <AccordionTrigger className="text-base sm:text-lg font-medium text-foreground hover:no-underline hover:text-primary">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-2">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 09 · Appel à l'action invitant vers la page /contact dédiée ou WhatsApp */}
        <section className="relative overflow-hidden bg-hero py-20 text-ink-foreground md:py-28">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-primary-glow backdrop-blur-sm">
                <Sparkles size={12} /> Travaillons ensemble
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white">
                Construisons une collaboration{" "}
                <span className="italic font-serif text-primary-glow">durable</span>.
              </h2>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink-foreground/75 max-w-xl mx-auto">
                Que vous ayez un réseau à installer, des données à sécuriser ou une application web moderne à développer, échangeons sur votre besoin. Réponse garantie sous 24h.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/contact" className={btnPrimary}>
                  Échanger sur votre projet <ArrowRight size={16} />
                </Link>
                <a
                  href={profile.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className={btnGhostDark}
                >
                  <MessageSquare size={16} /> Écrire sur WhatsApp
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
