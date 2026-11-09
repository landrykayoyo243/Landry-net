import DOMPurify from "dompurify";
import type { Block, HeadingBlock, MediaBlock, RichDoc, RichNode } from "./blocks";

export interface ProjectGalleryItem {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
}

export interface ProjectContentPayload {
  version: 2;
  html: string;
  gallery?: ProjectGalleryItem[];
  github_url?: string;
  seo_title?: string;
  seo_description?: string;
}

export interface NormalizedProjectContent {
  html: string;
  gallery: ProjectGalleryItem[];
  github_url: string;
  seo_title: string;
  seo_description: string;
  isLegacyBlocks: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function richNodesToHtml(nodes?: RichNode[]): string {
  if (!nodes || !Array.isArray(nodes)) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") {
        let text = escapeHtml(node.text ?? "");
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") text = `<strong>${text}</strong>`;
            if (mark.type === "italic") text = `<em>${text}</em>`;
            if (mark.type === "link" && mark.attrs?.href) {
              const safeHref = escapeHtml(String(mark.attrs.href));
              text = `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
          }
        }
        return text;
      }
      if (node.type === "paragraph") {
        return `<p>${richNodesToHtml(node.content)}</p>`;
      }
      if (node.type === "bulletList") {
        return `<ul>${(node.content ?? []).map((li) => `<li>${richNodesToHtml(li.content)}</li>`).join("")}</ul>`;
      }
      if (node.type === "orderedList") {
        return `<ol>${(node.content ?? []).map((li) => `<li>${richNodesToHtml(li.content)}</li>`).join("")}</ol>`;
      }
      if (node.type === "listItem") {
        return richNodesToHtml(node.content);
      }
      return "";
    })
    .join("");
}

export function richDocToHtml(doc?: RichDoc): string {
  if (!doc || !doc.content) return "";
  return richNodesToHtml(doc.content);
}

/**
 * Convertit des blocs JSON historiques en HTML sémantique propre.
 */
export function legacyBlocksToHtml(blocks: Block[]): { html: string; gallery: ProjectGalleryItem[] } {
  const htmlParts: string[] = [];
  const gallery: ProjectGalleryItem[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const h = block as HeadingBlock;
        htmlParts.push(`<h2>${escapeHtml(h.text)}</h2>`);
        break;
      }
      case "subheading": {
        htmlParts.push(`<h3>${escapeHtml(block.text)}</h3>`);
        break;
      }
      case "paragraph": {
        const pContent = richDocToHtml(block.doc);
        if (pContent) {
          htmlParts.push(pContent.startsWith("<p>") ? pContent : `<p>${pContent}</p>`);
        }
        break;
      }
      case "list": {
        const listContent = richDocToHtml(block.doc);
        if (listContent) htmlParts.push(listContent);
        break;
      }
      case "image": {
        if (block.url) {
          const alt = escapeHtml(block.alt || block.title || "");
          const cap = block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : "";
          htmlParts.push(`<figure><img src="${escapeHtml(block.url)}" alt="${alt}" />${cap}</figure>`);
          gallery.push({
            id: block.id,
            url: block.url,
            alt: block.alt,
            title: block.title,
            caption: block.caption,
          });
        }
        break;
      }
      case "media": {
        const mb = block as MediaBlock;
        if (mb.title) htmlParts.push(`<h3>${escapeHtml(mb.title)}</h3>`);
        if (mb.caption) htmlParts.push(`<p>${escapeHtml(mb.caption)}</p>`);
        if (mb.items && mb.items.length > 0) {
          for (const item of mb.items) {
            if (item.url) {
              const alt = escapeHtml(item.alt || item.title || "");
              const cap = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : "";
              htmlParts.push(`<figure><img src="${escapeHtml(item.url)}" alt="${alt}" />${cap}</figure>`);
              gallery.push({
                id: item.id,
                url: item.url,
                alt: item.alt,
                title: item.title,
                caption: item.caption,
              });
            }
          }
        }
        break;
      }
      case "quote": {
        const qContent = richDocToHtml(block.doc);
        const cite = block.cite ? `<cite>— ${escapeHtml(block.cite)}</cite>` : "";
        htmlParts.push(`<blockquote>${qContent}${cite}</blockquote>`);
        break;
      }
      case "code": {
        htmlParts.push(`<pre><code>${escapeHtml(block.code)}</code></pre>`);
        break;
      }
      case "button": {
        if (block.url && block.label) {
          htmlParts.push(
            `<p><a href="${escapeHtml(block.url)}" target="_blank" rel="noopener noreferrer" class="project-btn">${escapeHtml(block.label)}</a></p>`
          );
        }
        break;
      }
      case "divider": {
        htmlParts.push("<hr />");
        break;
      }
    }
  }

  return { html: htmlParts.join("\n"), gallery };
}

/**
 * Normalise le contenu venant de Supabase (qu'il soit un tableau de blocs legacy ou un objet de version 2).
 */
export function normalizeProjectContent(raw: unknown): NormalizedProjectContent {
  if (!raw) {
    return {
      html: "",
      gallery: [],
      github_url: "",
      seo_title: "",
      seo_description: "",
      isLegacyBlocks: false,
    };
  }

  // Cas 1 : Déjà au format objet v2 ou avec champ html
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const html = typeof obj["html"] === "string" ? obj["html"] : "";
    const gallery = Array.isArray(obj["gallery"])
      ? (obj["gallery"] as ProjectGalleryItem[]).filter((g) => g && typeof g.url === "string")
      : [];
    const github_url = typeof obj["github_url"] === "string" ? obj["github_url"] : "";
    const seo_title = typeof obj["seo_title"] === "string" ? obj["seo_title"] : "";
    const seo_description = typeof obj["seo_description"] === "string" ? obj["seo_description"] : "";

    return {
      html,
      gallery,
      github_url,
      seo_title,
      seo_description,
      isLegacyBlocks: false,
    };
  }

  // Cas 2 : Tableau de blocs JSON legacy
  if (Array.isArray(raw)) {
    const { html, gallery } = legacyBlocksToHtml(raw as Block[]);
    return {
      html,
      gallery,
      github_url: "",
      seo_title: "",
      seo_description: "",
      isLegacyBlocks: true,
    };
  }

  // Cas 3 : Chaîne brute HTML directe
  if (typeof raw === "string") {
    return {
      html: raw,
      gallery: [],
      github_url: "",
      seo_title: "",
      seo_description: "",
      isLegacyBlocks: false,
    };
  }

  return {
    html: "",
    gallery: [],
    github_url: "",
    seo_title: "",
    seo_description: "",
    isLegacyBlocks: false,
  };
}

/**
 * Nettoyage et sécurisation strictes du HTML contre les injections XSS.
 * Préserve les éléments sémantiques, les balises multimédias et les styles de base.
 */
export function sanitizeProjectHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return "";

  // Si window est disponible (navigateur client ou environnement JSDOM de test)
  if (typeof window !== "undefined" && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "br", "hr",
        "strong", "b", "em", "i", "u", "s", "del", "strike", "mark", "code", "pre",
        "blockquote", "cite",
        "ul", "ol", "li",
        "table", "thead", "tbody", "tfoot", "tr", "th", "td",
        "figure", "figcaption", "img",
        "a",
        "div", "span",
        "iframe",
      ],
      ALLOWED_ATTR: [
        "href", "target", "rel",
        "src", "alt", "title", "width", "height", "loading",
        "class", "style", "data-align", "data-size",
        "frameborder", "allowfullscreen", "allow",
        "colspan", "rowspan",
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      ADD_ATTR: ["target", "rel"],
    });
  }

  // Repli défensif pour SSR sans DOM : neutralisation stricte de script, événements on* et javascript:
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
}
