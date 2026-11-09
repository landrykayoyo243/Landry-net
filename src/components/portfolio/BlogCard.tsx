import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Tag, ArrowRight } from "lucide-react";
import type { BlogPostRow } from "@/lib/blog-data";
import { extractFirstImageFromHtml } from "@/lib/blog-content";

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function BlogCard({ post }: { post: BlogPostRow }) {
  const date = post.published_at || post.created_at;
  const contentHtml = typeof post.content === "object" && post.content && "html" in (post.content as Record<string, unknown>)
    ? String((post.content as Record<string, unknown>).html)
    : "";
  const coverUrl = post.cover_url || extractFirstImageFromHtml(contentHtml);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
      {/* Couverture */}
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="block overflow-hidden aspect-[16/10] bg-muted relative">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={post.cover_alt || post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
            <span className="text-4xl font-black font-sans">LN</span>
          </div>
        )}
        {post.featured && (
          <span className="absolute top-3 left-3 rounded-md bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shadow-sm">
            ★ À la une
          </span>
        )}
      </Link>

      {/* Contenu */}
      <div className="flex flex-1 flex-col p-5">
        {/* Metas */}
        <div className="flex flex-wrap items-center gap-2.5 mb-2.5 text-xs text-muted-foreground">
          {post.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Tag size={10} /> {post.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar size={11} /> {formatDate(date)}
          </span>
          {post.reading_time > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <Clock size={11} /> {post.reading_time} min
            </span>
          )}
        </div>

        {/* Titre */}
        <Link to="/blog/$slug" params={{ slug: post.slug }}>
          <h2 className="text-base font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {post.title}
          </h2>
        </Link>

        {/* Extrait */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1 mb-4">
          {post.seo_description || post.summary || "Découvrez cet article technique complet..."}
        </p>

        {/* Tags & Action */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50 text-xs mt-auto">
          <div className="flex flex-wrap gap-1">
            {post.tags?.slice(0, 2).map((t) => (
              <span key={t} className="rounded-md bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                #{t}
              </span>
            ))}
          </div>

          <Link
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform shrink-0"
          >
            <span>Lire</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </article>
  );
}
