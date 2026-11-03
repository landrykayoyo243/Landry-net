import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Filter, Sparkles } from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { ProjectCard } from "@/components/portfolio/ProjectCard";
import { useQuery } from "@tanstack/react-query";
import { ContentError, ContentLoading } from "@/components/portfolio/ContentState";
import { projectsQuery } from "@/lib/content.queries";
import { shareImage } from "@/content/portfolio";
import { absoluteUrl } from "@/lib/siteConfig";
import { buildBreadcrumbSchema } from "@/lib/seo";

const TITLE = "Réalisations & Projets — Landry Kayoyo | Réseaux & Web";
const DESC =
  "Découvrez les réalisations techniques de Landry Kayoyo : infrastructures réseau résilientes, haute disponibilité, cybersécurité et applications web déployées.";
const KEYWORDS =
  "Projets Landry Kayoyo, Réalisations réseaux Lubumbashi, Études de cas Cisco, PayLix, XSECURITY, Développeur web portfolio RDC";

export const Route = createFileRoute("/projets/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/projets") },
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
    links: [{ rel: "canonical", href: absoluteUrl("/projets") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbSchema([
            { name: "Accueil", path: "/" },
            { name: "Projets", path: "/projets" },
          ])
        ),
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.prefetchQuery(projectsQuery),
  component: ProjectsPage,
});

const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ProjectsPage() {
  const { data: projects, isPending, isError, refetch } = useQuery(projectsQuery);
  const [selectedTag, setSelectedTag] = useState<string>("Tous");

  const allProjects = projects ?? [];
  const tags = ["Tous", ...Array.from(new Set(allProjects.map((p) => p.tag).filter(Boolean)))];

  const filteredProjects =
    selectedTag === "Tous"
      ? allProjects
      : allProjects.filter((p) => p.tag === selectedTag);

  return (
    <div className="bg-background text-foreground">
      <Header />
      <main className="page-enter pt-24 md:pt-32">
        {/* En-tête héro des projets */}
        <section className={`${container} pb-12`}>
          <Link
            to="/"
            className={`mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focus}`}
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>

          <div className="mb-4 inline-flex items-center gap-3 text-xs md:text-sm font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="h-[1.5px] w-7 rounded-full bg-primary/80 inline-block" />
            <span>Réalisations & Études de cas</span>
          </div>

          <h1 className="max-w-3xl font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-tight tracking-tight text-foreground">
            Tous les projets, <span className="italic font-serif text-primary">conçus pour durer</span>.
          </h1>

          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            Infrastructures haute disponibilité, réseaux locaux d'entreprises, déploiements sécurisés et applications web modernes (comme PayLix).
          </p>

          {/* Filtres par catégories */}
          {tags.length > 1 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
              <span className="mr-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Filter size={13} /> Filtrer :
              </span>
              {tags.map((tag) => {
                const isActive = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 ${focus} ${
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-sm"
                        : "border border-border/80 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Grille de projets */}
        {isPending ? (
          <div className={`${container} pb-24 md:pb-32`}>
            <ContentLoading rows={2} className="h-80" />
          </div>
        ) : isError ? (
          <div className={`${container} pb-24 md:pb-32`}>
            <ContentError label="les projets" onRetry={() => refetch()} />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className={`${container} pb-24 md:pb-32`}>
            <div className="rounded-[28px] border border-border/80 bg-card p-12 text-center">
              <p className="font-serif text-xl font-medium text-foreground">
                Aucun projet trouvé dans cette catégorie
              </p>
              <button
                type="button"
                onClick={() => setSelectedTag("Tous")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        ) : (
          <section className={`${container} grid gap-7 lg:gap-8 pb-24 md:grid-cols-2 md:pb-32`}>
            {filteredProjects.map((p) => (
              <ProjectCard key={p.slug} p={p} />
            ))}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
