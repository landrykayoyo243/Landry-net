import { sanitizeProjectHtml, normalizeProjectContent } from "@/lib/project-content";
import { BLOG_SIGNATURE_HTML } from "@/components/LandrySignature";
import type { BlogPostRow } from "@/lib/blog-data";

export { sanitizeProjectHtml as sanitizeBlogHtml, BLOG_SIGNATURE_HTML };

export interface NormalizedBlogContent {
  html: string;
  seo_title: string;
  seo_description: string;
}

/**
 * Normalise le contenu JSON ou HTML d'un article de blog.
 * Réutilise le sanitizer et parseur éprouvé du portfolio.
 */
export function normalizeBlogContent(raw: unknown): NormalizedBlogContent {
  const normalized = normalizeProjectContent(raw);
  return {
    html: normalized.html,
    seo_title: normalized.seo_title,
    seo_description: normalized.seo_description,
  };
}

/** Extrait la première image du HTML */
export function extractFirstImageFromHtml(html: string): string | null {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

/** Retire du corps les occurrences de l'image déjà affichée comme couverture. */
export function removeCoverImageFromHtml(html: string, coverUrl: string): string {
  if (!html || !coverUrl) return html;

  const normalizeUrl = (url: string) => {
    try {
      return url
        .replace(/&amp;/gi, "&")
        .split(/[?#]/, 1)[0]
        ?.trim()
        .replace(/\/upload\/(?:[a-z0-9_,:]+\/)?/, "/upload/")
        .toLowerCase() ?? "";
    } catch {
      return (url || "").trim().toLowerCase();
    }
  };

  const target = normalizeUrl(coverUrl);
  // Extrait l'identifiant de fichier (ex: vitvmjd5gqzbiyqjbret.webp) pour comparaison infaillible
  const targetBasename = target.split("/").pop() || "";

  const isCoverUrl = (src: string) => {
    if (!src) return false;
    const normalized = normalizeUrl(src);
    if (normalized === target || src === coverUrl) return true;
    if (targetBasename && targetBasename.length > 5 && normalized.endsWith(targetBasename)) return true;
    return false;
  };

  const imageTagPattern = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  const isCoverImage = (imageTag: string) => {
    const source = imageTag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2];
    return Boolean(source && isCoverUrl(source));
  };

  let result = html;

  // 1. Balise figure englobante
  result = result.replace(/<figure\b[^>]*>[\s\S]*?<\/figure\s*>/gi, (figure) => {
    const images = figure.match(/<img\b[^>]*>/gi) ?? [];
    return images.some(isCoverImage) ? "" : figure;
  });

  // 2. Balise paragraphe ou div contenant l'image
  result = result.replace(/<(?:p|div)\b[^>]*>[\s\S]*?<\/(?:p|div)\s*>/gi, (block) => {
    const images = block.match(/<img\b[^>]*>/gi) ?? [];
    if (!images.some(isCoverImage)) return block;
    const remaining = block
      .replace(imageTagPattern, (image) => (isCoverImage(image) ? "" : image))
      .replace(/<\/?(?:p|div|br|span)\b[^>]*>/gi, "")
      .replace(/&nbsp;|\s/gi, "");
    return remaining ? block : "";
  });

  // 3. Balise img seule restante
  result = result.replace(imageTagPattern, (image) => (isCoverImage(image) ? "" : image));

  return result.trim();
}

/**
 * Retire du HTML toute signature calligraphiée embarquée
 * pour éviter les doublons avec le composant React officiel LandrySignature.
 */
export function stripSignatureFromHtml(html: string): string {
  if (!html) return "";
  let clean = html;
  // 1. Détection classe landry-signature
  clean = clean.replace(/<div[^>]*class=["'][^"']*landry-signature[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, "");
  // 2. Détection bloc style inline text-align: right contenant Landry Net
  clean = clean.replace(/<div[^>]*style=["'][^"']*text-align:\s*right[^"']*["'][^>]*>[\s\S]*?Landry\s*Net[\s\S]*?<\/div>/gi, "");
  // 3. Détection span ou div contenant 'Segoe Script' ou 'Brush Script MT' ou 'cursive' et 'Landry Net'
  clean = clean.replace(/<div[^>]*>[\s\S]*?(?:Segoe Script|Brush Script MT|cursive)[\s\S]*?Landry\s*Net[\s\S]*?<\/div>/gi, "");
  clean = clean.replace(/<span[^>]*style=["'][^"']*(?:Segoe Script|Brush Script MT|cursive)[^"']*["'][^>]*>[\s\S]*?Landry\s*Net[\s\S]*?<\/span>/gi, "");
  return clean.trim();
}

/** Assure que la signature calligraphiée officielle est incluse à la fin du HTML publié */
export function appendSignatureIfMissing(html: string): string {
  if (!html) return BLOG_SIGNATURE_HTML;
  if (html.includes("landry-signature") || html.includes("Landry Net</span>")) {
    return html;
  }
  return `${html.trim()}\n\n${BLOG_SIGNATURE_HTML}`;
}

/** Récupère la meilleure image pour les cartes de partage (couverture ou première image) */
export function getBlogShareImage(post: Partial<BlogPostRow>, htmlContent?: string): string | null {
  if (post.cover_url && post.cover_url.trim()) return post.cover_url.trim();
  if (htmlContent) {
    const fromHtml = extractFirstImageFromHtml(htmlContent);
    if (fromHtml) return fromHtml;
  }
  return null;
}
