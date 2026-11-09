import { describe, it, expect } from "vitest";
import {
  normalizeProjectContent,
  legacyBlocksToHtml,
  sanitizeProjectHtml,
} from "@/lib/project-content";
import type { Block } from "@/lib/blocks";

describe("Project Editor - Content & Conversion System", () => {
  it("1. Normalise correctement un projet avec contenu au format v2 (HTML)", () => {
    const v2Content = {
      version: 2,
      html: "<h2>Architecture Haute Disponibilité</h2><p>Explications détaillées...</p>",
      github_url: "https://github.com/landry/cluster-ha",
      seo_title: "Cluster Haute Disponibilité",
      seo_description: "Étude de cas complète sur l'architecture cluster.",
      gallery: [
        { id: "g1", url: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg", caption: "Schéma" },
      ],
    };

    const normalized = normalizeProjectContent(v2Content);
    expect(normalized.isLegacyBlocks).toBe(false);
    expect(normalized.html).toContain("Architecture Haute Disponibilité");
    expect(normalized.github_url).toBe("https://github.com/landry/cluster-ha");
    expect(normalized.seo_title).toBe("Cluster Haute Disponibilité");
    expect(normalized.gallery.length).toBe(1);
  });

  it("2. Convertit automatiquement les anciens blocs JSON legacy en HTML sémantique sans perte", () => {
    const legacyBlocks: Block[] = [
      {
        id: "b1",
        type: "heading",
        text: "Contexte et objectifs",
      },
      {
        id: "b2",
        type: "paragraph",
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Premier paragraphe avec du " },
                { type: "text", text: "texte en gras", marks: [{ type: "bold" }] },
                { type: "text", text: " et de l'" },
                { type: "text", text: "italique", marks: [{ type: "italic" }] },
                { type: "text", text: "." },
              ],
            },
          ],
        },
      },
      {
        id: "b3",
        type: "image",
        url: "https://res.cloudinary.com/demo/image/upload/v1/diagram.png",
        alt: "Schéma d'architecture",
        caption: "Figure 1 : Schéma réseau",
      },
      {
        id: "b4",
        type: "quote",
        doc: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "La résilience est la clé." }],
            },
          ],
        },
        cite: "Architecte Système",
      },
      {
        id: "b5",
        type: "code",
        code: "pacemaker status",
      },
      {
        id: "b6",
        type: "divider",
      },
    ];

    const normalized = normalizeProjectContent(legacyBlocks);
    expect(normalized.isLegacyBlocks).toBe(true);

    // Vérification du HTML généré
    expect(normalized.html).toContain("<h2>Contexte et objectifs</h2>");
    expect(normalized.html).toContain("<strong>texte en gras</strong>");
    expect(normalized.html).toContain("<em>italique</em>");
    expect(normalized.html).toContain('<img src="https://res.cloudinary.com/demo/image/upload/v1/diagram.png" alt="Schéma d&#039;architecture" />');
    expect(normalized.html).toContain("<figcaption>Figure 1 : Schéma réseau</figcaption>");
    expect(normalized.html).toContain("<blockquote><p>La résilience est la clé.</p><cite>— Architecte Système</cite></blockquote>");
    expect(normalized.html).toContain("<pre><code>pacemaker status</code></pre>");
    expect(normalized.html).toContain("<hr />");

    // L'image a été ajoutée à la galerie pour réutilisation
    expect(normalized.gallery.length).toBe(1);
    expect(normalized.gallery[0].url).toBe("https://res.cloudinary.com/demo/image/upload/v1/diagram.png");
  });

  it("3. Assainit et neutralise les attaques XSS tout en autorisant les balises sémantiques", () => {
    const maliciousHtml = `
      <h2>Titre valide</h2>
      <p>Texte normal</p>
      <script>alert('xss')</script>
      <img src="https://example.com/pic.jpg" onerror="alert('hack')" alt="safe" />
      <a href="javascript:alert('pwned')">Cliquez ici</a>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allowfullscreen></iframe>
    `;

    const sanitized = sanitizeProjectHtml(maliciousHtml);
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("alert('xss')");
    expect(sanitized).not.toContain("onerror=");
    expect(sanitized).not.toContain("javascript:");

    // Balises sécurisées préservées
    expect(sanitized).toContain("<h2>Titre valide</h2>");
    expect(sanitized).toContain("<p>Texte normal</p>");
    expect(sanitized).toContain('src="https://example.com/pic.jpg"');
    expect(sanitized).toContain('iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"');
  });
});
