import { describe, it, expect } from "vitest";
import { formatHtml } from "@/lib/formatHtml";

describe("formatHtml", () => {
  it("formate proprement une balise img longue sur plusieurs lignes indentées", () => {
    const input =
      '<img class="rounded-xl border border-border shadow-sm my-4" src="https://res.cloudinary.com/hdprt0zu/image/upload/v1741517000/my-pic.jpg" alt="Photo de projet">';
    const output = formatHtml(input);

    expect(output).toContain("<img");
    expect(output).toContain('class="rounded-xl border border-border shadow-sm my-4"');
    expect(output).toContain('src="https://res.cloudinary.com/hdprt0zu/image/upload/v1741517000/my-pic.jpg"');
    expect(output).toContain('alt="Photo de projet"');
    expect(output).toContain("/>");
    // Ne doit pas être sur une seule ligne
    expect(output.split("\n").length).toBeGreaterThan(1);
  });

  it("sépare proprement les balises blocs (h2, p, figure, listes)", () => {
    const input =
      '<h2>Titre</h2><p>Paragraphe court</p><figure><img src="https://example.com/a.jpg" alt="test"/><figcaption>Légende</figcaption></figure>';
    const output = formatHtml(input);

    expect(output).toContain("<h2>Titre</h2>");
    expect(output).toContain("<p>Paragraphe court</p>");
    expect(output).toContain("<figure>");
    expect(output).toContain("</figure>");
    expect(output.split("\n").length).toBeGreaterThanOrEqual(4);
  });

  it("préserve le code indenté dans les balises <pre>", () => {
    const input = '<pre><code>function test() {\n  return 42;\n}</code></pre>';
    const output = formatHtml(input);

    expect(output).toContain('function test() {\n  return 42;\n}');
  });
});
