export interface FormatHtmlOptions {
  indentSize?: number;
  maxTagLength?: number;
}

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

const BLOCK_ELEMENTS = new Set([
  "address", "article", "aside", "blockquote", "canvas", "dd", "div",
  "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main",
  "nav", "noscript", "ol", "p", "pre", "section", "table", "tfoot",
  "ul", "video", "thead", "tbody", "tr", "th", "td", "iframe"
]);

/**
 * Formate et indente proprement une chaîne HTML pour un affichage lisible dans l'éditeur de code,
 * en organisant les balises blocs sur des lignes distinctes et en ventilant les balises avec
 * de multiples attributs (comme <img> avec classes et URLs Cloudinary) sur plusieurs lignes.
 */
export function formatHtml(html: string, options: FormatHtmlOptions = {}): string {
  if (!html || typeof html !== "string") return "";

  const indentSize = options.indentSize ?? 2;
  const maxTagLength = options.maxTagLength ?? 65;
  const indentStr = " ".repeat(indentSize);

  // Sauvegarde préalable du contenu des balises <pre> pour préserver leur indentation littérale
  const prePlaceholders: string[] = [];
  let processed = html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (match) => {
    const idx = prePlaceholders.length;
    prePlaceholders.push(match);
    return `___PRE_PLACEHOLDER_${idx}___`;
  });

  // Nettoyage des espaces superflus entre les balises
  processed = processed
    .replace(/\r\n/g, "\n")
    .replace(/>\s+</g, "><")
    .trim();

  if (!processed) return "";

  function formatTag(tagStr: string, currentIndent: string): string {
    const isClosing = tagStr.startsWith("</");
    if (isClosing) {
      return currentIndent + tagStr;
    }

    const match = tagStr.match(/^<([a-zA-Z0-9\-]+)([\s\S]*?)(\/?)>$/);
    if (!match) return currentIndent + tagStr;

    const [, tagName, attrsStr, selfSlash] = match;
    const isSelfClosing = Boolean(selfSlash) || VOID_ELEMENTS.has(tagName.toLowerCase());
    const trimmedAttrs = attrsStr.trim();

    if (!trimmedAttrs) {
      const close = isSelfClosing ? " />" : ">";
      return `${currentIndent}<${tagName}${close}`;
    }

    // Extraction précise des attributs (supportant les valeurs entre guillemets doubles, simples ou nues)
    const attrRegex = /([a-zA-Z0-9\-:]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    const attrs: string[] = [];
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRegex.exec(trimmedAttrs)) !== null) {
      attrs.push(attrMatch[0]);
    }

    // Si la balise est courte et n'a qu'un seul attribut, on la garde sur une seule ligne
    const oneLine = `${currentIndent}<${tagName} ${attrs.join(" ")}${isSelfClosing ? " />" : ">"}`;
    if (oneLine.length <= maxTagLength && attrs.length <= 1) {
      return oneLine;
    }

    // Balise longue ou avec plusieurs attributs : chaque attribut sur sa propre ligne indentée
    const attrIndent = currentIndent + indentStr;
    const formattedAttrs = attrs.map((a) => `${attrIndent}${a}`).join("\n");
    const close = isSelfClosing ? `\n${currentIndent}/>` : `\n${currentIndent}>`;

    return `${currentIndent}<${tagName}\n${formattedAttrs}${close}`;
  }

  // Tokenisation du HTML
  const tokens: Array<{
    type: "open" | "close" | "self" | "comment" | "text" | "placeholder";
    raw: string;
    tagName: string;
  }> = [];

  const tokenRegex = /(<!--[\s\S]*?-->)|(___PRE_PLACEHOLDER_\d+___)|(<(?:\/)?[a-zA-Z0-9\-]+(?:[^>'"]*|'[^']*'|"[^"]*")*>)|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = tokenRegex.exec(processed)) !== null) {
    const [, comment, placeholder, tag, text] = m;
    if (comment) {
      tokens.push({ type: "comment", raw: comment, tagName: "" });
    } else if (placeholder) {
      tokens.push({ type: "placeholder", raw: placeholder, tagName: "pre" });
    } else if (tag) {
      const isClosing = tag.startsWith("</");
      const isSelfClosing = tag.endsWith("/>");
      const tagMatch = tag.match(/<\/?([a-zA-Z0-9\-]+)/);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : "";

      if (isClosing) {
        tokens.push({ type: "close", raw: tag, tagName });
      } else if (isSelfClosing || VOID_ELEMENTS.has(tagName)) {
        tokens.push({ type: "self", raw: tag, tagName });
      } else {
        tokens.push({ type: "open", raw: tag, tagName });
      }
    } else if (text) {
      tokens.push({ type: "text", raw: text, tagName: "" });
    }
  }

  const lines: string[] = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isBlock = BLOCK_ELEMENTS.has(token.tagName);

    if (token.type === "placeholder") {
      const matchIdx = token.raw.match(/___PRE_PLACEHOLDER_(\d+)___/);
      if (matchIdx) {
        const originalPre = prePlaceholders[parseInt(matchIdx[1], 10)];
        if (depth === 0 && lines.length > 0 && lines[lines.length - 1] !== "") {
          lines.push("");
        }
        lines.push(originalPre);
      }
      continue;
    }

    if (token.type === "open") {
      // Analyse si l'élément contient uniquement du texte ou des éléments inline sans blocs imbriqués
      let j = i + 1;
      let inlineHtml = "";
      let hasBlockChild = false;

      while (j < tokens.length) {
        if (tokens[j].type === "close" && tokens[j].tagName === token.tagName) {
          break;
        }
        if (BLOCK_ELEMENTS.has(tokens[j].tagName) || tokens[j].tagName === "img" || tokens[j].tagName === "hr" || tokens[j].type === "placeholder") {
          hasBlockChild = true;
          break;
        }
        inlineHtml += tokens[j].raw;
        j++;
      }

      const currentIndent = indentStr.repeat(depth);

      if (!hasBlockChild && j < tokens.length && tokens[j].type === "close" && tokens[j].tagName === token.tagName) {
        const cleanContent = inlineHtml.replace(/\s+/g, " ").trim();
        const shortSingleLine = `${currentIndent}<${token.tagName}>${cleanContent}</${token.tagName}>`;

        if (token.raw === `<${token.tagName}>` && shortSingleLine.length <= maxTagLength) {
          if (isBlock && depth === 0 && lines.length > 0 && lines[lines.length - 1] !== "") {
            lines.push("");
          }
          lines.push(shortSingleLine);
          i = j;
          continue;
        } else {
          if (isBlock && depth === 0 && lines.length > 0 && lines[lines.length - 1] !== "") {
            lines.push("");
          }
          lines.push(formatTag(token.raw, currentIndent));
          if (cleanContent) {
            lines.push(`${currentIndent}${indentStr}${cleanContent}`);
          }
          lines.push(`${currentIndent}</${token.tagName}>`);
          i = j;
          continue;
        }
      }

      // Élément conteneur avec sous-blocs
      if (isBlock && depth === 0 && lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      lines.push(formatTag(token.raw, currentIndent));
      depth++;
    } else if (token.type === "close") {
      depth = Math.max(0, depth - 1);
      const currentIndent = indentStr.repeat(depth);
      lines.push(`${currentIndent}</${token.tagName}>`);
    } else if (token.type === "self") {
      if ((isBlock || token.tagName === "img" || token.tagName === "hr") && depth === 0 && lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      const currentIndent = indentStr.repeat(depth);
      lines.push(formatTag(token.raw, currentIndent));
    } else if (token.type === "comment") {
      const currentIndent = indentStr.repeat(depth);
      lines.push(`${currentIndent}${token.raw.trim()}`);
    } else if (token.type === "text") {
      const currentIndent = indentStr.repeat(depth);
      const text = token.raw.replace(/\s+/g, " ").trim();
      if (text) {
        lines.push(`${currentIndent}${text}`);
      }
    }
  }

  return lines.join("\n");
}
