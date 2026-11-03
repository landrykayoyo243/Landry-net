import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  FileText,
  GraduationCap,
  Network,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Reveal } from "@/components/portfolio/Reveal";
import { useQuery } from "@tanstack/react-query";
import { cvUrlQuery } from "@/lib/content.queries";
import { aboutPage, profile, shareImage } from "@/content/portfolio";
import { absoluteUrl } from "@/lib/siteConfig";
import { buildBreadcrumbSchema, buildPersonSchema } from "@/lib/seo";

const photo = {
  webp: "/landry-a-propos.webp",
  fallback: "/landry-a-propos.jpg",
};

const TITLE = "À propos & Mon Histoire — Landry Kayoyo | Systèmes, Réseaux & Web";
const DESC =
  "Découvrez le parcours de Landry Kayoyo à Lubumbashi (RDC) : formation Cisco & systèmes à Don Bosco, immersion terrain chez XSECURITY et vision des infrastructures modernes.";
const KEYWORDS =
  "Landry Kayoyo parcours, Don Bosco Lubumbashi, XSECURITY Lubumbashi, Administrateur systèmes Congo, Ingénieur réseau Lubumbashi, Développeur web RDC";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: absoluteUrl("/a-propos") },
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
    links: [{ rel: "canonical", href: absoluteUrl("/a-propos") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbSchema([
            { name: "Accueil", path: "/" },
            { name: "À propos", path: "/a-propos" },
          ])
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: buildPersonSchema(),
        }),
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(cvUrlQuery),
    ]),
  component: APropos,
});

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-300 hover:brightness-110 ${focus}`;
const container = "mx-auto w-full max-w-5xl px-5 md:px-8";

const pillarIcons = [Network, ShieldCheck, Code2];

function APropos() {
  const cvUrlQ = useQuery(cvUrlQuery);
  const cvUrl = cvUrlQ.data ?? profile.cvUrl;

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
        {/* ── 1. Hero d'introduction — Épuré & Impactant ─────────────────── */}
        <header className="relative overflow-hidden bg-hero text-ink-foreground">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div
            className="pointer-events-none absolute -top-36 right-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[140px]"
            aria-hidden
          />
          <div
            className={`${container} relative grid items-center gap-10 pb-16 pt-28 sm:pb-20 sm:pt-36 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pb-24 md:pt-42`}
          >
            {/* Colonne texte (Ordre 2 sur mobile, 1 sur desktop) */}
            <div className="order-2 md:order-1 text-center md:text-left">
              <Link
                to="/"
                className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition duration-300 hover:bg-white/15 hover:text-white ${focus}`}
              >
                <ArrowLeft size={14} /> {aboutPage.back}
              </Link>

              <div className="mb-4 inline-flex items-center gap-2.5 text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-primary-glow justify-center md:justify-start">
                <span className="h-px w-6 sm:w-8 bg-primary-glow/70 inline-block" aria-hidden />
                <span>{aboutPage.eyebrow}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-normal leading-[1.12] tracking-tight text-white">
                {aboutPage.titleLead}{" "}
                <span className="italic font-serif text-primary-glow block sm:inline">
                  {aboutPage.titleAccent}
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-[1.8] text-ink-foreground/80 mx-auto md:mx-0">
                {aboutPage.intro}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3.5 sm:gap-4">
                <a href="#histoire" className={btnPrimary}>
                  Découvrir mon histoire <ArrowRight size={16} />
                </a>
                {cvUrl && (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition duration-300 hover:bg-white/15 hover:border-white/35 ${focus}`}
                  >
                    <FileText size={16} /> Télécharger mon CV
                  </a>
                )}
              </div>
            </div>

            {/* Photo Mobile : Ronde épurée sans bordure épaisse (style Natacha) */}
            <div className="order-1 mx-auto block md:hidden mb-2">
              <div className="relative mx-auto h-60 w-60 sm:h-68 sm:w-68 rounded-full overflow-hidden shadow-2xl">
                <picture>
                  <source srcSet={photo.webp} type="image/webp" />
                  <img
                    src={photo.fallback}
                    alt="Landry Kayoyo — Administrateur systèmes & réseaux et développeur web"
                    width={800}
                    height={800}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="h-full w-full rounded-full object-cover object-[52%_15%] scale-125"
                  />
                </picture>
              </div>
            </div>

            {/* Photo Desktop : Rectangulaire avec bords arrondis épurés */}
            <div className="order-1 mx-auto hidden w-full md:order-2 md:block md:max-w-[360px] lg:max-w-[390px]">
              <div className="relative">
                <div className="relative overflow-hidden rounded-[2.2rem] sm:rounded-[2.6rem] border border-white/15 bg-white/5 p-2 sm:p-2.5 shadow-2xl backdrop-blur-md">
                  <picture>
                    <source srcSet={photo.webp} type="image/webp" />
                    <img
                      src={photo.fallback}
                      alt="Landry Kayoyo — Administrateur systèmes & réseaux et développeur web"
                      width={800}
                      height={800}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="aspect-[4/5] w-full rounded-[1.8rem] sm:rounded-[2.2rem] object-cover object-[55%_22%]"
                    />
                  </picture>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── 2. Mon Histoire — Narration fluide et continue ──────────────── */}
        <section id="histoire" className="py-20 md:py-28 border-b border-border/60">
          <div className={`${container} max-w-3xl`}>
            <Reveal>
              <div className="text-center">
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  Mon histoire
                </span>
                <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                  La passion du concret,{" "}
                  <span className="italic font-serif text-primary">l'exigence du terrain.</span>
                </h2>
              </div>
            </Reveal>

            <div className="mt-12 space-y-6 text-base sm:text-lg leading-[1.85] text-muted-foreground">
              {aboutPage.storyParagraphs.map((paragraph, index) => (
                <Reveal key={index}>
                  <p>{paragraph}</p>
                </Reveal>
              ))}
            </div>

            {/* Citation de vision */}
            <Reveal className="mt-14">
              <div className="rounded-2xl border-l-4 border-primary bg-secondary/35 p-6 sm:p-8 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider text-primary">
                  {aboutPage.quote.lead}
                </p>
                <p className="mt-2 font-serif text-xl sm:text-2xl font-normal leading-snug text-foreground">
                  « {aboutPage.quote.accent} »
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 3. Les Trois Domaines d'Intervention (Modèle piliers) ────────── */}
        <section className="bg-muted/30 py-20 md:py-28 border-b border-border/60">
          <div className={container}>
            <Reveal>
              <div className="text-center max-w-2xl mx-auto">
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  {aboutPage.pillars.eyebrow}
                </span>
                <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                  {aboutPage.pillars.title}{" "}
                  <span className="italic font-serif text-primary">
                    {aboutPage.pillars.accent}
                  </span>
                </h2>
                <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                  {aboutPage.pillars.lead}
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {aboutPage.pillars.items.map((item, index) => {
                const Icon = pillarIcons[index % pillarIcons.length];
                return (
                  <Reveal key={item.title}>
                    <div className="pillar-card flex h-full flex-col justify-between rounded-3xl border border-border/70 bg-card p-7 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-card">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            {item.tag}
                          </span>
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary">
                            <Icon size={20} aria-hidden />
                          </div>
                        </div>

                        <h3 className="mt-5 font-serif text-2xl font-medium text-foreground">
                          {item.title}
                        </h3>

                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>

                        <p className="mt-2.5 text-xs text-muted-foreground/80 leading-relaxed italic">
                          {item.subtext}
                        </p>
                      </div>

                      <div className="mt-6 pt-5 border-t border-border/60">
                        <Link
                          to={item.linkHref}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          {item.linkText}
                        </Link>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. Les étapes clés (Chronologie épurée sb-timeline) ──────────── */}
        <section className="py-20 md:py-28">
          <div className={`${container} max-w-3xl`}>
            <Reveal>
              <div className="text-center">
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                  {aboutPage.timeline.eyebrow}
                </span>
                <h2 className="mt-4 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                  {aboutPage.timeline.title}{" "}
                  <span className="italic font-serif text-primary">
                    {aboutPage.timeline.accent}
                  </span>
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 space-y-6">
              {aboutPage.timeline.items.map((step, index) => (
                <Reveal key={step.year}>
                  <div className="group relative flex flex-col sm:flex-row gap-4 sm:gap-8 rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition duration-300 hover:border-primary/40 hover:shadow-card">
                    <div className="sm:w-32 shrink-0">
                      <span className="font-serif text-2xl sm:text-3xl font-medium text-primary tracking-tight">
                        {step.year}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-serif text-xl font-medium text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.text}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Me contacter (CTA simple & élégant) ───────────────────────── */}
        <section className="relative overflow-hidden bg-hero py-20 text-ink-foreground md:py-28">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative text-center`}>
            <Reveal className="mx-auto max-w-2xl">
              <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/90">
                {aboutPage.cta.eyebrow}
              </span>
              <h2 className="mt-5 font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight">
                {aboutPage.cta.title}{" "}
                <span className="italic font-serif text-primary-glow">
                  {aboutPage.cta.accent}
                </span>
              </h2>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink-foreground/80">
                {aboutPage.cta.lead}
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Link to="/contact" className={btnPrimary}>
                  {aboutPage.cta.primary}
                </Link>
                <Link
                  to="/"
                  hash="projets"
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition duration-300 hover:bg-white/20 hover:border-white/40 ${focus}`}
                >
                  {aboutPage.cta.secondary}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
