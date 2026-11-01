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

const photo = {
  webp: "/landry-a-propos.webp",
  fallback: "/landry-a-propos.jpg",
};

const TITLE = "Mon histoire — Landry Kayoyo | Administrateur systèmes & réseaux | Développeur web";
const DESC = "Découvrez le parcours, la vision et les expertises de Landry Kayoyo — administrateur systèmes & réseaux et développeur web à Lubumbashi, RD Congo.";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
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
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div
            className={`${container} relative grid items-center gap-12 pb-20 pt-36 sm:pt-40 md:grid-cols-[1.15fr_0.85fr] md:gap-14 md:pb-28 md:pt-48`}
          >
            <div>
              <Link
                to="/"
                className={`mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm transition duration-300 hover:bg-white/15 hover:text-white ${focus}`}
              >
                <ArrowLeft size={14} /> {aboutPage.back}
              </Link>

              <div className="mb-4 inline-flex items-center gap-3 text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-primary-glow">
                <span className="h-[1.5px] w-7 rounded-full bg-primary-glow/70 inline-block" />
                <span>{aboutPage.eyebrow}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-normal leading-[1.1] tracking-tight">
                {aboutPage.titleLead}{" "}
                <span className="italic font-serif text-primary-glow">
                  {aboutPage.titleAccent}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-ink-foreground/80">
                {aboutPage.intro}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#histoire" className={btnPrimary}>
                  Découvrir mon histoire <ArrowRight size={16} />
                </a>
                {cvUrl && (
                  <a
                    href={cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition duration-300 hover:bg-white/20 hover:border-white/40 ${focus}`}
                  >
                    <FileText size={16} /> Télécharger mon CV
                  </a>
                )}
              </div>
            </div>

            {/* Photo de profil avec badges élégants */}
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px]">
              <div
                className="absolute -inset-1 rounded-[2.2rem] bg-gradient-primary opacity-60 blur-2xl"
                aria-hidden
              />
              <div className="relative rounded-[2rem] bg-gradient-primary p-[3px] shadow-2xl">
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
                    className="aspect-[4/5] w-full rounded-[1.85rem] object-cover object-[55%_25%]"
                  />
                </picture> 
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
