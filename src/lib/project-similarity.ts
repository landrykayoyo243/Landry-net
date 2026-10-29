export interface SimilarityProject {
  slug: string;
  title: string;
  tag?: string | null;
  intro?: string | null;
  summary?: string | null;
  technologies?: string[] | null;
}

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "et", "en", "pour", "avec", "par",
  "sur", "dans", "au", "aux", "ce", "cet", "cette", "ces", "mon", "ma", "mes", "son", "sa",
  "ses", "notre", "nos", "votre", "vos", "leur", "leurs", "qui", "que", "quoi", "dont", "ou",
  "est", "sont", "a", "ont", "projet", "etude", "cas",
]);

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#+.]+/g, " ")
    .trim();
}

function tokenize(text?: string | null): string[] {
  if (!text) return [];
  return normalize(text)
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// Groupes de synonymes ou concepts techniques équivalents
const CONCEPT_SYNONYMS: Record<string, string[]> = {
  react: ["react", "next", "nextjs", "next.js", "frontend"],
  next: ["next", "nextjs", "next.js", "react"],
  typescript: ["typescript", "ts", "javascript", "js"],
  database: ["database", "base", "donnees", "supabase", "sql", "bdd", "postgres"],
  supabase: ["supabase", "database", "sql", "postgres", "backend", "bdd"],
  web: ["web", "frontend", "backend", "fullstack", "developpement"],
  ecommerce: ["ecommerce", "e-commerce", "boutique", "boutiques", "commande", "commandes", "vente"],
  api: ["api", "rest", "webhook", "integration", "whatsapp"],
  whatsapp: ["whatsapp", "messagerie", "api", "mobile"],
  dashboard: ["dashboard", "tableaux", "tableau", "bord", "gestion"],
  infra: ["infrastructure", "infra", "cluster", "systeme", "systemes", "reseau", "reseaux", "serveur", "serveurs"],
  linux: ["linux", "ubuntu", "debian", "serveur", "systeme"],
  windows: ["windows", "server", "serveur", "ad", "active directory", "systeme"],
  cluster: ["cluster", "disponibilite", "haute", "tolerance", "failover", "virtualisation"],
  virtualisation: ["virtualisation", "vm", "hyperviseur", "cluster"],
  ai: ["ia", "ai", "gemini", "assistant", "llm", "virtuel", "interactif"],
};

// Familles de projets
const DOMAINS = {
  infra: ["cluster", "disponibilite", "virtualisation", "linux", "windows", "reseau", "lan", "cisco", "infrastructure", "serveur"],
  web: ["web", "react", "next", "typescript", "javascript", "tailwind", "css", "supabase", "api", "ecommerce", "boutique", "frais", "scolaires", "dashboard", "fullstack", "gestion"],
  ai: ["ia", "ai", "assistant", "virtuel", "llm", "gemini"],
};

function getProjectDomain(project: SimilarityProject): "infra" | "web" | "ai" | "unknown" {
  const allText = [
    project.title,
    project.tag,
    project.intro,
    project.summary,
    ...(project.technologies ?? []),
  ].join(" ").toLowerCase();

  const norm = normalize(allText);

  let infraScore = 0;
  for (const kw of DOMAINS.infra) {
    if (norm.includes(kw)) infraScore++;
  }

  let webScore = 0;
  for (const kw of DOMAINS.web) {
    if (norm.includes(kw)) webScore++;
  }

  let aiScore = 0;
  for (const kw of DOMAINS.ai) {
    if (norm.includes(kw)) aiScore++;
  }

  if (infraScore > webScore && infraScore > 0) return "infra";
  if (aiScore > 0 && aiScore >= webScore) return "ai";
  if (webScore > 0) return "web";
  return "unknown";
}

/**
 * Calcule un score de similarité robuste entre deux projets.
 * - Score élevé si technologies communes ou équivalentes.
 * - Bonus si même domaine (web app vs infrastructure critique).
 * - Pénalité si domaines totalement opposés (ex: cluster infra vs e-commerce).
 * - Seuil strict : score < 3 -> non similaire (score renvoyé = 0).
 */
export function calculateProjectSimilarity(a: SimilarityProject, b: SimilarityProject): number {
  if (a.slug === b.slug) return 0;

  const domainA = getProjectDomain(a);
  const domainB = getProjectDomain(b);

  // Domaines radicalement différents (ex: infrastructure pure vs boutique en ligne)
  const incompatibleDomains =
    (domainA === "infra" && domainB === "web") ||
    (domainA === "web" && domainB === "infra");

  let score = 0;

  // 1. Tag identique
  if (a.tag && b.tag && normalize(a.tag) === normalize(b.tag)) {
    score += 3;
  }

  // 2. Technologies exactes partagées (pondération forte)
  const aTechs = (a.technologies ?? []).map(normalize);
  const bTechs = (b.technologies ?? []).map(normalize);

  for (const tA of aTechs) {
    if (bTechs.includes(tA)) {
      score += 4;
      continue;
    }
    // Correspondance sous-technologie (ex: "next js react" vs "react")
    for (const tB of bTechs) {
      if (tA.includes(tB) || tB.includes(tA)) {
        score += 2;
        break;
      }
    }
  }

  // 3. Concepts techniques croisés via dictionnaire de synonymes
  const aTokens = new Set([
    ...tokenize(a.title),
    ...tokenize(a.tag),
    ...aTechs.flatMap((t) => tokenize(t)),
  ]);

  const bTokens = new Set([
    ...tokenize(b.title),
    ...tokenize(b.tag),
    ...bTechs.flatMap((t) => tokenize(t)),
  ]);

  for (const [canonical, variants] of Object.entries(CONCEPT_SYNONYMS)) {
    const aHas = variants.some((v) => aTokens.has(v));
    const bHas = variants.some((v) => bTokens.has(v));
    if (aHas && bHas) {
      score += 2;
    }
  }

  // 4. Domaine commun
  if (domainA !== "unknown" && domainA === domainB) {
    score += 2;
  } else if (incompatibleDomains) {
    // Si les domaines sont incompatibles, appliquer une forte pénalité
    score -= 6;
  }

  // Seuil strict : en dessous de 3, les projets ne sont pas considérés comme similaires
  return score >= 3 ? score : 0;
}

/**
 * Filtre et ordonne les projets similaires à un projet de référence.
 * Renvoie au maximum `limit` projets (par défaut 3), uniquement si score >= 3.
 */
export function getRelatedProjects<T extends SimilarityProject>(
  target: SimilarityProject,
  candidates: T[],
  limit = 3,
): { project: T; score: number }[] {
  return candidates
    .filter((p) => p.slug !== target.slug)
    .map((project, index) => ({
      project,
      index,
      score: calculateProjectSimilarity(target, project),
    }))
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ project, score }) => ({ project, score }));
}
