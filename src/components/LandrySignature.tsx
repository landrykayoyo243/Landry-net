import { cn } from "@/lib/utils";

interface LandrySignatureProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const fontSizes = {
  sm: "28px",
  md: "36px",
  lg: "42px",
};

/**
 * Signature cursive officielle de Landry Net.
 * Réutilisable dans les articles de blog, newsletters, emails et documents.
 */
export function LandrySignature({ className, size = "lg" }: LandrySignatureProps) {
  return (
    <div
      className={cn("w-full text-right py-3 select-none", className)}
      style={{ textAlign: "right", padding: "12px" }}
    >
      <span
        style={{
          fontFamily: "'Segoe Script', 'Brush Script MT', cursive",
          fontSize: fontSizes[size],
          fontWeight: 600,
          fontStyle: "italic",
          letterSpacing: "-2px",
          color: "#1d4ed8",
          textShadow: "1px 1px 1px rgba(29,78,216,0.12)",
          display: "inline-block",
        }}
      >
        Landry Net
      </span>
    </div>
  );
}

/** Code HTML brut de la signature pour insertion automatique dans les contenus */
export const BLOG_SIGNATURE_HTML = `<div class="landry-signature" style="text-align: right; padding: 12px; margin-top: 2rem; border-top: 1px solid rgba(0,0,0,0.08);">
  <span style="font-family: 'Segoe Script', 'Brush Script MT', cursive; font-size: 42px; font-weight: 600; font-style: italic; letter-spacing: -2px; color: #1d4ed8; text-shadow: 1px 1px 1px rgba(29,78,216,0.12);">Landry Net</span>
</div>`;
