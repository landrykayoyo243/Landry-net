import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Code2,
  FileText,
  Github,
  Linkedin,
  Mail,
  MessageSquare,
  Network,
  Sparkles,
  ShieldCheck,
  Youtube,
} from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Button } from "@/components/ui/button";
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

const TITLE = "Landry Kayoyo — Administrateur Systèmes & Réseaux, Développeur Web | Lubumbashi";
const DESC =
  "Portfolio officiel de Landry Kayoyo à Lubumbashi (RDC) : conception d'infrastructures informatiques fiables, haute disponibilité, cybersécurité et applications web modernes.";
const KEYWORDS =
  "Landry Kayoyo, Landry Net, Administrateur systèmes Lubumbashi, Administrateur réseaux RDC, Développeur web Lubumbashi, Cisco CCNA, Linux Ubuntu, Windows Server, Haute disponibilité, Cybersécurité, Lubumbashi, RDC";

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
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildPersonSchema()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(buildWebSiteSchema()),
      },
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
const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition duration-300 hover:opacity-95 hover:shadow-md ${focus}`;
const btnGhostDark = `inline-flex items-center justify-center gap-2 rounded-full border border-ink-foreground/20 bg-ink-foreground/5 px-6 py-3.5 text-sm font-semibold text-ink-foreground backdrop-blur-sm transition duration-300 hover:border-primary/40 hover:text-primary ${focus}`;
const container = "mx-auto w-full max-w-6xl px-5 md:px-8";

function Hero({ cvUrl }: { cvUrl: string | null }) {
  return (
    <section className="relative overflow-hidden bg-hero text-ink-foreground">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="pointer-events-none absolute -top-36 right-0 h-[520px] w-[520px] rounded-full bg-primary/10 blur-[140px] animate-aura" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full bg-primary-glow/6 blur-[110px] animate-aura" style={{ animationDelay: "3s" }} aria-hidden />

      <div className={`${container} relative pb-16 pt-24 sm:pb-20 sm:pt-32 md:pb-24 md:pt-36`}>
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="order-2 text-center md:order-1 md:text-left">
            <p className="mb-4 inline-flex items-center justify-center gap-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary-glow sm:text-sm md:justify-start">
              <span className="inline-block h-px w-6 bg-primary-glow/70 sm:w-8" aria-hidden />
              <span>{heroSection.badge}</span>
            </p>
            <h1 className="max-w-3xl font-serif text-3xl font-normal leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl lg:text-[3.35rem]">
              {heroSection.titleLead}{" "}
              <span className="block font-serif italic text-primary-glow sm:inline">{heroSection.titleAccent}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-[1.8] text-ink-foreground/85 sm:text-lg md:mx-0">
              {heroSection.description}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4 md:justify-start">
              <Link to="/projets" className={btnPrimary}>{heroSection.ctaPrimary} <ArrowRight size={16} /></Link>
              {cvUrl && <a href={cvUrl} target="_blank" rel="noopener noreferrer" className={btnGhostDark}><FileText size={16} /> {heroSection.ctaSecondary}</a>}
              <Link to="/" hash="contact" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${focus}`}>
                <Mail size={15} /> {heroSection.ctaContact}
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-ink-foreground/70 md:justify-start">
              <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn de Landry Kayoyo" title="LinkedIn" className={`grid h-9 w-9 place-items-center rounded-full border border-white/15 transition hover:border-white/40 hover:bg-white/10 hover:text-white ${focus}`}><Linkedin size={16} aria-hidden /></a>
              <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub de Landry Kayoyo" title="GitHub" className={`grid h-9 w-9 place-items-center rounded-full border border-white/15 transition hover:border-white/40 hover:bg-white/10 hover:text-white ${focus}`}><Github size={16} aria-hidden /></a>
              <a href={profile.youtube} target="_blank" rel="noreferrer" aria-label="YouTube de Landry Kayoyo" title="YouTube" className={`grid h-9 w-9 place-items-center rounded-full border border-white/15 transition hover:border-white/40 hover:bg-white/10 hover:text-white ${focus}`}><Youtube size={16} aria-hidden /></a>
              <a href={profile.x} target="_blank" rel="noreferrer" aria-label="Profil X de Landry Kayoyo" title="X" className={`grid h-9 w-9 place-items-center rounded-full border border-white/15 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10 hover:text-white ${focus}`}>𝕏</a>
            </div>
          </div>

          <div className="order-1 mx-auto mb-2 block md:hidden">
            <div className="relative mx-auto h-60 w-60 overflow-hidden rounded-full shadow-2xl sm:h-68 sm:w-68">
              <picture><source srcSet={photo.webp} type="image/webp" /><img src={photo.fallback} alt="Portrait de Landry Kayoyo" width={800} height={800} loading="eager" fetchPriority="high" decoding="async" className="h-full w-full scale-125 rounded-full object-cover object-[52%_15%]" /></picture>
            </div>
          </div>
          <div className="order-1 mx-auto hidden w-full md:order-2 md:block md:max-w-[370px] lg:max-w-[400px]">
            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/15 bg-white/5 p-2 shadow-2xl backdrop-blur-md sm:rounded-[2.6rem] sm:p-2.5">
              <picture><source srcSet={photo.webp} type="image/webp" /><img src={photo.fallback} alt="Portrait de Landry Kayoyo — Administrateur systèmes & réseaux et développeur web" width={800} height={800} loading="eager" fetchPriority="high" decoding="async" className="aspect-[4/5] w-full rounded-[1.8rem] object-cover object-[55%_22%] sm:rounded-[2.2rem]" /></picture>
            </div>
          </div>
        </div>
        <div className="mt-12 hidden justify-center md:flex">
          <a href="#competences" aria-label="Découvrir la suite" className={`flex flex-col items-center gap-1.5 text-white/40 transition-colors duration-300 hover:text-white/75 ${focus}`}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Découvrir</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-scroll-bounce" aria-hidden><path d="M12 5v14M5 12l7 7 7-7" /></svg>
          </a>
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

        <section className="relative overflow-hidden border-b border-border bg-card py-14 md:py-20">
          <div className={`${container} text-center`}>
            <Reveal className="mx-auto max-w-3xl">
              <blockquote className="font-serif text-xl font-normal leading-relaxed text-foreground sm:text-2xl md:text-3xl">
                « {conviction.text}{" "}<span className="font-serif font-medium italic text-primary">{conviction.highlight}</span>{" "}»
              </blockquote>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Philosophie & exigence de conception</p>
            </Reveal>
          </div>
        </section>

        <section className="border-b border-border bg-background py-12 sm:py-16">
          <div className={`${container} max-w-5xl`}>
            <Reveal className="mb-7 text-center sm:mb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Repères concrets</p>
              <h2 className="mt-2 font-serif text-2xl font-medium tracking-tight text-foreground sm:text-3xl">L’expérience en quelques chiffres</h2>
            </Reveal>
            <Reveal><AnimatedStats /></Reveal>
          </div>
        </section>

        <section id="competences" className="scroll-mt-24 border-b border-border bg-muted/30 py-20 md:py-28">
          <div className={container}>
            <Reveal><SectionHeading eyebrow="Domaines d’intervention" title="Du réseau à l’application," accent="une vision cohérente." description="J’interviens sur les fondations numériques et les outils qui font avancer votre activité, avec une même exigence de fiabilité et de simplicité." /></Reveal>
            <div className="grid gap-5 md:grid-cols-3">
              {aboutPage.pillars.items.map((item, index) => {
                const Icon = [Network, ShieldCheck, Code2][index];
                return <Reveal key={item.title} delay={index * 110}><div className="pillar-card flex h-full flex-col rounded-[28px] border border-border/70 bg-card p-7 shadow-xs sm:p-8"><div><div className="flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon size={22} aria-hidden /></div><span className="font-serif text-sm font-semibold text-primary/70">0{index + 1}</span></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{item.tag}</p><h3 className="mt-2 font-serif text-xl font-medium text-foreground sm:text-2xl">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div><p className="mt-6 border-t border-border/50 pt-4 text-xs leading-relaxed text-muted-foreground">{item.subtext}</p></div></Reveal>;
              })}
            </div>
          </div>
        </section>

        <section id="apropos" className="scroll-mt-24 border-b border-border bg-background py-20 md:py-28">
          <div className={container}><Reveal><div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[400px] lg:max-w-none"><div className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-border/80 bg-muted/40 shadow-md"><picture><source srcSet="/Profil%20%26%20Conviction.webp" type="image/webp" /><img src="/Profil%20%26%20Conviction.jpg" alt="Landry Kayoyo — Mon histoire" width={700} height={800} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_25%]" /></picture></div></div>
            <div className="mx-auto w-full max-w-2xl lg:mx-0"><div className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary"><span className="h-px w-7 rounded-full bg-primary/80" aria-hidden="true" /><span>Mon histoire</span></div><h2 className="font-serif text-3xl font-medium leading-[1.14] tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]">Du réseau au web, <span className="font-serif italic text-primary">des solutions fiables.</span></h2><div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{about.map((paragraph, index) => <p key={paragraph} className={index === 0 ? "font-medium text-foreground" : ""}>{paragraph}</p>)}</div><div className="mt-8"><Button asChild size="lg" className="rounded-full bg-gradient-primary"><Link to="/a-propos">Découvrir mon histoire <ArrowRight size={16} /></Link></Button></div></div>
          </div></Reveal></div>
        </section>

        <section id="projets" className="scroll-mt-24 border-b border-border bg-card py-20 md:py-28">
          <div className={container}><Reveal><SectionHeading eyebrow="Réalisations" title="Des problèmes réels," accent="des solutions concrètes." description="Une sélection de projets conçus pour répondre à des besoins concrets, du réseau aux applications web." /></Reveal>
            {projectsQ.isPending ? <ContentLoading rows={2} className="h-72" /> : projectsQ.isError ? <ContentError label="les projets" onRetry={() => projectsQ.refetch()} /> : <><div className="grid gap-7 md:grid-cols-2 lg:gap-8">{featured.slice(0, 3).map((project, index) => <Reveal key={project.slug} delay={index * 100}><ProjectCard p={project} /></Reveal>)}</div><div className="mt-12 flex justify-center"><Button asChild size="lg" variant="outline" className="rounded-full px-8 hover:bg-muted/50"><Link to="/projets" className="flex items-center gap-2">Voir tous les projets <ArrowRight size={16} /></Link></Button></div></>}
          </div>
        </section>

        {immersionItems.length > 0 && <section id="immersion" className="scroll-mt-24 border-b border-border bg-muted/30 py-20 md:py-28"><div className={container}><Reveal><SectionHeading eyebrow="En images" title="Le numérique," accent="sur le terrain." description="Quelques aperçus des interventions, des environnements techniques et des réalisations qui prennent vie au quotidien." /></Reveal><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{immersionItems.map((item) => <Reveal key={item.id} className="group"><figure className="relative aspect-[4/3] overflow-hidden rounded-[26px] border border-border/80 bg-muted shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-card"><img src={getOptimizedImageUrl(item.image_url, { width: 720 })} alt={item.image_alt ?? item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" aria-hidden /><figcaption className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6"><span className="inline-flex rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{item.tag}</span><h3 className="mt-2 font-serif text-lg font-medium leading-snug drop-shadow-sm">{item.title}</h3></figcaption></figure></Reveal>)}</div></div></section>}

        <BrandsMarquee />

        <section id="contact" className="relative overflow-hidden bg-hero py-14 text-ink-foreground sm:py-16 md:py-20">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative`}>
            <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
              <Reveal className="text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><Sparkles size={12} /> Travaillons ensemble</div>
                <h2 className="font-serif text-3xl font-normal leading-tight text-white sm:text-4xl md:text-5xl">Construisons une collaboration <span className="font-serif italic text-primary-glow">durable</span>.</h2>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-foreground/75 sm:text-lg">Vous avez un réseau à sécuriser, un système à fiabiliser ou une application web à lancer ? Je vous accompagne avec des solutions fiables, simples et pensées pour durer.</p>
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
