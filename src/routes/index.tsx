import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Code2,
  FileText,
  Github,
  Linkedin,
  Network,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Reveal, SectionHeading } from "@/components/portfolio/Reveal";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { AnimatedStats } from "@/components/portfolio/AnimatedStats";
import { useQuery } from "@tanstack/react-query";
import { ContentError, ContentLoading } from "@/components/portfolio/ContentState";
import {
  certificationsQuery,
  cvUrlQuery,
  experiencesQuery,
  immersionQuery,
  projectsQuery,
} from "@/lib/content.queries";
import { about, aboutPage, conviction, heroSection, profile, shareImage } from "@/content/portfolio";
import { BrandsMarquee } from "@/components/portfolio/BrandsMarquee";
import { absoluteUrl, getOptimizedImageUrl } from "@/lib/siteConfig";
import { buildPersonSchema, buildWebSiteSchema } from "@/lib/seo";
import { ContactForm } from "@/components/portfolio/ContactForm";

const photo = {
  webp: "/landry-a-propos.webp",
  fallback: "/landry-a-propos.jpg",
};

const TITLE = "Landry Kayoyo | Systèmes, réseaux et développement web";
const DESC =
  "Portfolio de Landry Kayoyo, administrateur systèmes et réseaux et développeur web à Lubumbashi. Découvrez ses projets concrets et son expérience de terrain.";
const KEYWORDS =
  "Landry Kayoyo, administrateur systèmes, réseaux, développeur web, Lubumbashi, RDC, cybersécurité, applications web, infrastructures informatiques";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
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
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(buildPersonSchema()) },
      { type: "application/ld+json", children: JSON.stringify(buildWebSiteSchema()) },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.prefetchQuery(projectsQuery),
      context.queryClient.prefetchQuery(certificationsQuery),
      context.queryClient.prefetchQuery(experiencesQuery),
      context.queryClient.prefetchQuery(immersionQuery),
      context.queryClient.prefetchQuery(cvUrlQuery),
    ]),
  component: Index,
});

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-300 hover:brightness-110 ${focus}`;
const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const heroHighlights = [
  { label: "Infrastructures", title: "Systèmes & réseaux", icon: Network, position: "left-0 top-[8%]" },
  { label: "Protection", title: "Cybersécurité", icon: ShieldCheck, position: "right-0 top-[20%]" },
  { label: "Applications", title: "Développement web", icon: Code2, position: "bottom-[8%] left-1/2 -translate-x-1/2" },
];

function Hero({ cvUrl }: { cvUrl: string | null }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-background text-foreground">
      <div className={`${container} relative pb-12 pt-20 sm:pb-14 sm:pt-20 md:pb-16 md:pt-24`}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <div className="mx-auto w-full max-w-3xl text-center lg:mx-0 lg:text-left">
            <p className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary sm:text-[12px]">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              <span>{heroSection.badge}</span>
            </p>
            <h1 className="mx-auto max-w-[22ch] font-serif text-balance text-4xl font-normal leading-[1.08] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:mx-0 lg:max-w-[20ch] lg:text-[4.25rem]">
              {heroSection.titleLead}{" "}
              <span className="block font-serif italic text-primary">{heroSection.titleAccent}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-[1.8] text-muted-foreground sm:mt-6 sm:text-lg lg:mx-0">
              {heroSection.description}
            </p>
            <div className="mx-auto mt-7 flex w-full max-w-lg flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center lg:mx-0 lg:justify-start">
              <Link to="/projets" className={`${btnPrimary} w-full sm:w-auto`}>
                {heroSection.ctaPrimary} <ArrowRight size={16} />
              </Link>
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/20 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <FileText size={16} /> {heroSection.ctaSecondary}
                </a>
              )}
            </div>
            <a
              href="#competences"
              className={`mx-auto mt-5 inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/75 lg:mx-0 ${focus}`}
            >
              Explorer mes domaines <ArrowRight size={15} />
            </a>
            <div className="mt-8 flex flex-col items-center gap-3 lg:flex-row lg:gap-4">
              <span className="text-xs font-medium text-muted-foreground">Retrouvez-moi aussi sur</span>
              <nav
                aria-label="Réseaux sociaux de Landry Kayoyo"
                className="flex items-center justify-center gap-2.5 text-muted-foreground"
              >
                <a
                  href={profile.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn de Landry Kayoyo"
                  title="LinkedIn"
                  data-testid="social-link-linkedin"
                  className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <Linkedin size={16} aria-hidden="true" />
                </a>
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub de Landry Kayoyo"
                  title="GitHub"
                  data-testid="social-link-github"
                  className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <Github size={16} aria-hidden="true" />
                </a>
                <a
                  href={profile.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube de Landry Kayoyo"
                  title="YouTube"
                  data-testid="social-link-youtube"
                  className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <Youtube size={16} aria-hidden="true" />
                </a>
                <a
                  href={profile.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de Landry Kayoyo"
                  title="Facebook"
                  data-testid="social-link-facebook"
                  className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card font-semibold transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <span aria-hidden="true">f</span>
                </a>
                <a
                  href={profile.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Profil X de Landry Kayoyo"
                  title="X"
                  data-testid="social-link-x"
                  className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-sm font-semibold transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary ${focus}`}
                >
                  <span aria-hidden="true">𝕏</span>
                </a>
              </nav>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-[1.1/1] w-full max-w-[430px] lg:block" aria-hidden="true">
            <div className="absolute inset-[8%] rounded-full border border-primary/10 bg-gradient-to-br from-primary/10 via-background to-secondary/60" />
            <div className="absolute inset-[20%] rounded-full border border-dashed border-primary/15" />
            <svg viewBox="0 0 420 380" className="absolute inset-0 h-full w-full text-primary/25">
              <path d="M210 190 76 72M210 190l134-82M210 190v135" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7" />
              <circle cx="76" cy="72" r="4" fill="currentColor" />
              <circle cx="344" cy="108" r="4" fill="currentColor" />
              <circle cx="210" cy="325" r="4" fill="currentColor" />
            </svg>
            <div className="absolute left-1/2 top-1/2 z-10 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] bg-gradient-primary text-primary-foreground shadow-glow">
              <Network size={44} strokeWidth={1.6} />
            </div>
            {heroHighlights.map(({ label, title, icon: Icon, position }) => (
              <div
                key={label}
                className={`absolute z-20 flex w-[190px] items-center gap-3 rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-card backdrop-blur-sm ${position}`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
                  <span className="mt-0.5 block text-sm font-semibold leading-snug text-foreground">{title}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Index() {
  const projectsQ = useQuery(projectsQuery);
  const immersionQ = useQuery(immersionQuery);
  const cvUrlQ = useQuery(cvUrlQuery);
  const projects = projectsQ.data ?? [];
  const featured = projects.filter((project) => project.featured);
  const immersionItems = immersionQ.data ?? [];
  const cvUrl = cvUrlQ.data ?? profile.cvUrl;

  return (
    <div id="top" className="bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">Aller au contenu</a>
      <Header />
      <main id="main">
        <Hero cvUrl={cvUrl} />

        <section className="relative overflow-hidden border-b border-border bg-card py-12 md:py-16">
          <div className={`${container} text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <blockquote className="text-balance font-serif text-lg font-normal leading-relaxed text-foreground sm:text-xl md:text-2xl">
                « {conviction.text}{" "}<span className="font-serif font-medium italic text-primary">{conviction.highlight}</span>{" "}»
              </blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Philosophie & exigence de conception</p>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-border bg-background py-10 sm:py-14">
          <div className={`${container} max-w-5xl`}>
            <Reveal className="mb-7 text-center sm:mb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Repères concrets</p>
              <h2 className="mt-2 font-serif text-balance text-2xl font-medium tracking-tight text-foreground sm:text-3xl">L’expérience en quelques chiffres</h2>
            </Reveal>
            <Reveal><AnimatedStats /></Reveal>
          </div>
        </section>

        <section id="competences" className="scroll-mt-24 border-b border-border bg-muted/30 py-16 md:py-20">
          <div className={container}>
            <Reveal><SectionHeading eyebrow="Domaines d’intervention" title="Du réseau à l’application," accent="une vision cohérente." description="J’interviens sur les fondations numériques de vos projets, de l’infrastructure à l’expérience utilisateur, avec une logique concrète et durable." /></Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {aboutPage.pillars.items.map((item, index) => {
                const Icon = [Network, ShieldCheck, Code2][index];
                return <Reveal key={item.title} delay={index * 110}><div className="pillar-card flex h-full flex-col rounded-[28px] border border-border/70 bg-card p-7 shadow-xs sm:p-8"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={22} aria-hidden="true" /></div><h3 className="font-serif text-2xl font-medium leading-tight text-foreground">{item.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p></div></Reveal>;
              })}
            </div>
          </div>
        </section>

        <section id="apropos" className="scroll-mt-24 border-b border-border bg-background py-16 md:py-20">
          <div className={container}>
            <Reveal>
              <div className="grid items-center gap-9 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-14 lg:gap-16">
                <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] md:max-w-none">
                  <div className="absolute inset-5 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-2xl" />
                  <div className="relative rounded-[2.25rem] border border-border/80 bg-gradient-to-b from-secondary to-card p-3 shadow-card">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] border border-white/60 bg-muted">
                      <picture>
                        <source srcSet={photo.webp} type="image/webp" />
                        <img src={photo.fallback} alt="Portrait de Landry Kayoyo, administrateur systèmes et réseaux et développeur web à Lubumbashi" width={800} height={1000} loading="lazy" className="h-full w-full object-cover" />
                      </picture>
                    </div>
                  </div>
                </div>
                <div className="mx-auto w-full max-w-2xl md:mx-0">
                  <div className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><span className="h-px w-7 bg-primary" aria-hidden />Mon histoire</div>
                  <h2 className="max-w-[22ch] font-serif text-balance text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Un parcours entre systèmes, réseaux et web.</h2>
                  <div className="mt-6 space-y-4 text-pretty leading-[1.8] text-muted-foreground">{about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
                  <Link to="/a-propos" className={`mt-7 inline-flex items-center gap-2 rounded-full border border-primary/20 px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 ${focus}`}>
                    Lire mon histoire <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="projets" className="scroll-mt-24 border-b border-border bg-card py-16 md:py-20">
          <div className={container}><Reveal><SectionHeading eyebrow="Réalisations" title="Des problèmes réels," accent="des solutions concrètes." description="Une sélection de projets conçus pour améliorer les processus, sécuriser les opérations et offrir une meilleure expérience à l’utilisateur." /></Reveal>
            {projectsQ.isPending ? <ContentLoading rows={2} className="h-72" /> : projectsQ.isError ? <ContentError label="les projets" onRetry={() => projectsQ.refetch()} /> : <><div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{featured.map((project) => <ProjectCard key={project.id} project={project} />)}</div>{featured.length > 0 && <div className="mt-8 text-center"><Link to="/projets" className={`${btnPrimary} mx-auto`}>Voir tous les projets <ArrowRight size={15} /></Link></div>}</>}
          </div>
        </section>

        {immersionItems.length > 0 && <section id="immersion" className="scroll-mt-24 border-b border-border bg-muted/30 py-16 md:py-20"><div className={container}><Reveal><SectionHeading eyebrow="Immersion" title="Des missions terrain," accent="des choix justifiés." description="Un regard sur les défis rencontrés en contexte réel, là où les décisions techniques impactent directement la performance et la confiance." /></Reveal>{immersionItems.length > 0 && <div className="mt-8 grid gap-5 md:grid-cols-2">{immersionItems.map((item, index) => <div key={item.id ?? index} className="rounded-[28px] border border-border/70 bg-card p-6 shadow-xs"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{item.period}</p><h3 className="mt-3 font-serif text-2xl font-medium text-foreground">{item.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.summary}</p></div>)}</div>}</div></section>}

        <BrandsMarquee />

        <section id="contact" className="relative overflow-hidden bg-hero py-12 text-ink-foreground sm:py-14 md:py-16">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative`}>
            <div className="grid items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
              <Reveal className="w-full">
                <div className="contact-copy rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_-20px_rgba(20,30,60,0.4)] backdrop-blur-sm sm:p-7">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Travaillons ensemble</div>
                  <h2 className="font-serif text-3xl font-normal leading-tight text-white sm:text-4xl md:text-5xl">Construisons une collaboration <span className="font-serif italic text-primary-glow">durable.</span></h2>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-foreground/80 sm:text-lg">Vous avez un réseau à sécuriser, un système à fiabiliser ou une application web à lancer ? Échangeons sur votre besoin.</p>
                  <div className="contact-meta mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a href={profile.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary">WhatsApp</a>
                    <a href={`mailto:${profile.email}`} className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary">{profile.email}</a>
                  </div>
                </div>
              </Reveal>
              <Reveal className="w-full"><ContactForm /></Reveal>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default Index;

