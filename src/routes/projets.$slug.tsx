import { createFileRoute, Link, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import { useMemo } from "react";
import { ErrorPage, ServerErrorPage, errorBtn } from "@/components/portfolio/ErrorPage";
import { ArrowLeft, ArrowRight, ArrowUpRight, Github, Globe, Mail, Sparkles } from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { ProjectBody, firstImage } from "@/components/portfolio/ProjectBody";
import { parseBlocks } from "@/lib/blocks";
import { normalizeProjectContent, sanitizeProjectHtml } from "@/lib/project-content";
import { projectQuery, projectsQuery } from "@/lib/content.queries";
import { profile, projectPage as copy, shareImage } from "@/content/portfolio";
import { absoluteUrl, getOptimizedImageUrl, getOptimizedOgImageUrl } from "@/lib/siteConfig";
import { buildBreadcrumbSchema, buildProjectSchema } from "@/lib/seo";
import { getRelatedProjects } from "@/lib/project-similarity";

export const Route = createFileRoute("/projets/$slug")({
  loader: async ({ params, context }) => {
    const project = await context.queryClient.ensureQueryData(projectQuery(params.slug));
    if (!project) throw notFound();
    await context.queryClient.prefetchQuery(projectsQuery);
    return project;
  },
  head: ({ loaderData, params }) => {
    const isFound = Boolean(loaderData);
    const norm = isFound && loaderData?.content ? normalizeProjectContent(loaderData.content) : null;
    const title = norm?.seo_title
      ? `${norm.seo_title} — Landry Kayoyo`
      : loaderData
      ? `${loaderData.title} — Landry Kayoyo`
      : "Projet introuvable — Landry Kayoyo";
    const description =
      norm?.seo_description ||
      (isFound && loaderData?.summary ? loaderData.summary : copy.unavailableText);
    const projectUrl = absoluteUrl(`/projets/${params.slug}`);

    // Détection dynamique de l'affiche/image du projet pour les partages
    let projectShareImage = loaderData?.image_url;
    if (!projectShareImage && norm?.gallery && norm.gallery.length > 0) {
      projectShareImage = norm.gallery[0].url;
    }
    if (!projectShareImage && norm?.html) {
      const match = norm.html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        projectShareImage = match[1];
      }
    }

    const ogImageUrl =
      isFound && projectShareImage
        ? getOptimizedOgImageUrl(projectShareImage)
        : shareImage.url;

    const ogImageAlt =
      isFound && (loaderData?.image_alt || loaderData?.title)
        ? loaderData.image_alt || loaderData.title
        : "Illustration du projet — Landry Net";

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
      scripts: isFound
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(
                buildBreadcrumbSchema([
                  { name: "Accueil", path: "/" },
                  { name: "Projets", path: "/projets" },
                  { name: loaderData.title, path: `/projets/${params.slug}` },
                ])
              ),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify(buildProjectSchema(loaderData)),
            },
          ]
        : [],
    };
  },
  component: ProjectDetail,
  notFoundComponent: ProjectNotFound,
  errorComponent: ProjectError,
});

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8";

function ProjectNotFound() {
  return (
    <ErrorPage
      tabTitle="Projet introuvable — Landry Kayoyo"
      title="Ce projet n'existe pas ou a été déplacé"
      text={<p>Retrouvez toutes mes réalisations sur la page des projets.</p>}
      actions={
        <>
          <Link to="/projets" className={errorBtn.primary}>
            Voir tous les projets
          </Link>
          <Link to="/" className={errorBtn.outline}>
            Retour à l&apos;accueil
          </Link>
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
  const contentData = useMemo(() => normalizeProjectContent(p.content), [p.content]);
  const sanitizedHtml = useMemo(() => sanitizeProjectHtml(contentData.html), [contentData.html]);
  const blocks = useMemo(() => parseBlocks(p.content), [p.content]);
  const hero = firstImage(blocks);
  const all = useQuery(projectsQuery).data ?? [];
  const related = getRelatedProjects(p, all);

  // Déduplication intelligente de l'affiche : si l'image de couverture est affichée en haut à sa manière,
  // on retire son double dans le corps du texte pour ne jamais avoir deux fois la même image.
  const displayHtml = useMemo(() => {
    if (!sanitizedHtml) return "";
    const cover = (p.image_url || hero?.url || "").trim();
    if (!cover) return sanitizedHtml;

    const normalize = (u: string) => {
      try {
        return u.split("?")[0].replace(/\/upload\/(?:[a-z0-9_,:]+\/)?/, "/upload/");
      } catch {
        return u;
      }
    };

    const target = normalize(cover);
    let stripped = false;

    // 1. Balise figure englobante
    let clean = sanitizedHtml.replace(
      /<figure[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>(?:\s*<figcaption>.*?<\/figcaption>)?\s*<\/figure>/i,
      (match, src) => {
        if (!stripped && (normalize(src) === target || src === cover)) {
          stripped = true;
          return "";
        }
        return match;
      }
    );

    // 2. Balise p englobante
    if (!stripped) {
      clean = clean.replace(
        /<p[^>]*>\s*<img[^>]+src=["']([^"']+)["'][^>]*>\s*<\/p>/i,
        (match, src) => {
          if (!stripped && (normalize(src) === target || src === cover)) {
            stripped = true;
            return "";
          }
          return match;
        }
      );
    }

    // 3. Balise img seule
    if (!stripped) {
      clean = clean.replace(
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
        (match, src) => {
          if (!stripped && (normalize(src) === target || src === cover)) {
            stripped = true;
            return "";
          }
          return match;
        }
      );
    }

    return clean;
  }, [sanitizedHtml, p.image_url, hero?.url]);

  return (
    <div id="top" className="bg-background text-foreground overflow-x-clip min-w-0">
      <Header />
      <main key={p.slug} className="page-enter pt-20 sm:pt-24 md:pt-32 min-w-0">
        {/* Navigation retour & Catégories */}
        <div className={container}>
          <div className="mb-6 sm:mb-8 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/projets"
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 shrink-0"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              <span>{copy.back}</span>
            </Link>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-primary">
                <Sparkles size={11} /> {copy.eyebrow}
              </span>
              <span className="rounded-full bg-secondary/80 border border-border px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-secondary-foreground">
                {p.tag}
              </span>
            </div>
          </div>
        </div>

        {/* En-tête héro du projet */}
        <section className={container}>
          <h1 className="max-w-4xl font-serif text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.14] sm:leading-[1.08] tracking-tight text-foreground break-words hyphens-auto">
            {p.title}
          </h1>

          {p.intro && (
            <p className="mt-4 sm:mt-6 max-w-3xl text-sm sm:text-lg md:text-xl leading-relaxed text-muted-foreground break-words">
              {p.intro}
            </p>
          )}

          {/* Badges des technologies */}
          {p.technologies.length > 0 && (
            <div className="mt-5 sm:mt-7 flex flex-wrap gap-1.5 sm:gap-2" aria-label={copy.technologies}>
              {p.technologies.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border/70 bg-secondary/70 px-3 py-0.5 sm:px-3.5 sm:py-1 text-[11px] sm:text-xs font-medium text-secondary-foreground shadow-xs transition-colors hover:border-primary/40"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Actions : Liens Démo en direct & GitHub */}
          {(p.external_url || contentData.github_url) && (
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              {p.external_url && (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-gradient-primary gap-2 shadow-sm w-full sm:w-auto justify-center"
                >
                  <a href={p.external_url} target="_blank" rel="noopener noreferrer">
                    <Globe size={18} /> {copy.live} <ArrowUpRight size={16} />
                  </a>
                </Button>
              )}
              {contentData.github_url && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full gap-2 shadow-2xs w-full sm:w-auto justify-center"
                >
                  <a href={contentData.github_url} target="_blank" rel="noopener noreferrer">
                    <Github size={18} /> Code source GitHub <ArrowUpRight size={16} />
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Image de couverture principale */}
          {(p.image_url || hero?.url) && (
            <div className="mt-8 sm:mt-10 md:mt-12 overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card p-2 sm:p-4 shadow-sm">
              <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-muted">
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

        {/* ── Contenu détaillé du projet ── */}
        {!contentData.isLegacyBlocks && displayHtml ? (
          <section className={`${container} mt-8 sm:mt-12 md:mt-16`}>
            <div
              className="project-prose"
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          </section>
        ) : (
          /* Compatibilité ascendante avec les anciens blocs JSON */
          <ProjectBody blocks={blocks} />
        )}

        {/* ── Galerie photos additionnelles si présente ── */}
        {contentData.gallery.length > 0 && (
          <section className={`${container} mt-12 sm:mt-16 md:mt-20 pt-10 border-t border-border/70`}>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Photos & Documents</p>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
                Galerie du projet
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contentData.gallery.map((img, i) => (
                <figure
                  key={img.id || i}
                  className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs group"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-muted">
                    <img
                      src={getOptimizedImageUrl(img.url, { width: 600 })}
                      alt={img.alt || img.title || "Image de galerie"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  {img.caption && (
                    <figcaption className="p-3 text-xs text-muted-foreground text-center italic">
                      {img.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Section Contact / CTA */}
        <section className="relative overflow-hidden bg-hero py-12 sm:py-16 text-ink-foreground md:py-24 my-10 sm:my-14 md:my-20">
          <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className={`${container} relative`}>
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-3.5 py-1 text-xs font-semibold text-primary-glow mb-4 sm:mb-5 backdrop-blur-sm">
                <Sparkles size={11} /> Travaillons ensemble
              </span>
              <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-normal leading-tight text-white tracking-tight">
                Ce projet vous inspire ?<br />
                <span className="italic font-serif text-primary-glow">Construisons le vôtre.</span>
              </h2>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed text-ink-foreground/75">
                Chaque projet commence par une conversation. Décrivez-moi votre besoin et je vous réponds rapidement avec une approche concrète.
              </p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="rounded-full bg-gradient-primary gap-2 shadow-glow w-full sm:w-auto justify-center">
                  <Link to="/contact">
                    <Mail size={16} /> Démarrer un projet <ArrowRight size={15} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-ink-foreground/5 text-ink-foreground hover:bg-ink-foreground/15 w-full sm:w-auto justify-center"
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
