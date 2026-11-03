import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Header } from "@/components/portfolio/Header";
import { Footer } from "@/components/portfolio/Footer";
import { ContactForm } from "@/components/portfolio/ContactForm";
import { profile, shareImage } from "@/content/portfolio";
import { absoluteUrl } from "@/lib/siteConfig";
import { buildBreadcrumbSchema } from "@/lib/seo";

const TITLE = "Contact — Landry Kayoyo | Systèmes, Réseaux & Web à Lubumbashi";
const DESC =
  "Contactez Landry Kayoyo pour vos besoins en administration systèmes, réseaux, cybersécurité ou développement d'applications web. Échangeons via WhatsApp ou email.";
const KEYWORDS =
  "Contact Landry Kayoyo, Recruter administrateur réseau Lubumbashi, Développeur web RDC contact, WhatsApp Landry Kayoyo";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "keywords", content: KEYWORDS },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/contact") },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: shareImage.url },
      { property: "og:image:secure_url", content: shareImage.url },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: String(shareImage.width) },
      { property: "og:image:height", content: String(shareImage.height) },
      { property: "og:image:alt", content: shareImage.alt },
      { name: "twitter:image", content: shareImage.url },
      { name: "twitter:image:alt", content: shareImage.alt },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contact") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbSchema([
            { name: "Accueil", path: "/" },
            { name: "Contact", path: "/contact" },
          ])
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: TITLE,
          description: DESC,
          url: absoluteUrl("/contact"),
        }),
      },
    ],
  }),
  component: ContactPage,
});

const focus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ContactPage() {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col justify-between">
      <Header />

      <main className="page-enter pt-24 md:pt-32 pb-20 md:pb-28 flex-1">
        <div className="mx-auto w-full max-w-2xl px-5 md:px-8">
          {/* Bouton retour épuré */}
          <Link
            to="/"
            className={`mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40 ${focus}`}
          >
            <ArrowLeft size={14} /> Retour à l'accueil
          </Link>

          {/* En-tête sobre et direct */}
          <div className="mb-8">
            <div className="mb-3 inline-flex items-center gap-3 text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              <span className="h-[1.5px] w-6 rounded-full bg-primary/80 inline-block" />
              <span>Contact</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal leading-tight tracking-tight text-foreground">
              Démarrer une collaboration
            </h1>

            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Décrivez votre besoin technique ou votre projet. Je vous réponds personnellement sous 24h.
            </p>
          </div>

          {/* Formulaire dans une carte centrale propre */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-9 shadow-sm">
            <ContactForm />
          </div>

          {/* Note discrète WhatsApp en bas */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Une question urgente ?{" "}
              <a
                href={profile.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:underline inline-inline-flex items-center gap-1"
              >
                <MessageSquare size={13} className="inline mr-1" />
                Écrivez-moi sur WhatsApp
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
