/**
 * Configuration unique et centrale du domaine du site Landry Net.
 * 
 * L'adresse officielle provient EXCLUSIVEMENT de la variable d'environnement VITE_SITE_URL.
 * Ne JAMAIS écrire d'adresse en dur dans le code ou les composants.
 */

function resolveSiteUrl(): string {
  // Support à la fois côté client (import.meta.env) et serveur / scripts (process.env)
  const envUrl =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
    (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
    "";

  const trimmed = String(envUrl).trim().replace(/\/+$/, "");

  const isProd =
    (typeof import.meta !== "undefined" && import.meta.env?.PROD) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV === "production");

  if (!trimmed) {
    if (isProd) {
      throw new Error(
        "❌ [siteConfig] La variable d'environnement VITE_SITE_URL est obligatoire en production (ex: https://landryit.com). Veuillez la renseigner dans vos variables de déploiement.",
      );
    }
    // Fallback de développement local uniquement
    return "http://localhost:8080";
  }

  return trimmed;
}

export const SITE_URL: string = resolveSiteUrl();

function resolveSiteHost(): string {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return SITE_URL.replace(/^https?:\/\//, "");
  }
}

export const SITE_HOST: string = resolveSiteHost();

export const isProduction: boolean = Boolean(
  (typeof import.meta !== "undefined" && import.meta.env?.PROD && import.meta.env?.VITE_VERCEL_ENV !== "preview") ||
  (typeof process !== "undefined" && process.env?.NODE_ENV === "production" && process.env?.VERCEL_ENV !== "preview")
);

export const isPreviewDeployment: boolean = !isProduction;

/**
 * Construit une URL absolue à partir d'un chemin relatif.
 * Si le chemin est déjà absolu (http/https), il est renvoyé tel quel.
 */
export function absoluteUrl(path = "/"): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}

/**
 * Optimise une URL d'image pour l'aperçu OpenGraph / Twitter Cards (1200x630 JPG < 300 Ko).
 * - Pour Cloudinary : injecte les transformations c_fill,w_1200,h_630,f_jpg,q_auto sans altérer l'original
 * - Pour les chemins relatifs : convertit en URL absolue
 * - En secours : retourne le logo Landry Net (/og-landry-net.jpg)
 */
export function getOptimizedOgImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    return absoluteUrl("/og-landry-net.jpg");
  }

  const trimmed = imageUrl.trim();

  // Transformation dynamique Cloudinary
  if (trimmed.includes("res.cloudinary.com") && trimmed.includes("/upload/")) {
    if (trimmed.includes("/c_fill,w_1200,h_630")) {
      return trimmed;
    }
    return trimmed.replace("/upload/", "/upload/c_fill,w_1200,h_630,f_jpg,q_auto/");
  }

  // Chemin relatif propre au site
  if (trimmed.startsWith("/")) {
    return absoluteUrl(trimmed);
  }

  return trimmed;
}

export interface OptimizeImageOptions {
  width?: number;
  height?: number;
  quality?: "auto" | "auto:good" | "auto:best" | "auto:eco" | number;
  format?: "auto" | "webp" | "avif" | "jpg" | "png";
  crop?: "fill" | "scale" | "limit" | "fit" | "thumb";
}

/**
 * Optimise dynamiquement les images hébergées sur Cloudinary.
 * - Format automatique (f_auto -> AVIF / WebP selon le navigateur)
 * - Compression intelligente (q_auto)
 * - Redimensionnement à la taille requise (w_...)
 */
export function getOptimizedImageUrl(
  imageUrl?: string | null,
  options?: OptimizeImageOptions
): string {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    return "";
  }

  const trimmed = imageUrl.trim();

  if (trimmed.includes("res.cloudinary.com") && trimmed.includes("/upload/")) {
    const format = options?.format ?? "auto";
    const quality = options?.quality ?? "auto:best";
    const parts: string[] = [`f_${format}`, `q_${quality}`];

    if (options?.width) parts.push(`w_${options.width}`);
    if (options?.height) parts.push(`h_${options.height}`);
    if (options?.crop) parts.push(`c_${options.crop}`);

    const transform = parts.join(",");

    if (trimmed.includes(`/upload/${transform}/`)) {
      return trimmed;
    }

    return trimmed.replace("/upload/", `/upload/${transform}/`);
  }

  return trimmed;
}

export const siteConfig = {
  url: SITE_URL,
  host: SITE_HOST,
  absoluteUrl,
  getOptimizedOgImageUrl,
  getOptimizedImageUrl,
};

export default siteConfig;

