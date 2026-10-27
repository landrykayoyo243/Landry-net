import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Award, Briefcase, CheckCircle2, FileText, GraduationCap,
  Lightbulb, Lock, ShieldCheck, Sparkles,
} from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Reveal, SectionHeading } from "@/components/portfolio/Reveal";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ContentError, ContentLoading } from "@/components/portfolio/ContentState";
import { cvUrlQuery, experiencesQuery } from "@/lib/content.queries";
import { aboutPage, conviction, profile } from "@/content/portfolio";
import { AnimatedStats } from "@/components/portfolio/AnimatedStats";
import { BrandsMarquee } from "@/components/portfolio/BrandsMarquee";
import { absoluteUrl } from "@/lib/siteConfig";

const photo = {
  webp: "/landry-a-propos.webp",
  fallback: "/landry-a-propos.jpg",
};

const TITLE = "À propos — Landry Kayoyo | Administrateur systèmes & réseaux | Développeur web";
const DESC = "Parcours, vision et méthodes de Landry Kayoyo, administrateur systèmes et réseaux et développeur web à Lubumbashi : Université Don Bosco, INPP, CNSS et XSECURITY.";
const aboutShareImageUrl = absoluteUrl(photo.fallback);

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
      { property: "og:image", content: aboutShareImageUrl },
      { property: "og:image:secure_url", content: aboutShareImageUrl },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "800" },
      { property: "og:image:height", content: "800" },
      { property: "og:image:alt", content: "Landry Kayoyo — À propos" },
      { name: "twitter:image", content: aboutShareImageUrl },
      { name: "twitter:image:alt", content: "Landry Kayoyo — À propos" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/a-propos") }],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(experiencesQuery),
      context.queryClient.prefetchQuery(cvUrlQuery),
    ]),
  component: APropos,
});

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-300 hover:brightness-110 ${focus}`;
const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const valueIcons = [ShieldCheck, Lock, FileText, Lightbulb] as const;

function APropos() {
  const timelineQ = useQuery(experiencesQuery);
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
        {/* Héro de présentation — padding généreux évitant toute superposition avec le header fixe */}
        <section className="relative overflow-hidden bg-hero text-ink-foreground">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative grid items-center gap-14 pb-20 pt-36 sm:pt-40 md:grid-cols-[1.15fr_0.85fr] md:pb-28 md:pt-48`}>
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

              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.06] tracking-tight">
                Derrière les réseaux et le code, <span className="italic font-serif text-primary-glow">une exigence de fiabilité</span>.
              </h1>

              <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-ink-foreground/80">
                {aboutPage.intro}
              </p>

              {/* CTAs réécrits avec contraste maximal et bouton CV synchronisé */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/contact" className={btnPrimary}>
                  Échanger sur votre projet <ArrowRight size={16} />
                </Link>
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
                <a
                  href="#recit"
                  className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition duration-300 hover:bg-white/20 hover:border-white/40 ${focus}`}
                >
                  Découvrir mon récit ↓
                </a>
              </div>
            </div>

            {/* Photo immédiatement visible (sans délai Reveal) */}
            <div className="relative mx-auto w-full max-w-[340px]">
              <div className="absolute -inset-1 rounded-[2.2rem] bg-gradient-primary opacity-60 blur-2xl" aria-hidden />
              <div className="relative rounded-[2rem] bg-gradient-primary p-[3px] shadow-2xl">
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
                    className="aspect-[4/5] w-full rounded-[1.85rem] object-cover object-[55%_25%]"
                  />
                </picture>
              </div>
              <div className="absolute -left-6 bottom-10 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 text-card-foreground shadow-card backdrop-blur-md">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Award size={16} className="text-primary" /> Cisco Networking
                </p>
                <p className="text-xs text-muted-foreground">Formation validée</p>
              </div>
              <div className="absolute -right-4 top-8 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 text-card-foreground shadow-card backdrop-blur-md">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap size={16} className="text-primary" /> Don Bosco 2026
                </p>
                <p className="text-xs text-muted-foreground">Systèmes & réseaux</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bandeau de conviction architectural */}
        <section className="relative overflow-hidden border-b border-border bg-card py-12 md:py-16">
          <div className={`${container} text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <blockquote className="font-serif text-xl sm:text-2xl md:text-3xl font-normal leading-relaxed text-foreground">
                « {conviction.text}{" "}
                <span className="italic font-serif text-primary font-medium">
                  {conviction.highlight}
                </span> »
              </blockquote>
            </Reveal>
          </div>
        </section>

        {/* Le Récit en 4 chapitres éditoriaux */}
        <section id="recit" className="py-20 md:py-28">
          <div className={`${container} max-w-5xl`}>
            <Reveal>
              <SectionHeading
                number="01"
                eyebrow="Récit & Trajectoire"
                title="Quatre étapes,"
                accent="une même obsession de robustesse."
                description={aboutPage.storySubtitle}
              />
            </Reveal>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {aboutPage.chapters?.map((ch) => (
                <Reveal key={ch.number} className="h-full">
                  <article className="pillar-card flex h-full flex-col justify-between rounded-[28px] border border-border/70 bg-card p-7 sm:p-8 shadow-sm">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-primary">
                        <span className="flex items-center gap-2">
                          <span className="font-serif text-sm font-bold">Chapitre {ch.number}</span>
                          <span className="h-1 w-1 rounded-full bg-primary/40" />
                          <span className="text-muted-foreground">{ch.tag}</span>
                        </span>
                      </div>
                      <h3 className="mt-4 font-serif text-xl sm:text-2xl font-medium tracking-tight text-foreground">
                        {ch.title}
                      </h3>
                      <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
                        {ch.text}
                      </p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>

            {/* Encadré d'impact Bento */}
            <Reveal className="mt-12">
              <div className="rounded-[32px] border border-border/80 bg-secondary/30 p-7 sm:p-9 backdrop-blur-sm shadow-sm">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Repères d'impact
                    </p>
                    <h3 className="font-serif text-2xl font-medium text-foreground">
                      Compteurs & qualifications vérifiées
                    </h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <Sparkles size={13} /> Lubumbashi & RDC
                  </span>
                </div>
                <AnimatedStats />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Section Partenaires / Marques — bandeau marquee épuré */}
        <BrandsMarquee />

        {/* Ce qui me guide / Les Valeurs */}
        <section className="border-y border-border bg-muted/40 py-20 md:py-28">
          <div className={container}>
            <Reveal>
              <SectionHeading
                number="03"
                eyebrow="Méthode & Déontologie"
                title="Quatre principes directeurs,"
                accent="sans compromis."
                description={aboutPage.valuesIntro}
              />
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {aboutPage.values.map((v, i) => {
                const Icon = valueIcons[i % valueIcons.length] ?? ShieldCheck;
                return (
                  <Reveal key={v.title}>
                    <div className="pillar-card flex h-full flex-col justify-between rounded-[28px] border border-border/70 bg-card p-7 shadow-sm">
                      <div>
                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                          <Icon size={22} aria-hidden />
                        </div>
                        <h3 className="mt-5 font-serif text-xl font-medium text-foreground">
                          {v.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {v.text}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Parcours chronologique */}
        <section className="py-20 md:py-28">
          <div className={`${container} max-w-3xl`}>
            <Reveal>
              <SectionHeading
                number="04"
                eyebrow="Chronologie"
                title="Les étapes marquantes"
                accent="du parcours."
                description="Une continuité d'apprentissage et de réalisations sur le terrain."
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
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                      </Reveal>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </section>

        {/* Appel à l'action invitant vers la page /contact */}
        <section className="relative overflow-hidden bg-hero py-20 text-ink-foreground md:py-28">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative text-center`}>
            <Reveal className="mx-auto max-w-2xl">
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight">
                {aboutPage.ctaTitle}
              </h2>
              <p className="mt-5 text-base sm:text-lg leading-relaxed text-ink-foreground/75">
                {aboutPage.ctaText}
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Link to="/contact" className={btnPrimary}>
                  Lancer un projet ensemble <ArrowRight size={16} />
                </Link>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link to="/">
                    <ArrowLeft size={16} /> {aboutPage.back}
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
