/**
 * Rate limiter glissant en mémoire pour les endpoints serveur.
 * Permet de protéger les opérations sensibles contre les attaques par force brute ou abus.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitEntry>();

// Nettoyage régulier des clés expirées
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < 60_000);
      if (entry.timestamps.length === 0) {
        memoryStore.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitOptions {
  windowMs: number; // Durée de la fenêtre en millisecondes
  max: number; // Nombre maximal de requêtes autorisées par fenêtre
}

/**
 * Vérifie et incrémente le quota d'un client.
 * Retourne { allowed: true } ou { allowed: false, retryAfter: number }.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60_000, max: 30 },
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = memoryStore.get(identifier) ?? { timestamps: [] };

  // Filtrer les requêtes en dehors de la fenêtre
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs);

  if (entry.timestamps.length >= options.max) {
    const oldest = entry.timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + options.windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, retryAfter) };
  }

  entry.timestamps.push(now);
  memoryStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: options.max - entry.timestamps.length,
  };
}

/** Extrait l'IP client depuis la requête HTTP. */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}
