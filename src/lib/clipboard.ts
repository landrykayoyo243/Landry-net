/**
 * Utilitaire fiable pour copier du texte dans le presse-papiers avec repli (fallback).
 * Fonctionne même en contexte HTTP local, fenêtres non focalisées ou navigateurs stricts.
 */
export async function copyToClipboard(rawText: string): Promise<boolean> {
  if (!rawText) return false;

  // Nettoyage : retirer les blocs techniques d'action s'ils existent
  const cleanText = rawText
    .replace(/```action:[a-z0-9_-]+\s*[\s\S]*?```/gi, "")
    .trim();

  if (!cleanText) return false;

  // 1. Essai avec l'API standard moderne
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(cleanText);
      return true;
    } catch {
      // Échec de l'API standard (ex: non-HTTPS ou permission rejetée), passage au repli
    }
  }

  // 2. Repli éprouvé via textarea masqué + execCommand('copy')
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = cleanText;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch (err) {
      console.warn("[copyToClipboard] Le repli execCommand a échoué :", err);
      return false;
    }
  }

  return false;
}
