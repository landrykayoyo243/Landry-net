import { profile, shareImage } from "@/content/portfolio";
import { absoluteUrl, SITE_URL } from "@/lib/siteConfig";

/**
 * Directives de robots par défaut pour Google et les moteurs de recherche.
 * Autorise les grands aperçus d'images et les extraits enrichis.
 */
export const DEFAULT_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

/**
 * Données structurées Schema.org pour la personne (Landry Kayoyo).
 */
export function buildPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/#person`,
    name: profile.name,
    alternateName: [profile.fullName, "Landry Net"],
    jobTitle: "Administrateur Systèmes & Réseaux, Développeur Web",
    description: profile.tagline,
    url: SITE_URL,
    image: shareImage.url,
    email: profile.email,
    telephone: profile.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lubumbashi",
      addressRegion: "Haut-Katanga",
      addressCountry: "CD",
    },
    sameAs: [
      profile.linkedin,
      profile.github,
      profile.youtube,
      profile.x,
    ].filter(Boolean),
    knowsAbout: [
      "Administration de systèmes",
      "Réseaux informatiques",
      "Cisco CCNA",
      "Linux Ubuntu & Debian",
      "Windows Server & Active Directory",
      "Virtualisation & Haute disponibilité",
      "Cybersécurité & Sauvegardes",
      "Développement Web",
      "React & TypeScript",
      "Bases de données SQL",
    ],
  };
}

/**
 * Données structurées Schema.org pour le site Web principal.
 */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Landry Net",
    alternateName: "Portfolio de Landry Kayoyo",
    description: profile.tagline,
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Person",
      name: profile.name,
    },
  };
}

/**
 * Données structurées Schema.org pour une fiche projet (CreativeWork / Article).
 */
export function buildProjectSchema(project: {
  title: string;
  summary?: string | null;
  slug: string;
  image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  technologies?: string[] | null;
}) {
  const url = absoluteUrl(`/projets/${project.slug}`);
  const image = project.image_url ? absoluteUrl(project.image_url) : shareImage.url;

  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: project.title,
    description: project.summary || project.title,
    url,
    image,
    datePublished: project.created_at || undefined,
    dateModified: project.updated_at || project.created_at || undefined,
    author: {
      "@type": "Person",
      name: profile.name,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Person",
      name: profile.name,
      url: SITE_URL,
    },
    inLanguage: "fr-FR",
    keywords: project.technologies?.join(", ") || undefined,
  };
}

/**
 * Données structurées pour le fil d'Ariane (BreadcrumbList).
 */
export function buildBreadcrumbSchema(
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Données structurées Schema.org pour un article de blog (BlogPosting).
 */
export function buildBlogPostSchema(post: {
  title: string;
  slug: string;
  summary?: string | null;
  cover_url?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: string | null;
  tags?: string[] | null;
  reading_time?: number | null;
}) {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.cover_url ? absoluteUrl(post.cover_url) : shareImage.url;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#blogpost`,
    headline: post.title,
    description: post.summary || post.title,
    url,
    image,
    datePublished: post.published_at || post.created_at || undefined,
    dateModified: post.updated_at || post.published_at || post.created_at || undefined,
    author: {
      "@type": "Person",
      name: profile.name,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Person",
      name: profile.name,
      url: SITE_URL,
    },
    inLanguage: "fr-FR",
    articleSection: post.category || "Technologie",
    keywords: post.tags?.join(", ") || post.category || undefined,
    timeRequired: post.reading_time ? `PT${post.reading_time}M` : undefined,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

/**
 * Données structurées pour la page d'accueil du blog (Blog).
 */
export function buildBlogIndexSchema() {
  const url = absoluteUrl("/blog");
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${url}#blog`,
    url,
    name: "Blog technique — Landry Net",
    description:
      "Articles et retours d'expérience sur l'administration systèmes, les réseaux Cisco, la cybersécurité et le développement web.",
    inLanguage: "fr-FR",
    publisher: {
      "@type": "Person",
      name: profile.name,
      url: SITE_URL,
    },
  };
}
