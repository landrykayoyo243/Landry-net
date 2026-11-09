import { createFileRoute, Link, notFound, type ErrorComponentProps } from "@tanstack/react-router";
import { useMemo } from "react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { ErrorPage, ServerErrorPage, errorBtn } from "@/components/portfolio/ErrorPage";
import { LandrySignature } from "@/components/LandrySignature";
import { blogPostQuery, blogPostsQuery, estimateReadingTime } from "@/lib/blog-data";
import {
  normalizeBlogContent,
  sanitizeBlogHtml,
  extractFirstImageFromHtml,
  removeCoverImageFromHtml,
  stripSignatureFromHtml,
} from "@/lib/blog-content";
import { buildBlogPostSchema, buildBreadcrumbSchema } from "@/lib/seo";
import { absoluteUrl, getOptimizedOgImageUrl } from "@/lib/siteConfig";
import { shareImage, profile } from "@/content/portfolio";
import { Calendar, Clock, Tag, ArrowLeft, ArrowRight, User, Share2, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function BlogNotFound() {
  return (
    <ErrorPage
      tabTitle="Article introuvable — Landry Net"
      title="Cet article n'existe pas ou a été déplacé"
      text={<p>Retrouvez tous mes articles sur la page Blog.</p>}
      actions={
        <>
          <Link to="/blog" className={errorBtn.primary}>
            Voir tous les articles
          </Link>
          <Link to="/" className={errorBtn.outline}>
            Retour à l&apos;accueil
          </Link>
        </>
      }
    />
  );
}

function BlogError({ error }: ErrorComponentProps) {
  console.error(error);
  return <ServerErrorPage />;
}

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params, context }) => {
    const post = await context.queryClient.ensureQueryData(blogPostQuery(params.slug));
    if (!post) throw notFound();
    await context.queryClient.prefetchQuery(blogPostsQuery);
    return post;
  },
  head: ({ loaderData, params }) => {
    const isFound = Boolean(loaderData);
    const content = isFound && loaderData?.content ? normalizeBlogContent(loaderData.content) : null;
    const title = content?.seo_title
      ? `${content.seo_title} — Landry Net`
      : loaderData
      ? `${loaderData.title} — Landry Net`
      : "Article introuvable — Landry Net";
    const description =
      content?.seo_description || loaderData?.seo_description || loaderData?.summary || "";
    const postUrl = absoluteUrl(`/blog/${params.slug}`);

    const rawCover =
      loaderData?.cover_url ||
      (content?.html ? extractFirstImageFromHtml(content.html) : null) ||
      shareImage.url;
    const ogImg = getOptimizedOgImageUrl(rawCover);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: postUrl },
        { property: "og:image", content: ogImg },
        { property: "og:image:secure_url", content: ogImg },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: loaderData?.cover_alt || loaderData?.title || "Article Landry Net" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: ogImg },
        { name: "twitter:image:alt", content: loaderData?.cover_alt || loaderData?.title || "Article Landry Net" },
        ...(!isFound ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      ],
      links: [{ rel: "canonical", href: postUrl }],
      scripts: isFound && loaderData
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify(
                buildBreadcrumbSchema([
                  { name: "Accueil", path: "/" },
                  { name: "Blog", path: "/blog" },
                  { name: loaderData.title, path: `/blog/${params.slug}` },
                ])
              ),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify(buildBlogPostSchema(loaderData)),
            },
          ]
        : [],
    };
  },
  component: BlogPostDetail,
  notFoundComponent: BlogNotFound,
  errorComponent: BlogError,
});

function BlogPostDetail() {
  const post = Route.useLoaderData();
  const content = useMemo(() => normalizeBlogContent(post.content), [post.content]);
  const sanitizedHtml = useMemo(() => sanitizeBlogHtml(content.html), [content.html]);
  const allPosts = useQuery(blogPostsQuery).data ?? [];

  const coverUrl = post.cover_url || (content.html ? extractFirstImageFromHtml(content.html) : null);

  // Évite de réafficher dans le corps une image déjà présentée en couverture
  // et retire toute signature HTML embarquée pour garantir une signature unique propre en bas.
  const displayHtml = useMemo(() => {
    const withoutCover = removeCoverImageFromHtml(sanitizedHtml, coverUrl ?? "");
    return stripSignatureFromHtml(withoutCover);
  }, [sanitizedHtml, coverUrl]);

  // Dernières publications (articles de la même catégorie en priorité, ou récents pour toujours afficher au moins 2 articles)
  const related = useMemo(() => {
    const others = allPosts.filter((p) => p.id !== post.id && p.status === "published");
    const sameCategory = others.filter((p) => p.category && p.category === post.category);
    const otherCategory = others.filter((p) => !p.category || p.category !== post.category);
    const combined = [...sameCategory, ...otherCategory];
    return combined.slice(0, 3);
  }, [allPosts, post]);

  const readingTime = post.reading_time || estimateReadingTime(content.html);
  const date = post.published_at || post.created_at;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.summary || post.seo_description,
          url,
        });
        return;
      } catch {
        // Fallback clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Lien de l'article copié dans le presse-papier !");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-20 md:pt-24 pb-16">
        <article className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8 py-8">
          {/* Navigation retour en haut & Partage */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <Link
              to="/blog"
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 shrink-0 shadow-xs"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1 text-primary" />
              <span>Retour à tous les articles</span>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-8 px-3 text-xs gap-1.5 rounded-full cursor-pointer hover:border-primary/40 shrink-0"
              title="Partager cet article"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Partager</span>
            </Button>
          </div>

          {/* Fil d'Ariane */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 truncate">
            <Link to="/" className="hover:text-primary transition-colors">
              Accueil
            </Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-primary transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[240px] font-medium">
              {post.title}
            </span>
          </nav>

          {/* En-tête de l'article */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {post.category && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                  <Tag size={11} /> {post.category}
                </span>
              )}
              {post.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Sparkles size={11} /> Article à la une
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            {/* Méta-informations auteur, date, temps de lecture */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground border-y border-border/70 py-3.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center font-bold text-xs">
                  LK
                </div>
                <span className="font-semibold text-foreground">{profile.name}</span>
              </div>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} /> {formatDate(date)}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} /> {readingTime} min de lecture
              </span>
            </div>
          </header>

          {/* Photo de couverture */}
          {coverUrl && (
            <div className="mb-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-border bg-card shadow-sm">
              <img
                src={coverUrl}
                alt={post.cover_alt || post.title}
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          )}

          {/* Corps de l'article avec typographie soignée */}
          <div className="project-prose">
            {displayHtml ? (
              <div dangerouslySetInnerHTML={{ __html: displayHtml }} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Cet article n&apos;a pas encore de contenu.
              </div>
            )}
          </div>

          {/* Signature officielle calligraphiée Landry Net */}
          <div className="mt-12 pt-6 border-t border-border/80">
            <LandrySignature size="lg" />
          </div>

          {/* Tags de l'article */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Tags :</span>
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* Bouton retour vers la liste */}
          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
            <Button asChild variant="outline" size="sm" className="rounded-full gap-2 cursor-pointer">
              <Link to="/blog">
                <ArrowLeft size={14} /> Retour à tous les articles
              </Link>
            </Button>
          </div>
        </article>

        {/* Section Dernières publications */}
        {related.length > 0 && (
          <section className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 mt-16 pt-12 border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  À découvrir aussi
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                  Dernières publications
                </h2>
              </div>
              <Link
                to="/blog"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <span>Tous les articles</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {related.map((p) => {
                const pDate = p.published_at || p.created_at;
                return (
                  <Link
                    key={p.id}
                    to="/blog/$slug"
                    params={{ slug: p.slug }}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    {p.cover_url && (
                      <div className="aspect-[16/10] overflow-hidden rounded-xl bg-muted mb-3">
                        <img
                          src={p.cover_url}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary">
                        {p.category || "Technologie"}
                      </span>
                      <span>·</span>
                      <span>{p.reading_time || 3} min</span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                      {p.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
                      {p.seo_description || p.summary}
                    </p>
                    <span className="mt-3 text-xs text-primary font-semibold flex items-center gap-1">
                      Lire l&apos;article <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
