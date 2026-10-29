// Contenu structuré des études de cas : une liste de blocs JSON, jamais du HTML.

export type RichMark = { type: "bold" | "italic" | "link"; attrs?: { href?: string } };
export type RichNode = {
  type: string;
  text?: string | undefined;
  marks?: RichMark[] | undefined;
  content?: RichNode[] | undefined;
  attrs?: Record<string, unknown> | undefined;
};
export type RichDoc = { type: "doc"; content?: RichNode[] | undefined };

export type HeadingBlock = {
  id: string;
  type: "heading";
  text: string;
  /** "half" : deux sections consécutives s'affichent côte à côte. */
  layout?: "full" | "half" | undefined;
  /** "muted" : bande de fond grisée. */
  tone?: "plain" | "muted" | undefined;
  /** "steps" : sous-titres numérotés en colonnes ; "result" : conclusion avec coche. */
  variant?: "default" | "steps" | "result" | undefined;
};
export type SubheadingBlock = { id: string; type: "subheading"; text: string };
export type ParagraphBlock = { id: string; type: "paragraph"; doc: RichDoc };
export type ListBlock = { id: string; type: "list"; style?: "bullet" | "check" | "tags"; doc: RichDoc };
export type ImageBlock = { id: string; type: "image"; url: string; alt: string; title?: string; caption?: string; note?: string };
export type MediaItem = { id: string; url: string; alt: string; title?: string; caption?: string };
export type MediaBlock = {
  id: string;
  type: "media";
  title?: string;
  caption?: string;
  layout?: "grid" | "stacked";
  items: MediaItem[];
};
export type QuoteBlock = { id: string; type: "quote"; doc: RichDoc; cite?: string };
export type CodeBlock = { id: string; type: "code"; code: string; language?: string };
export type ButtonBlock = { id: string; type: "button"; label: string; url: string };
export type DividerBlock = { id: string; type: "divider" };

export type Block =
  | HeadingBlock | SubheadingBlock | ParagraphBlock | ListBlock | ImageBlock | MediaBlock
  | QuoteBlock | CodeBlock | ButtonBlock | DividerBlock;
export type BlockType = Block["type"];

export const blockLabels: Record<BlockType, string> = {
  heading: "Titre de section",
  subheading: "Sous-titre",
  paragraph: "Paragraphe",
  list: "Liste",
  media: "Médias & Explications (1 ou plusieurs)",
  image: "Image avec légende",
  quote: "Citation",
  code: "Bloc de code",
  button: "Bouton",
  divider: "Séparateur",
};

export function newId() {
  return "b" + Math.random().toString(36).slice(2, 12);
}

export const emptyDoc = (): RichDoc => ({ type: "doc", content: [{ type: "paragraph" }] });
export const textDoc = (text: string): RichDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : undefined }],
});
const listDoc = (): RichDoc => ({
  type: "doc",
  content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }],
});

/** Crée un RichDoc pour une liste d'éléments */
export const itemsToListDoc = (items: string[]): RichDoc => ({
  type: "doc",
  content: [
    {
      type: "bulletList",
      content: items.filter(Boolean).map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ],
});

/**
 * Convertit un titre et du texte de section en blocs riches Word :
 * - HeadingBlock (variant: "result" si résultat/impact/retour, "steps" si étapes/méthode, tone: "muted" si technique)
 * - QuoteBlock (si présence d'une citation ou témoignage [CITATION: ...] ou « ... » — Auteur)
 * - ListBlock (si présence de puces / coches / métriques)
 * - CodeBlock (si bloc de code technique)
 * - ParagraphBlock (pour la prose fluide)
 */
export function sectionTextToRichBlocks(title: string, rawContent: string): Block[] {
  const blocks: Block[] = [];
  const lowerTitle = title.toLowerCase();

  // 1. Titre avec options riches (variantes du traitement de texte Word)
  const isResult =
    lowerTitle.includes("résultat") ||
    lowerTitle.includes("impact") ||
    lowerTitle.includes("bilan") ||
    lowerTitle.includes("retour") ||
    lowerTitle.includes("témoignage");
  const isSteps =
    lowerTitle.includes("étape") ||
    lowerTitle.includes("méthod") ||
    lowerTitle.includes("déploiement") ||
    lowerTitle.includes("process");
  const isMuted =
    lowerTitle.includes("technique") ||
    lowerTitle.includes("architecture") ||
    lowerTitle.includes("infrastructure");

  const heading = createBlock("heading") as HeadingBlock;
  heading.text = title;
  heading.layout = "full";
  heading.tone = isMuted ? "muted" : "plain";
  heading.variant = isResult ? "result" : isSteps ? "steps" : "default";
  blocks.push(heading);

  // 2. Découper le contenu par blocs
  const chunks = rawContent
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    // A. Détection d'une balise explicite [CITATION: "..." — Auteur] ou [TEMOIGNAGE: "..." — Auteur]
    const quoteTagMatch = chunk.match(
      /^\[(?:CITATION|TÉMOIGNAGE|TEMOIGNAGE)\s*[:]\s*(?:["«“]([\s\S]+?)["»”]|([\s\S]+?))\s*(?:[—–|-]\s*([^\n]+))?\]$/i,
    );
    if (quoteTagMatch) {
      const quoteText = (quoteTagMatch[1] || quoteTagMatch[2] || "").trim();
      const cite = quoteTagMatch[3]?.trim();
      const qBlock = createBlock("quote") as QuoteBlock;
      qBlock.doc = textDoc(quoteText);
      qBlock.cite = cite || "";
      blocks.push(qBlock);
      continue;
    }

    // B. Détection d'une citation naturelle entre guillemets avec tiret d'auteur : "Texte..." — Auteur
    const quoteNaturalMatch = chunk.match(
      /^(?:["«“]([\s\S]+?)["»”]|> ([\s\S]+?))\s*(?:(?:\n|\s)[—–-]\s*([^\n]+))$/,
    );
    if (quoteNaturalMatch) {
      const quoteText = (quoteNaturalMatch[1] || quoteNaturalMatch[2] || "").trim();
      const cite = quoteNaturalMatch[3]?.trim();
      if (quoteText.length > 10) {
        const qBlock = createBlock("quote") as QuoteBlock;
        qBlock.doc = textDoc(quoteText);
        qBlock.cite = cite || "";
        blocks.push(qBlock);
        continue;
      }
    }

    // C. Détection d'un bloc de code ```lang ... ```
    const codeMatch = chunk.match(/^```(\w+)?\n([\s\S]*?)```$/);
    if (codeMatch) {
      const cBlock = createBlock("code") as CodeBlock;
      cBlock.language = codeMatch[1] || "";
      cBlock.code = codeMatch[2].trim();
      blocks.push(cBlock);
      continue;
    }

    // D. Détection d'une liste explicite [LISTE: check|bullet] ou liste de puces consécutives
    const listTagMatch = chunk.match(/^\[LISTE(?:\s*[:]\s*(check|bullet|tags))?\]\s*([\s\S]*)$/i);
    if (listTagMatch) {
      const style = (listTagMatch[1]?.toLowerCase() as "check" | "bullet" | "tags") || "bullet";
      const items = listTagMatch[2]
        .split("\n")
        .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
        .filter(Boolean);
      if (items.length > 0) {
        const lBlock = createBlock("list") as ListBlock;
        lBlock.style = style;
        lBlock.doc = itemsToListDoc(items);
        blocks.push(lBlock);
        continue;
      }
    }

    // E. Lignes de puces ordinaires (au moins 2 lignes commençant par • ou - ou *)
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const isBulletList = lines.length >= 2 && lines.every((l) => /^[-*•\u2022]\s+/.test(l));
    if (isBulletList) {
      const items = lines.map((l) => l.replace(/^[-*•\u2022]\s+/, "").trim());
      const lBlock = createBlock("list") as ListBlock;
      lBlock.style = "bullet";
      lBlock.doc = itemsToListDoc(items);
      blocks.push(lBlock);
      continue;
    }

    // F. Par défaut : paragraphe classique
    const pBlock = createBlock("paragraph") as ParagraphBlock;
    pBlock.doc = textDoc(chunk);
    blocks.push(pBlock);
  }

  return blocks;
}

export function createBlock(type: BlockType): Block {
  const id = newId();
  switch (type) {
    case "heading": return { id, type, text: "", layout: "full", tone: "plain", variant: "default" };
    case "subheading": return { id, type, text: "" };
    case "paragraph": return { id, type, doc: emptyDoc() };
    case "list": return { id, type, style: "bullet", doc: listDoc() };
    case "media": return {
      id,
      type,
      title: "",
      caption: "",
      layout: "grid",
      items: [{ id: newId(), url: "", alt: "", title: "", caption: "" }],
    };
    case "image": return { id, type, url: "", alt: "", title: "", caption: "", note: "" };
    case "quote": return { id, type, doc: emptyDoc(), cite: "" };
    case "code": return { id, type, code: "", language: "" };
    case "button": return { id, type, label: "", url: "" };
    case "divider": return { id, type };
  }
}

/** Modèle de départ guidé, entièrement modifiable et supprimable. */
export function starterTemplate(): Block[] {
  const section = (text: string, hint: string, extra: Partial<HeadingBlock> = {}): Block[] => [
    { id: newId(), type: "heading", text, layout: "full", tone: "plain", variant: "default", ...extra },
    { id: newId(), type: "paragraph", doc: textDoc(hint) },
  ];
  return [
    ...section("Contexte", "Présentez l'organisation et la situation de départ.", { layout: "half" }),
    ...section("Problème", "Quel besoin ou quelle difficulté fallait-il résoudre ?", { layout: "half" }),
    ...section("Solution", "Décrivez la solution mise en place.", { tone: "muted" }),
    ...section("Mon rôle", "Qu'avez-vous réalisé personnellement ?"),
    { id: newId(), type: "heading", text: "Technologies", layout: "full", tone: "plain", variant: "default" },
    { id: newId(), type: "list", style: "tags", doc: listDoc() },
    ...section("Résultats", "Quels résultats concrets le projet a-t-il apportés ?", { variant: "result" }),
  ];
}

/** N'autorise que les liens web, e-mail, téléphone ou internes. */
export function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (u.startsWith("#")) return u;
  try {
    const parsed = new URL(u);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Texte brut d'un nœud riche (pour les étiquettes, la recherche, etc.). */
export function nodeText(node: RichNode | RichDoc | undefined): string {
  if (!node) return "";
  if ("text" in node && typeof node.text === "string") return node.text;
  return (node.content ?? []).map(nodeText).join(node.type === "doc" ? "\n" : "");
}

/** Éléments d'une liste (un par puce). */
export function listItems(doc: RichDoc): RichNode[] {
  const out: RichNode[] = [];
  for (const n of doc.content ?? []) {
    if (n.type === "bulletList" || n.type === "orderedList") out.push(...(n.content ?? []));
  }
  return out;
}

/** Validation défensive d'un contenu venu de la base. */
export function parseBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return [];
  return value.filter((b): b is Block => !!b && typeof b === "object" && typeof (b as Block).type === "string" && typeof (b as Block).id === "string" && (b as Block).type in blockLabels);
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
