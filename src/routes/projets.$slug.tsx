import { createFileRoute, Link, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import { ErrorPage, ServerErrorPage, errorBtn } from "@/components/portfolio/ErrorPage";
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe, Mail, Sparkles } from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ProjectBody, firstImage } from "@/components/portfolio/ProjectBody";
import { parseBlocks } from "@/lib/blocks";
import { projectQuery, projectsQuery } from "@/lib/content.queries";
import { profile, projectPage as copy, shareImage } from "@/content/portfolio";
import { absoluteUrl, getOptimizedImageUrl, getOptimizedOgImageUrl } from "@/lib/siteConfig";

export const Route = createFileRoute("/projets/$slug")({
  loader: async ({ params, context }) => {
    const project = await context.queryClient.ensureQueryData(projectQuery(params.slug));
    if (!project) throw notFound();
    await context.queryClient.prefetchQuery(projectsQuery);
    return project;
  },
  head: ({ loaderData, params }) => {
    const isFound = Boolean(loaderData);
    const title = isFound ? `${loaderData.title} — Landry Kayoyo` : "Projet introuvable — Landry Kayoyo";
    const description = (isFound && loaderData?.summary) ? loaderData.summary : copy.unavailableText;
    const projectUrl = absoluteUrl(`/projets/${params.slug}`);

    const ogImageUrl = isFound && loaderData?.image_url
      ? getOptimizedOgImageUrl(loaderData.image_url)
      : shareImage.url;

    const ogImageAlt = isFound && loaderData?.image_url
      ? (loaderData.image_alt || loaderData.title)
      : "Logo Landry Net";

    const ogImageType = ogImageUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: isFound ? "article" : "website" },
        { property: "og:url", content: projectUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:image", content: ogImageUrl },
        { property: "og:image:secure_url", content: ogImageUrl },
        { property: "og:image:type", content: ogImageType },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: ogImageAlt },
        { name: "twitter:image", content: ogImageUrl },
        { name: "twitter:image:alt", content: ogImageAlt },
        ...(!isFound ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      ],
      links: [{ rel: "canonical", href: projectUrl }],
    };
  },
  component: ProjectDetail,
  notFoundComponent: ProjectNotFound,
  errorComponent: ProjectError,
});

const container = "mx-auto w-full max-w-6xl px-5 md:px-8";

function ProjectNotFound() {
  return (
    <ErrorPage
      tabTitle="Projet introuvable — Landry Kayoyo"
      title="Ce projet n'existe pas ou a été déplacé"
      text={<p>Retrouvez toutes mes réalisations sur la page des projets.</p>}
      actions={
        <>
          <Link to="/projets" className={errorBtn.primary}>Voir tous les projets</Link>
          <Link to="/" className={errorBtn.outline}>Retour à l'accueil</Link>
        </>
      }
    />
  );
}

function ProjectError({ error }: ErrorComponentProps) {
  console.error(error);
  return <ServerErrorPage />;
}

function ProjectDetail() {
  const p = Route.useLoaderData();
  const blocks = parseBlocks(p.content);
  const hero = firstImage(blocks);
  const all = useQuery(projectsQuery).data ?? [];
  const related = all
    .map((project, index) => ({
      project,
      index,
      score:
        project.technologies.filter((t) => p.technologies.includes(t)).length +
        (project.tag === p.tag ? 2 : 0),
    }))
    .filter(({ project, score }) => project.slug !== p.slug && score >= 1)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3);

  return (
    <div id="top" className="bg-background text-foreground">
      <Header />
      <main key={p.slug} className="page-enter pt-24 md:pt-32">
        {/* Navigation retour & Catégories */}
        <div className={container}>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/projets"
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              <span>{copy.back}</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles size={12} /> {copy.eyebrow}
              </span>
              <span className="rounded-full bg-secondary/80 border border-border px-3.5 py-1 text-xs font-semibold text-secondary-foreground">
                {p.tag}
              </span>
            </div>
          </div>
        </div>

        {/* En-tête héro du projet */}
        <section className={container}>
          <h1 className="max-w-4xl font-serif text-3xl sm:text-5xl md:text-6xl font-normal leading-[1.08] tracking-tight text-foreground break-words">
            {p.title}
          </h1>

          {p.intro && (
            <p className="mt-6 max-w-3xl text-base sm:text-xl leading-relaxed text-muted-foreground">
              {p.intro}
            </p>
          )}

          {/* Badges des technologies */}
          {p.technologies.length > 0 && (
            <div className="mt-7 flex flex-wrap gap-2" aria-label={copy.technologies}>
              {p.technologies.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border/70 bg-secondary/70 px-3.5 py-1 text-xs font-medium text-secondary-foreground shadow-xs transition-colors hover:border-primary/40"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Actions & Lien Live */}
          {p.external_url && (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="rounded-full bg-gradient-primary gap-2 shadow-sm">
                <a href={p.external_url} target="_blank" rel="noopener noreferrer">
                  <Globe size={18} /> {copy.live} <ArrowUpRight size={16} />
                </a>
              </Button>
              <a
                href={p.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-xs sm:text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
              >
                {p.external_url}
              </a>
            </div>
          )}

          {/* Image de couverture principale dans un cadre studio */}
          {(p.image_url || hero?.url) && (
            <div className="mt-10 md:mt-12 overflow-hidden rounded-[28px] border border-border/80 bg-card p-3 sm:p-4 shadow-sm">
              <div className="overflow-hidden rounded-[20px] bg-muted">
                <img
                  src={getOptimizedImageUrl(p.image_url || hero?.url || "", { width: 1200 })}
                  alt={p.image_alt || hero?.alt || p.title}
                  width={1200}
                  height={800}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[16/10] sm:aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
                />
              </div>
            </div>
          )}
          {hero?.note && <p className="mt-3 text-xs text-muted-foreground text-center">{hero.note}</p>}
        </section>

        {/* Corps structuré de l'étude de cas */}
        <ProjectBody blocks={blocks} />

        {/* Section Contact / CTA */}
        <section className="relative overflow-hidden bg-hero py-16 text-ink-foreground md:py-24 my-14 md:my-20">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative`}>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-3.5 py-1 text-xs font-semibold text-primary-glow mb-5 backdrop-blur-sm">
                <Sparkles size={11} /> Travaillons ensemble
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white tracking-tight">
                Ce projet vous inspire ?<br />
                <span className="italic font-serif text-primary-glow">Construisons le vôtre.</span>
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-ink-foreground/75">
                Chaque projet commence par une conversation. Décrivez-moi votre besoin et je vous réponds rapidement avec une approche concrète.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-gradient-primary gap-2 shadow-glow">
                  <Link to="/contact">
                    <Mail size={16} /> Démarrer un projet <ArrowRight size={15} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-ink-foreground/5 text-ink-foreground hover:bg-ink-foreground/15"
                >
                  <Link to="/projets">
                    Voir les autres projets
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section Projets similaires */}
        {related.length > 0 && (
          <section className={`${container} border-t border-border/70 py-12 md:py-16`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">{copy.next}</p>
                <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight text-foreground">Projets similaires</h2>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full gap-1.5 text-xs">
                <Link to="/projets">{copy.back}<ArrowRight size={13} /></Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(({ project }) => (
                <Link
                  key={project.slug}
                  to="/projets/$slug"
                  params={{ slug: project.slug }}
                  className="pillar-card group flex items-center gap-3.5 overflow-hidden rounded-[20px] border border-border/70 bg-card p-3 shadow-xs transition-all duration-300"
                >
                  {/* Miniature cadrée */}
                  <div className="relative h-16 w-22 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {project.image_url ? (
                      <img
                        src={getOptimizedImageUrl(project.image_url, { width: 220 })}
                        alt={project.image_alt || project.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-primary/10 text-primary font-bold text-xs uppercase">
                        {project.slug.slice(0, 3)}
                      </div>
                    )}
                  </div>

                  {/* Infos texte */}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">{project.tag}</span>
                    <h3 className="font-serif text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {project.title}
                    </h3>
                  </div>

                  <ArrowRight size={15} className="shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}