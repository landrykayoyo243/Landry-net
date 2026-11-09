import { describe, expect, it } from "vitest";
import { estimateReadingTime } from "../lib/blog-data";
import {
  normalizeBlogContent,
  appendSignatureIfMissing,
  removeCoverImageFromHtml,
  stripSignatureFromHtml,
} from "../lib/blog-content";
import { BLOG_SIGNATURE_HTML } from "../components/LandrySignature";
import { buildBlogPostSchema, buildBlogIndexSchema } from "../lib/seo";

describe("Blog System - Unit & Integration Tests", () => {
  it("calcule correctement le temps de lecture estimé", () => {
    // 400 mots ~ 2 minutes
    const words = Array.from({ length: 400 }, (_, i) => `mot${i}`).join(" ");
    const html = `<p>${words}</p>`;
    expect(estimateReadingTime(html)).toBe(2);

    // Court texte ~ 1 minute minimum
    expect(estimateReadingTime("<p>Court texte.</p>")).toBe(1);
    expect(estimateReadingTime("")).toBe(1);
  });

  it("normalise correctement le contenu d'un article de blog", () => {
    const raw = {
      version: 2,
      html: "<h2>Titre</h2><p>Contenu technique</p>",
      seo_title: "Mon Titre SEO",
      seo_description: "Description pour Google",
    };
    const norm = normalizeBlogContent(raw);
    expect(norm.html).toContain("<h2>Titre</h2>");
    expect(norm.seo_title).toBe("Mon Titre SEO");
    expect(norm.seo_description).toBe("Description pour Google");
  });

  it("retire du corps l'image choisie comme couverture, sans supprimer les autres images", () => {
    const html =
      '<p><img src="https://cdn.example.com/portrait.jpg?width=900" alt="Portrait"></p>' +
      '<img src="https://cdn.example.com/other.jpg" alt="Autre image">';

    const result = removeCoverImageFromHtml(html, "https://cdn.example.com/portrait.jpg");

    expect(result).not.toContain("portrait.jpg");
    expect(result).toContain("other.jpg");
  });

  it("retire une figure de couverture avec sa légende et gère les URL HTML échappées", () => {
    const html =
      '<figure><img src="https://cdn.example.com/photo.jpg?a=1&amp;b=2" alt="Photo"><figcaption>Photo</figcaption></figure>';

    expect(removeCoverImageFromHtml(html, "https://cdn.example.com/photo.jpg?cache=1")).toBe("");
  });

  it("retire une balise img nue ou avec classes correspondant à la couverture", () => {
    const coverUrl = "https://res.cloudinary.com/hdprt0zu/image/upload/v1794241599/Landry_Media/projets/vitvmjd5gqzbiyqjbret.webp";
    const html = `<img class="rounded-xl border border-border shadow-sm my-4" src="${coverUrl}" alt="Portrait studio"><h1>Titre de l'article</h1><p>Contenu principal</p>`;
    const cleaned = removeCoverImageFromHtml(html, coverUrl);
    expect(cleaned).not.toContain("vitvmjd5gqzbiyqjbret.webp");
    expect(cleaned).toContain("<h1>Titre de l'article</h1>");
  });

  it("retire proprement la signature HTML embarquée pour éviter les doublons", () => {
    const html = `<p>Fin du texte.</p><div class="landry-signature" style="text-align: right; padding: 12px;"><span style="font-family: 'Segoe Script', cursive;">Landry Net</span></div>`;
    const stripped = stripSignatureFromHtml(html);
    expect(stripped).toBe("<p>Fin du texte.</p>");
    expect(stripped).not.toContain("Landry Net");
  });

  it("ajoute automatiquement la signature Landry Net si absente", () => {
    const html = "<h2>Conclusion</h2><p>Merci de m'avoir lu.</p>";
    const withSignature = appendSignatureIfMissing(html);
    expect(withSignature).toContain("Landry Net</span>");
    expect(withSignature).toContain("landry-signature");

    // Ne duplique pas si déjà présente
    const already = appendSignatureIfMissing(withSignature);
    expect(already.match(/landry-signature/g)?.length).toBe(1);
  });

  it("génère les données structurées Schema.org BlogPosting valides", () => {
    const post = {
      title: "Sécurisation Réseau Cisco",
      slug: "securisation-reseau-cisco",
      summary: "Tutoriel complet sur les ACL et le port-security.",
      cover_url: "https://example.com/cover.jpg",
      published_at: "2026-11-09T10:00:00Z",
      category: "Cybersécurité",
      tags: ["cisco", "securite"],
      reading_time: 5,
    };
    const schema = buildBlogPostSchema(post);
    expect(schema["@type"]).toBe("BlogPosting");
    expect(schema.headline).toBe("Sécurisation Réseau Cisco");
    expect(schema.articleSection).toBe("Cybersécurité");
    expect(schema.timeRequired).toBe("PT5M");
  });

  it("génère les données structurées Schema.org Blog valides pour l'index", () => {
    const schema = buildBlogIndexSchema();
    expect(schema["@type"]).toBe("Blog");
    expect(schema.name).toBe("Blog technique — Landry Net");
    expect(schema.url).toContain("/blog");
  });
});
