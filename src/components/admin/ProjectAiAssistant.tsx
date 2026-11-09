import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  Wand2,
  Lightbulb,
  FileText,
  Send,
  Bot,
  Copy,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Server,
  Layers,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi, type AiSkill } from "@/lib/admin-api-client";
import {
  createBlock,
  textDoc,
  nodeText,
  sectionTextToRichBlocks,
  type Block,
  type HeadingBlock,
  type ParagraphBlock,
} from "@/lib/blocks";
import { copyToClipboard } from "@/lib/clipboard";

interface ProjectAiAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData: {
    title: string;
    tag: string;
    intro: string;
    summary: string;
    technologies: string[];
    content?: Block[];
  };
  onApplySummary: (intro: string, summary: string) => void;
  onApplyTechnologies: (technologies: string[]) => void;
  onApplyCaseStudyBlocks: (blocks: Block[], opts?: { replace?: boolean }) => void;
  onAppendSingleSection?: (title: string, content: string) => void;
  onApplySeo?: (seoTitle: string, seoDescription: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  parsedSections?: Array<{ title: string; content: string }>;
  parsedIntro?: string;
  parsedSummary?: string;
  parsedTechs?: string[];
}

/** Nettoie le texte en retirant les blocs action, JSON brut et artefacts markdown */
function cleanProseText(text: string): string {
  return text
    // Supprimer TOUS les blocs ```action:... ```
    .replace(/```action:[\s\S]*?```/gi, "")
    // Supprimer tout bloc ```json ... ``` ou ``` ... ``` contenant des accolades JSON
    .replace(/```[\w]*\s*\{[\s\S]*?\}\s*```/gi, "")
    // Supprimer les blocs de code ``` restants
    .replace(/```[\s\S]*?```/gi, "")
    // Supprimer les titres markdown
    .replace(/^#{1,6}\s+/gm, "")
    // Supprimer le gras/italique markdown
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    // Supprimer les lignes contenant uniquement des points de suspension ou des accolades
    .replace(/^[.…{}\s]+$/gm, "")
    // Nettoyer les lignes vides multiples
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Découpe le texte en sections et éléments exploitables */
function parseAiResponse(text: string) {
  const sections: Array<{ title: string; content: string }> = [];
  const sectionPattern = /\[SECTION:\s*([^\]]+)\]\s*([\s\S]*?)(?=\[SECTION:|$)/gi;
  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const title = match[1].trim().replace(/^#{1,6}\s*|\*\*|\*\*/g, "");
    const content = cleanProseText(match[2].trim());
    if (title && content) {
      sections.push({ title, content });
    }
  }

  // Détection d'intro
  let parsedIntro: string | undefined = undefined;
  const introMatch = text.match(/(?:NOUVELLE INTRO|ACCROCHE|PHRASE D['’]ACCROCHE|INTRO)\s*[:]\s*([^\n]+(?:\n[^\n]+)?)/i);
  if (introMatch) {
    parsedIntro = cleanProseText(introMatch[1].trim());
  } else {
    // Si pas de balise explicite, vérifier s'il y a un court texte introductif avant la première [SECTION:
    const firstSectionIdx = text.search(/\[SECTION:/i);
    if (firstSectionIdx > 0) {
      const preamble = text.slice(0, firstSectionIdx).trim();
      const lines = preamble
        .split("\n")
        .map((l) => cleanProseText(l))
        .filter((l) => l && !l.toLowerCase().startsWith("étude de cas") && !l.toLowerCase().startsWith("titre"));
      if (lines.length > 0) {
        parsedIntro = lines.join(" ").slice(0, 300);
      }
    }
  }

  // Détection de résumé
  let parsedSummary: string | undefined = undefined;
  const summaryMatch = text.match(/(?:NOUVEAU R[EÉ]SUM[EÉ]|R[EÉ]SUM[EÉ]|SUMMARY)\s*[:]\s*([\s\S]*?)(?=\n\n|\[SECTION|$)/i);
  if (summaryMatch) {
    parsedSummary = cleanProseText(summaryMatch[1].trim().slice(0, 450));
  } else if (parsedIntro && parsedIntro.length > 30) {
    parsedSummary = parsedIntro.slice(0, 380);
  }

  // Détection de technologies suggérées
  const techMatch = text.match(/(?:TECHNOLOGIES|STACK)\s*[:]\s*([^\n]+)/i);
  const parsedTechs = techMatch
    ? techMatch[1]
        .split(/[,;]/)
        .map((t) => t.trim().replace(/^[-*•\d.)\s]+/, ""))
        .filter((t) => t.length > 1 && t.length < 50)
    : undefined;

  return { sections, parsedIntro, parsedSummary, parsedTechs };
}

export function ProjectAiAssistant({
  open,
  onOpenChange,
  projectData,
  onApplySummary,
  onApplyTechnologies,
  onApplyCaseStudyBlocks,
  onAppendSingleSection,
  onApplySeo,
}: ProjectAiAssistantProps) {
  const [tab, setTab] = useState<"chat" | "generator">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const title = projectData.title.trim() || "ce projet";
    return [
      {
        id: "welcome",
        role: "assistant" as const,
        text:
          "Bonjour Landry. Je suis votre assistant de rédaction et d'optimisation pour ce projet.\n\n" +
          "Je peux enrichir l'étude de cas, rédiger des sections détaillées (contexte, défi technique, " +
          "architecture Cisco & serveurs, haute disponibilité, résultats), affiner votre accroche ou " +
          "proposer les technologies les plus valorisantes.\n\n" +
          "Que souhaitez-vous ajouter ou perfectionner sur cette fiche ?",
        timestamp: new Date(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [insertedTitles, setInsertedTitles] = useState<Set<string>>(new Set());

  // Pour le générateur express
  const [genMode, setGenMode] = useState<"case_study" | "summary" | "technologies">("case_study");
  const [genLoading, setGenLoading] = useState(false);
  const [genResult, setGenResult] = useState<string>("");
  const [genParsedBlocks, setGenParsedBlocks] = useState<Block[] | null>(null);
  const [genParsedTechs, setGenParsedTechs] = useState<string[] | null>(null);
  const [genParsedIntro, setGenParsedIntro] = useState<string | null>(null);
  const [genParsedSummary, setGenParsedSummary] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && skills.length === 0) {
      adminApi
        .listSkills()
        .then((data) => setSkills(data.filter((s) => s.is_active)))
        .catch(() => {});
    }
  }, [open]);


  useEffect(() => {
    if (tab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab, loading]);

  /** Construit le résumé textuel des blocs actuels du projet */
  function getExistingContentSummary(): string {
    if (!projectData.content || projectData.content.length === 0) {
      return "Aucune section rédigée pour le moment (fiche vierge).";
    }

    return projectData.content
      .map((b) => {
        if (b.type === "heading") return `\n[Section existante : ${b.text}]`;
        if (b.type === "paragraph") return nodeText(b.doc);
        if (b.type === "subheading") return `Sous-titre : ${b.text}`;
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .slice(0, 3000);
  }

  /** Envoi d'un message dans le chat interactif */
  async function handleSendMessage(customText?: string) {
    const textToSend = (customText ?? input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: "u-" + Date.now(),
      role: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      const existingContent = getExistingContentSummary();
      const techList = projectData.technologies.join(", ") || "Non spécifiées";

      const systemContext = `
Tu es l'assistant de rédaction expert du portfolio de Landry Kayoyo (Administrateur Systèmes & Réseaux — Développeur Web Full-Stack).
Tu es en train d'assister Landry directement dans l'éditeur de son projet.

FICHE DU PROJET ACTUEL :
- Titre : "${projectData.title || "Projet en cours"}"
- Catégorie / Tag : "${projectData.tag || "Non spécifié"}"
- Intro actuelle : "${projectData.intro || "Non renseignée"}"
- Résumé actuel : "${projectData.summary || "Non renseigné"}"
- Technologies associées : ${techList}

CONTENU ACTUEL DU PROJET DANS L'ÉDITEUR :
${existingContent}

DIRECTIVES RÉDACTIONNELLES ET ÉDITORIALES (DIRECTEUR ÉDITORIAL TECHNIQUE) :
1. RÈGLE CRITIQUE D'ENVIRONNEMENT : Tu es DÉJÀ dans l'éditeur de ce projet (« ${projectData.title || "Projet"} »). Le projet existe déjà ! Ne génère JAMAIS de bloc \`\`\`action:create_project_draft ici. N'essaie JAMAIS de recréer un brouillon. Ton rôle est d'écrire ou enrichir le contenu directement insérable dans l'éditeur.
2. AJOUT CIBLÉ — RÈGLE ABSOLUE : Si Landry demande d'« ajouter » ou « créer » une section précise (ex : témoignages, avis, résultats, architecture), rédige UNIQUEMENT cette section demandée avec sa balise [SECTION: Titre Pertinent]. Ne réécris JAMAIS les autres sections existantes. Ne régénère JAMAIS l'intégralité du projet.
3. COMPOSANTS RICHES DE L'ÉDITEUR WORD À EXPLOITER :
   L'éditeur Word de Landry n'est pas un simple traitement de texte brut. Il comporte plusieurs composants riches que tu dois mobiliser :
   - TÉMOIGNAGE / CITATION : Si la section contient un avis client, commerçant ou partenaire, utilise impérativement la balise :
     [CITATION: « Citation exacte du retour d'expérience... » — Prénom Nom, Rôle ou Entreprise]
     Exemple : [CITATION: « Grâce à cette solution, nous traitons deux fois plus de commandes sans aucune erreur de colis. » — Commerçant de prêt-à-porter, Lubumbashi]
     (L'éditeur Word créera automatiquement une vraie carte Citation stylisée avec l'auteur).
   - TITRES ET VARIANTES WORD :
     * Pour une section de résultats, bilan, impact ou témoignages : [SECTION: Retours du terrain et témoignages commerçants] (l'éditeur lui attribue automatiquement la coche verte de succès).
     * Pour une section de méthode, étapes ou déploiement : [SECTION: Déploiement et étapes d'intégration] (l'éditeur lui attribue la variante étapes numérotées).
     * Pour une section technique : [SECTION: Architecture et sécurisation des flux].
   - LISTES TECHNIQUES : Si tu dois énumérer des équipements, des critères ou des métriques :
     [LISTE: check] (liste avec coches vertes)
     • Critère validé 1
     • Critère validé 2
     ou [LISTE: bullet] (liste à puces classique)
   - PARAGRAPHES : Rédige le corps de texte en belle prose fluide, captivante, sans aucun symbole markdown brut (pas de ### ni de **).
4. DATE ACTUELLE — 2026 : Pour tout poste ou formation en cours, écris impérativement « 2026 — En cours ». Ne jamais écrire 2024.
5. LIEN D'ACCÈS : Si Landry mentionne une URL (https://...), écris « Lien d'accès configuré : https://... » dans ta réponse.
6. CONSEIL ÉDITORIAL : Quand Landry demande quelle structure adopter, explique avec conviction pourquoi tel bloc ou titre est le plus percutant.
`;

      // Historique pour Gemini
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({
          role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
          text: m.text,
        }));

      const res = await adminApi.chat({
        message: `${systemContext}\n\nDemande de Landry : ${textToSend}`,
        history,
        skillSlugs: ["modification-directe-projet", "expertise-systemes-reseaux", "redaction-etude-de-cas"],
      });

      const replyText = cleanProseText(res.reply);
      const parsed = parseAiResponse(res.reply);

      const assistantMsg: ChatMessage = {
        id: "a-" + Date.now(),
        role: "assistant",
        text: replyText,
        timestamp: new Date(),
        parsedSections: parsed.sections.length > 0 ? parsed.sections : undefined,
        parsedIntro: parsed.parsedIntro,
        parsedSummary: parsed.parsedSummary,
        parsedTechs: parsed.parsedTechs,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de l'assistant.");
    } finally {
      setLoading(false);
    }
  }

  /** Copier un texte avec retour visuel */
  async function handleCopy(text: string, id: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      toast.success("Texte copié !");
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error("Impossible de copier automatiquement.");
    }
  }

  /** Insérer une seule section directement dans le projet — TOUJOURS en mode ajout */
  function handleInsertSection(title: string, content: string) {
    if (onAppendSingleSection) {
      onAppendSingleSection(title, content);
      setInsertedTitles((prev) => new Set([...prev, title]));
      toast.success(`Section « ${title} » ajoutée au projet !`);
    } else {
      const blocks = sectionTextToRichBlocks(title, cleanProseText(content));
      // append = pas de replace
      onApplyCaseStudyBlocks(blocks, { replace: false });
      setInsertedTitles((prev) => new Set([...prev, title]));
      toast.success(`Section « ${title} » ajoutée !`);
    }
  }

  /**
   * Insérer toutes les sections détectées.
   * @param replace - true seulement pour le Générateur Express (remplacement total voulu).
   *                  false (défaut) pour le chat : ajoute les sections au contenu existant.
   */
  function handleInsertAllSections(
    sections: Array<{ title: string; content: string }>,
    closeDialog = true,
    replace = false
  ) {
    for (const sec of sections) {
      if (onAppendSingleSection) {
        onAppendSingleSection(sec.title, cleanProseText(sec.content));
      } else {
        const richBlocks = sectionTextToRichBlocks(sec.title, cleanProseText(sec.content));
        onApplyCaseStudyBlocks(richBlocks, { replace: false });
      }
    }

    setInsertedTitles(new Set(sections.map((s) => s.title)));
    toast.success(
      replace
        ? `${sections.length} sections insérées (contenu remplacé).`
        : `${sections.length} section(s) ajoutée(s) au projet !`
    );

    // Auto-SEO uniquement si remplacement complet (Générateur Express)
    if (replace && onApplySeo && projectData.title.trim()) {
      const textSample = sections
        .map((s) => `${s.title}: ${s.content}`)
        .join(" ")
        .slice(0, 2000);

      adminApi.generateAiText({
        prompt: `Projet: "${projectData.title}"\nCatégorie: ${projectData.tag || "Technologie"}\nContenu: ${textSample}\n\nGénère un titre SEO (50-60 car.) et une méta-description (140-160 car.) pour Landry Kayoyo.\nRéponds UNIQUEMENT par JSON: {"seo_title": "...", "seo_description": "..."}`,
        temperature: 0.6,
      })
        .then((res) => {
          const json = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
          const parsed = JSON.parse(json) as { seo_title?: string; seo_description?: string };
          if (parsed.seo_title && parsed.seo_description && onApplySeo) {
            onApplySeo(parsed.seo_title, parsed.seo_description);
            toast.success("SEO auto-généré ✨");
          }
        })
        .catch(() => {});
    }

    if (closeDialog) {
      onOpenChange(false);
    }
  }

  /** Appliquer tout le contenu (Intro, Résumé, Techs et Sections) et fermer l'assistant */
  function handleApplyAll(m: ChatMessage) {
    if (m.parsedIntro || m.parsedSummary) {
      onApplySummary(m.parsedIntro || projectData.intro, m.parsedSummary || projectData.summary);
    }
    if (m.parsedTechs && m.parsedTechs.length > 0) {
      onApplyTechnologies(Array.from(new Set([...projectData.technologies, ...m.parsedTechs])));
    }
    if (m.parsedSections && m.parsedSections.length > 0) {
      // Chat → toujours en mode AJOUT (replace=false), jamais de suppression du contenu existant
      handleInsertAllSections(m.parsedSections, true, false);
    } else {
      onOpenChange(false);
      toast.success("Modifications appliquées au projet !");
    }
  }

  /** Générateur Express en 1 clic */
  async function handleExpressGenerate(targetMode: typeof genMode) {
    if (!projectData.title.trim()) {
      toast.error("Veuillez d'abord renseigner le titre du projet.");
      return;
    }

    setGenLoading(true);
    setGenResult("");
    setGenParsedBlocks(null);
    setGenParsedTechs(null);
    setGenParsedIntro(null);
    setGenParsedSummary(null);

    try {
      const techList = projectData.technologies.join(", ") || "Non spécifiées";
      let prompt = "";

      if (targetMode === "case_study") {
        prompt = `Tu es un rédacteur technique d'élite pour le portfolio de Landry Kayoyo (Administrateur Systèmes & Réseaux — Développeur Web Full-Stack).
Rédige une étude de cas complète, percutante et captivante pour le projet suivant :
- Titre : "${projectData.title}"
- Catégorie : "${projectData.tag || "Systèmes, Réseaux & Web"}"
- Technologies associées : ${techList}
- Contexte initial : "${projectData.intro || projectData.summary || ""}"

CONSIGNES DE RÉDACTION SUR-MESURE (ZÉRO GABARIT RÉPÉTITIF) :
1. N'utilise PAS de titres génériques ou stéréotypés. Les titres et le nombre de sections doivent DÉPENDRE ENTIÈREMENT de la nature réelle de ce projet.
2. Rédige une étude de cas complète comportant entre 4 et 6 sections approfondies avec des titres percutants (par exemple : problématique et contexte terrain, choix d'architecture ou topologie réseau, étapes de mise en œuvre et configuration, sécurisation et résilience, résultats concrets et bilan d'exploitation).
3. Balisage obligatoire pour chaque section : [SECTION: Titre Personnalisé de la Section], suivi d'une prose fluide, riche et détaillée.
4. RÈGLES STRICTES : AUCUN ÉMOJI. AUCUN SYMBOLE MARKDOWN ENCOMBRANT (pas de ### ni de **). Rédige en belle prose aérée digne d'un traitement de texte Word.`;
      } else if (targetMode === "summary") {

        prompt = `Pour le projet "${projectData.title}" (${techList}) :
RÈGLE STRICTE : AUCUN ÉMOJI. AUCUN SYMBOLE MARKDOWN.
Génère :
NOUVELLE INTRO : Une phrase d'accroche valorisante pour la page du projet.
NOUVEAU RESUME : Un résumé percutant du problème et de la solution de moins de 400 caractères.`;
      } else {
        prompt = `Projet : "${projectData.title}". Technologies actuelles : ${techList}.
Suggère 6 à 8 technologies, protocoles ou outils modernes et complémentaires valorisant les compétences de Landry (réseaux Cisco, systèmes Linux/Windows Server, web moderne).
Réponds uniquement par la liste séparée par des virgules. Sans aucun émoji ni markdown.`;
      }

      const res = await adminApi.generateAiText({
        prompt,
        temperature: 0.7,
      });

      const text = cleanProseText(res.text);
      setGenResult(text);

      if (targetMode === "summary") {
        const introMatch = text.match(/NOUVELLE INTRO\s*[:]\s*([^\n]+(?:\n[^\n]+)?)/i);
        const summaryMatch = text.match(/NOUVEAU RESUME\s*[:]\s*([\s\S]*?)$/i);
        if (introMatch && summaryMatch) {
          setGenParsedIntro(introMatch[1].trim());
          setGenParsedSummary(summaryMatch[1].trim().slice(0, 450));
        } else {
          setGenParsedSummary(text.slice(0, 400));
        }
      } else if (targetMode === "technologies") {
        const list = text
          .split(/,|\n/)
          .map((s) => s.replace(/^[-*•\d.)\s]+/, "").trim())
          .filter((s) => s.length > 1 && s.length < 50);
        setGenParsedTechs(Array.from(new Set([...projectData.technologies, ...list])));
      } else if (targetMode === "case_study") {
        const parsed = parseAiResponse(res.text);
        if (parsed.sections.length > 0) {
          const blocks: Block[] = [];
          for (const s of parsed.sections) {
            const rich = sectionTextToRichBlocks(s.title, s.content);
            blocks.push(...rich);
          }
          setGenParsedBlocks(blocks);
        }
      }

      toast.success("Proposition générée !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération.");
    } finally {
      setGenLoading(false);
    }
  }

  function applyGenResult() {
    if (genMode === "summary") {
      if (genParsedIntro || genParsedSummary) {
        onApplySummary(genParsedIntro || projectData.intro, genParsedSummary || projectData.summary);
        toast.success("Pitch et résumé appliqués au projet !");
        onOpenChange(false);
      }
    } else if (genMode === "technologies") {
      if (genParsedTechs && genParsedTechs.length > 0) {
        onApplyTechnologies(genParsedTechs);
        toast.success("Technologies appliquées !");
        onOpenChange(false);
      }
    } else if (genMode === "case_study") {
      if (genParsedBlocks && genParsedBlocks.length > 0) {
        onApplyCaseStudyBlocks(genParsedBlocks, { replace: true });

        // Génération automatique du SEO après insertion d'une étude de cas complète
        if (onApplySeo && projectData.title.trim()) {
          const plainText = genResult
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 2000);

          const seoPrompt = `Projet: "${projectData.title}"
Catégorie: ${projectData.tag || "Technologie"}
Technologies: ${projectData.technologies.join(", ") || "Non spécifiées"}
Extrait du contenu: ${plainText}

Génère un titre SEO (50-60 caractères) et une méta-description percutante (140-160 caractères) pour ce projet de Landry Kayoyo.
Réponds UNIQUEMENT par un JSON: {"seo_title": "...", "seo_description": "..."}`;

          adminApi.generateAiText({ prompt: seoPrompt, temperature: 0.6 })
            .then((res) => {
              const json = res.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
              const parsed = JSON.parse(json);
              if (parsed.seo_title && parsed.seo_description) {
                onApplySeo(parsed.seo_title, parsed.seo_description);
                toast.success("SEO généré automatiquement ✨");
              }
            })
            .catch(() => {}); // silencieux si erreur
        }

        toast.success("Étude de cas insérée dans l'éditeur !");
        onOpenChange(false);
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header épuré et ergonomique sur mobile */}
        <DialogHeader className="p-3 sm:p-4 pb-2.5 border-b border-border/70 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate flex items-center gap-1.5">
                  <span>Assistant Rédaction</span>
                  <span className="text-xs font-normal text-muted-foreground truncate hidden xs:inline">
                    · {projectData.title || "Projet"}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground truncate">
                  Rédigez et insérez vos sections sur-mesure directement dans l'éditeur Word.
                </DialogDescription>
              </div>
            </div>

            {/* Sélecteur d'onglets épuré */}
            <div className="flex items-center self-start sm:self-auto rounded-xl bg-muted/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => setTab("chat")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  tab === "chat"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare size={13} />
                <span>Chat</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("generator")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  tab === "generator"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wand2 size={13} />
                <span>Générateur</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Corps de l'onglet : CHAT DIRECT */}
        {tab === "chat" && (
          <div className="flex flex-col flex-1 overflow-hidden min-h-[440px] max-h-[68vh]">
            {/* Fil des messages avec overscroll-contain */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3 sm:space-y-4">
              {messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in-50`}
                  >
                    <div
                      className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs mt-0.5 ${
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary border border-border text-foreground"
                      }`}
                    >
                      {isUser ? "LK" : <Bot size={15} className="text-primary" />}
                    </div>

                    <div className={`space-y-2 max-w-[92%] sm:max-w-[86%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs text-xs sm:text-sm leading-relaxed ${
                          isUser
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-card border border-border/80 text-foreground rounded-tl-xs space-y-2.5"
                        }`}
                      >
                        {/* Rendu du texte sans markdown brut */}
                        <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                          {m.text}
                        </div>

                        {/* Cartes d'action si l'assistant a proposé des sections */}
                        {!isUser && m.parsedSections && m.parsedSections.length > 0 && (
                          <div className="pt-2 border-t border-border/60 space-y-2">
                            {/* Bannière principale compacte */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                              <div className="flex items-center gap-1.5">
                                <Layers size={14} className="text-primary shrink-0" />
                                <span className="text-xs font-semibold text-foreground">
                                  {m.parsedSections.length} sections rédigées sur-mesure
                                </span>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleInsertAllSections(m.parsedSections!, true, false)}
                                className="h-7.5 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-2xs w-full sm:w-auto"
                              >
                                <Sparkles size={13} />
                                <span>Ajouter au projet</span>
                              </Button>
                            </div>


                            {/* Liste détaillée des sections avec état d'insertion */}
                            <div className="space-y-1.5 pt-1">
                              {m.parsedSections.map((sec, idx) => {
                                const isInserted = insertedTitles.has(sec.title);
                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs transition-colors ${
                                      isInserted
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                                        : "bg-muted/40 border-border/60 text-foreground"
                                    }`}
                                  >
                                    <div className="truncate flex-1 min-w-0 pr-2">
                                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        {isInserted && <Check size={13} className="text-emerald-500 shrink-0" />}
                                        <span>{sec.title}</span>
                                      </span>
                                      <p className="text-[11px] text-muted-foreground truncate max-w-[280px] sm:max-w-[420px] mt-0.5">
                                        {sec.content.slice(0, 95)}...
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopy(sec.content, `sec-${idx}`)}
                                        className="h-7 w-7 p-0 rounded-md"
                                        title="Copier le texte"
                                      >
                                        {copiedId === `sec-${idx}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={isInserted ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => handleInsertSection(sec.title, sec.content)}
                                        className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-md"
                                      >
                                        {isInserted ? (
                                          <>
                                            <Check size={11} className="text-emerald-500" />
                                            <span>Inséré</span>
                                          </>
                                        ) : (
                                          <>
                                            <PlusCircle size={11} />
                                            <span>Insérer</span>
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Barre inférieure : Tout appliquer et/ou fermer */}
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40">
                              <span className="text-[11px] text-muted-foreground">
                                Les blocs s'ouvrent ensuite dans votre éditeur Word.
                              </span>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenChange(false)}
                                  className="h-7 text-xs rounded-lg gap-1 flex-1 sm:flex-initial"
                                >
                                  <Eye size={12} />
                                  <span>Voir l'éditeur</span>
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleApplyAll(m)}
                                  className="h-7 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-2xs flex-1 sm:flex-initial"
                                >
                                  <Check size={12} />
                                  <span>Tout appliquer</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Carte d'action si l'assistant a proposé une nouvelle intro / résumé */}
                        {!isUser && (m.parsedIntro || m.parsedSummary) && (
                          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/60 text-xs">
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-semibold text-foreground text-xs block">
                                Accroche & Résumé prêts
                              </span>
                              {m.parsedIntro && (
                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                  <strong className="text-foreground">Accroche :</strong> {m.parsedIntro.slice(0, 90)}...
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onApplySummary(m.parsedIntro || projectData.intro, m.parsedSummary || projectData.summary);
                                  toast.success("Pitch et résumé appliqués au projet !");
                                  onOpenChange(false);
                                }}
                                className="h-7 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 rounded-lg"
                              >
                                <Check size={12} />
                                <span>Appliquer & Voir</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Carte d'action si l'assistant a proposé des technologies */}
                        {!isUser && m.parsedTechs && m.parsedTechs.length > 0 && (
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 bg-muted/30 p-2.5 rounded-xl border border-border/60 text-xs">
                            <span className="text-[11px] text-muted-foreground truncate">
                              Techs suggérées : {m.parsedTechs.join(", ")}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onApplyTechnologies(Array.from(new Set([...projectData.technologies, ...m.parsedTechs!])));
                                toast.success("Technologies ajoutées !");
                              }}
                              className="h-7 text-xs font-semibold gap-1.5 border-primary/40 text-primary hover:bg-primary/10 rounded-lg shrink-0"
                            >
                              <PlusCircle size={12} />
                              Ajouter
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Barre d'outils du message */}
                      <div className={`flex items-center gap-2 px-1 text-[11px] text-muted-foreground ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                        <span>{m.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(m.text, m.id)}
                            className="opacity-70 hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
                            title="Copier tout le message"
                          >
                            {copiedId === m.id ? (
                              <Check size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2 sm:gap-3 items-center">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
                    <Bot size={15} className="text-primary animate-pulse" />
                  </div>
                  <div className="rounded-2xl px-4 py-2.5 bg-card border border-border/80 shadow-xs flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={13} className="animate-spin text-primary" />
                    <span>L'assistant réfléchit et structure la rédaction...</span>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Suggestions de requêtes en 1 clic */}
            <div className="px-4 py-2 bg-muted/20 border-t border-border/60 overflow-x-auto flex items-center gap-1.5 text-xs no-scrollbar">
              <span className="text-[11px] text-muted-foreground shrink-0 font-medium mr-1">Suggestions :</span>
              <button
                type="button"
                onClick={() => handleSendMessage("Rédige l'étude de cas complète de ce projet de manière propre et détaillée, structurée avec des balises [SECTION: Nom de section], sans aucun symbole markdown.")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-[11px] text-foreground hover:bg-primary/5 transition-all"
              >
                Étude de cas complète
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Ajoute une section spécifique sur la Haute Disponibilité et la Tolérance aux pannes réseau et serveurs pour ce projet.")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-[11px] text-foreground hover:bg-primary/5 transition-all"
              >
                + Section Haute Disponibilité
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Ajoute une section détaillée sur l'Architecture Réseau Cisco, les VLANs et la sécurisation par pare-feu.")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-[11px] text-foreground hover:bg-primary/5 transition-all"
              >
                + Section Architecture Réseau
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage("Propose une nouvelle phrase d'accroche valorisante et un résumé de moins de 400 caractères mettant en valeur ma double casquette Administrateur Systèmes & Développeur Web.")}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 text-[11px] text-foreground hover:bg-primary/5 transition-all"
              >
                Améliorer Accroche & Résumé
              </button>
            </div>

            {/* Champ de saisie interactif */}
            <div className="p-3 sm:p-4 border-t border-border bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Demandez une modification, une section, un ajustement technique..."
                  disabled={loading}
                  className="flex-1 h-11 px-4 text-xs sm:text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground/70"
                />
                <Button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="h-11 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm gap-1.5 shadow-xs hover:bg-primary/90"
                >
                  <Send size={14} />
                  <span className="hidden sm:inline">Envoyer</span>
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Corps de l'onglet : GÉNÉRATEUR EXPRESS */}
        {tab === "generator" && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setGenMode("case_study"); setGenResult(""); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  genMode === "case_study"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <FileText size={18} />
                <span>Étude de cas complète</span>
              </button>
              <button
                type="button"
                onClick={() => { setGenMode("summary"); setGenResult(""); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  genMode === "summary"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Wand2 size={18} />
                <span>Accroche & Résumé</span>
              </button>
              <button
                type="button"
                onClick={() => { setGenMode("technologies"); setGenResult(""); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                  genMode === "technologies"
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                <Lightbulb size={18} />
                <span>Technologies</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                disabled={genLoading}
                onClick={() => handleExpressGenerate(genMode)}
                className="gap-2 rounded-xl bg-gradient-primary text-primary-foreground shadow-xs text-xs sm:text-sm h-10 px-5"
              >
                {genLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Rédaction en cours...</span>
                  </>
                ) : (
                  <>
                    {genResult ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                    <span>{genResult ? "Régénérer" : "Générer en 1 clic"}</span>
                  </>
                )}
              </Button>
            </div>

            {genResult && (
              <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 animate-in fade-in-50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-primary">Résultat structuré</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(genResult, "express-copy")}
                    className="h-7 text-xs gap-1"
                  >
                    {copiedId === "express-copy" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>Copier</span>
                  </Button>
                </div>

                {genMode === "case_study" && genParsedBlocks && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    <p className="text-muted-foreground font-medium">
                      {genParsedBlocks.length} blocs d'étude de cas prêts à être insérés :
                    </p>
                    {genParsedBlocks.map((b, i) => (
                      <div key={i} className="p-2 rounded-xl bg-background border border-border/60">
                        <span className="font-bold text-foreground">
                          {b.type === "heading" ? b.text : nodeText(b.doc).slice(0, 100) + "..."}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {genMode === "summary" && (
                  <div className="space-y-2 bg-background p-3 rounded-xl border border-border/60">
                    {genParsedIntro && (
                      <div>
                        <span className="font-semibold text-primary">Accroche :</span>
                        <p className="text-foreground leading-relaxed mt-0.5">{genParsedIntro}</p>
                      </div>
                    )}
                    {genParsedSummary && (
                      <div className="pt-2 border-t border-border/40">
                        <span className="font-semibold text-primary">Résumé court :</span>
                        <p className="text-foreground leading-relaxed mt-0.5">{genParsedSummary}</p>
                      </div>
                    )}
                  </div>
                )}

                {genMode === "technologies" && genParsedTechs && (
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-background border border-border/60">
                    {genParsedTechs.map((tech) => (
                      <Badge key={tech} variant="outline" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-primary/20">
                  <Button
                    type="button"
                    size="sm"
                    onClick={applyGenResult}
                    className="gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
                  >
                    <Check size={14} />
                    <span>Appliquer directement au projet & Voir</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
