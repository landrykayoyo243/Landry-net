import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { BlogCard } from "@/components/portfolio/BlogCard";
import { blogPostsQuery } from "@/lib/blog-data";
import { absoluteUrl } from "@/lib/siteConfig";
import { shareImage } from "@/content/portfolio";
import { buildBlogIndexSchema, buildBreadcrumbSchema } from "@/lib/seo";
import { Search, BookOpen, Rss, ArrowRight, Sparkles } from "lucide-react";

const SITE_BLOG_URL = absoluteUrl("/blog");

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(blogPostsQuery),
  head: () => ({
    meta: [
      { title: "Blog technique & retours d'expérience — Landry Net" },
      {
        name: "description",
        content:
          "Articles techniques, tutoriels et retours d'expérience sur l'administration systèmes, réseaux Cisco, cybersécurité et développement web par Landry Kayoyo.",
      },
      { property: "og:title", content: "Blog technique & retours d'expérience — Landry Net" },
      {
        property: "og:description",
        content:
          "Articles techniques, tutoriels et retours d'expérience sur l'administration systèmes, réseaux Cisco, cybersécurité et développement web par Landry Kayoyo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_BLOG_URL },
      { property: "og:image", content: shareImage.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: shareImage.url },
    ],
    links: [{ rel: "canonical", href: SITE_BLOG_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbSchema([
            { name: "Accueil", path: "/" },
            { name: "Blog", path: "/blog" },
          ])
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(buildBlogIndexSchema()),
      },
    ],
  }),
  component: BlogIndexPage,
});

const ALL_CATEGORIES = "Tous";

function BlogIndexPage() {
  const posts = useQuery(blogPostsQuery).data ?? [];
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);

  // Catégories uniques
  const categories = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => {
      if (p.category) set.add(p.category.trim());
    });
    return [ALL_CATEGORIES, ...Array.from(set)];
  }, [posts]);

  // Filtrage combiné (catégorie + texte de recherche)
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = activeCategory === ALL_CATEGORIES || p.category === activeCategory;
      const q = search.trim().toLowerCase();
      if (!q) return matchCat;
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.seo_description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [posts, activeCategory, search]);

  const featured = useMemo(() => filtered.find((p) => p.featured) || (filtered.length > 0 ? filtered[0] : null), [filtered]);
  const rest = useMemo(() => (featured && filtered.length > 1 ? filtered.filter((p) => p.id !== featured.id) : filtered), [filtered, featured]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-20 md:pt-24">
        {/* En-tête Hero du Blog */}
        <section className="border-b border-border/70 bg-gradient-to-b from-primary/5 via-transparent to-transparent py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Rss size={13} /> Blog Landry Net
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {posts.length} article{posts.length > 1 ? "s" : ""} publié{posts.length > 1 ? "s" : ""}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Articles techniques &amp; retours du terrain
            </h1>
            <p className="mt-3.5 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
              Infrastructures réseaux, administration systèmes, sécurité informatique et conception d&apos;applications web utiles. Des retours pragmatiques issus de la pratique à Lubumbashi.
            </p>
          </div>
        </section>

        {/* Barre de Recherche et Filtres */}
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-8">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-8">
            {/* Input recherche */}
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Rechercher par titre, mot-clé, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-card pl-10 pr-4 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-2xs"
              />
            </div>

            {/* Filtres de catégories */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Article en vedette si aucun filtre textuel n'est actif */}
          {!search && featured && filtered.length > 1 && (
            <div className="mb-10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" /> À la une
              </p>
              <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-lg transition-all duration-300">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                  {featured.cover_url && (
                    <Link
                      to="/blog/$slug"
                      params={{ slug: featured.slug }}
                      className="md:col-span-5 aspect-[16/10] md:aspect-auto overflow-hidden bg-muted block"
                    >
                      <img
                        src={featured.cover_url}
                        alt={featured.cover_alt || featured.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </Link>
                  )}
                  <div className={`p-6 sm:p-8 flex flex-col justify-center ${featured.cover_url ? "md:col-span-7" : "md:col-span-12"}`}>
                    <div className="flex flex-wrap items-center gap-2.5 mb-3 text-xs text-muted-foreground">
                      {featured.category && (
                        <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                          {featured.category}
                        </span>
                      )}
                      <span>
                        {new Date(featured.published_at || featured.created_at).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      {featured.reading_time > 0 && <span>· {featured.reading_time} min de lecture</span>}
                    </div>

                    <Link to="/blog/$slug" params={{ slug: featured.slug }}>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground group-hover:text-primary transition-colors leading-snug mb-3">
                        {featured.title}
                      </h2>
                    </Link>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
                      {featured.seo_description || featured.summary}
                    </p>

                    <Link
                      to="/blog/$slug"
                      params={{ slug: featured.slug }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      <span>Lire l&apos;article complet</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          )}

          {/* Grille des articles */}
          {rest.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground my-8">
              <BookOpen size={36} className="mx-auto mb-3 opacity-40 text-primary" />
              <p className="font-semibold text-foreground">Aucun article trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Aucun article ne correspond à votre recherche." : "Les prochains articles seront publiés très prochainement !"}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-3 text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
