import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot,
  Send,
  Trash2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  FileText,
  Code2,
  UserCheck,
  FileEdit,
  BookmarkPlus,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { adminApi, type AiSkill, type AdminActionExecuted } from "@/lib/admin-api-client";
import { IaSubNav } from "@/components/admin/IaSubNav";
import { copyToClipboard } from "@/lib/clipboard";

export const Route = createFileRoute("/admin/ia/assistant")({
  component: AdminAssistantPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  model?: string;
  timestamp: Date;
  error?: boolean;
  actionExecuted?: AdminActionExecuted;
}

function extractDraftDataFromText(text: string) {
  const titleMatch = text.match(/(?:Titre\s*(?:du projet)?\s*[:]\s*["«']?([^"»'\n]+)["»']?)|(?:^#+\s+(.+)$)/m);
  const rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2]) : "Nouveau projet brouillon";
  const title = rawTitle.trim().replace(/^["'«]+|["'»]+$/g, "");

  const techMatch = text.match(/(?:Technologies|Stack)\s*[:]\s*([^\n]+)/i);
  const technologies = techMatch
    ? techMatch[1]
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && t.length < 50)
    : [];

  const introMatch = text.match(/(?:Introduction|Intro)\s*[:]\s*([\s\S]*?)(?=\n\n|\[SECTION|$)/i);
  const intro = introMatch ? introMatch[1].trim() : "";

  const summaryMatch = text.match(/(?:Résumé|Summary)\s*[:]\s*([\s\S]*?)(?=\n\n|\[SECTION|$)/i);
  const summary = summaryMatch ? summaryMatch[1].trim().slice(0, 450) : "";

  // Détection du lien d'accès / démo
  const urlMatch = text.match(/(?:Lien(?:\s*d['’]accès|\s*externe|\s*du projet)?|URL|Accès|Démo)\s*[:]\s*(https?:\/\/[^\s\n)]+)/i) ||
                   text.match(/(https?:\/\/[^\s\n)]+)/i);
  const external_url = urlMatch ? urlMatch[1].trim().replace(/[.,;)]+$/, "") : undefined;

  const sections: Array<{ title: string; content: string }> = [];
  const pattern = /\[SECTION:\s*([^\]]+)\]\s*([\s\S]*?)(?=\[SECTION:|$)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    sections.push({
      title: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return { title, intro, summary, technologies, external_url, sections };
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function FormattedMessageText({ text }: { text: string }) {
  // Retirer les blocs action techniques s'il y en a
  const cleaned = text.replace(/```action:[a-z0-9_-]+\s*[\s\S]*?```/gi, "").trim();
  const lines = cleaned.split("\n");

  return (
    <div className="space-y-2 text-xs sm:text-sm leading-relaxed text-foreground/95">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1.5" />;

        // Titre de section éditoriale (format [SECTION: ...] ou titre propre)
        if (
          trimmed.startsWith("[SECTION:") ||
          trimmed.startsWith("###") ||
          trimmed.startsWith("##") ||
          trimmed.startsWith("#")
        ) {
          const cleanTitle = trimmed
            .replace(/^[#\[\]\s:]+|[\]]+$/g, "")
            .replace(/^SECTION:\s*/i, "")
            .replace(/^\*\*|\*\*$/g, "")
            .trim();
          return (
            <div key={idx} className="pt-2.5 pb-1">
              <h4 className="font-bold text-foreground text-xs sm:text-sm text-primary flex items-center gap-2 pl-2 border-l-2 border-primary">
                <span>{cleanTitle}</span>
              </h4>
            </div>
          );
        }

        // Puces de listes
        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-primary mt-1.5 text-[6px] shrink-0">●</span>
              <span className="flex-1 leading-relaxed">{renderBoldParts(content)}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderBoldParts(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderBoldParts(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}


function MessageBubble({
  msg,
  onActionExecuted,
}: {
  msg: ChatMessage;
  onActionExecuted?: (action: AdminActionExecuted) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = async () => {
    const ok = await copyToClipboard(msg.text);
    if (ok) {
      setCopied(true);
      toast.success("Texte copié dans le presse-papiers !");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Impossible de copier automatiquement le texte.");
    }
  };

  const handleSaveQuickDraft = async () => {
    setSavingDraft(true);
    try {
      const data = extractDraftDataFromText(msg.text);
      const res = await adminApi.executeDirectAction({
        type: "create_project_draft",
        data: data as never,
      });
      if (onActionExecuted) {
        onActionExecuted(res.actionExecuted);
      }
      toast.success("Projet créé en mode brouillon !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSavingDraft(false);
    }
  };

  const hasSections = !isUser && !msg.error && msg.text.includes("[SECTION:");

  return (
    <div className={`flex gap-1.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in-50 min-w-0 w-full`}>
      <div
        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs mt-0.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary border border-border text-foreground"
        }`}
      >
        {isUser ? "LK" : <Bot size={15} className="text-primary" />}
      </div>

      <div className={`group max-w-[94%] sm:max-w-[84%] space-y-1.5 ${isUser ? "items-end" : "items-start"} flex flex-col min-w-0`}>
        <div
          className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-3 shadow-xs break-words [overflow-wrap:anywhere] ${
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-xs"
              : msg.error
              ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-xs"
              : "bg-card border border-border/80 text-foreground rounded-tl-xs"
          }`}
        >
          {isUser ? (
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          ) : (
            <FormattedMessageText text={msg.text} />
          )}

          {/* Widget interactif lorsqu'un projet a été enregistré en mode brouillon */}
          {msg.actionExecuted && msg.actionExecuted.entity === "project" && (
            <div className="mt-2.5 sm:mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-2.5 sm:p-3.5 space-y-2 text-foreground">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold text-[10px] sm:text-[11px] gap-1 px-1.5 py-0.5 shrink-0">
                    <FileText size={11} />
                    Brouillon
                  </Badge>
                  <span className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[180px] sm:max-w-[280px]">
                    {msg.actionExecuted.title}
                  </span>
                </div>
                {msg.actionExecuted.slug && (
                  <code className="text-[10px] text-muted-foreground bg-background/80 border border-border/60 px-1.5 py-0.5 rounded font-mono self-start sm:self-auto truncate max-w-full">
                    /{msg.actionExecuted.slug}
                  </code>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Le projet a été enregistré en mode brouillon. Vous pouvez maintenant l'ouvrir dans l'éditeur Word pour enrichir ses sections.
              </p>
              <div className="pt-1 flex items-center justify-end">
                <Link to="/admin/projets/$id" params={{ id: msg.actionExecuted.id }} className="w-full sm:w-auto">
                  <Button size="sm" className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 w-full sm:w-auto">
                    <FileEdit size={13} />
                    Ouvrir dans l'éditeur Word
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Widget interactif lorsqu'une expérience ou certification a été enregistrée */}
          {msg.actionExecuted && msg.actionExecuted.entity !== "project" && (
            <div className="mt-2.5 sm:mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-2.5 sm:p-3 space-y-1.5 text-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] sm:text-[11px] gap-1 px-1.5 py-0.5">
                  <Check size={11} />
                  {msg.actionExecuted.entity === "experience" ? "Expérience" : "Certification"}
                </Badge>
                <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                  {msg.actionExecuted.title}
                </span>
              </div>
              <div className="pt-1 flex items-center justify-end">
                <Link to={msg.actionExecuted.editUrl as never} className="w-full sm:w-auto">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold rounded-lg w-full sm:w-auto">
                    <ExternalLink size={13} />
                    Voir dans l'administration
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bouton d'action rapide si l'étude de cas n'a pas encore été enregistrée */}
        {hasSections && !msg.actionExecuted && (
          <div className="pt-1 flex items-center gap-2 w-full">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={savingDraft}
              onClick={handleSaveQuickDraft}
              className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/15 rounded-xl shadow-2xs active:scale-[0.98] transition-all w-full sm:w-auto justify-center"
            >
              {savingDraft ? <Loader2 size={13} className="animate-spin" /> : <BookmarkPlus size={13} />}
              <span className="truncate">Enregistrer comme Brouillon</span>
            </Button>
          </div>
        )}

        <div className={`flex items-center gap-1.5 sm:gap-2 px-1 text-[11px] text-muted-foreground ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span>{formatTime(msg.timestamp)}</span>
          {msg.model && (
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-md bg-muted border border-border/60">
              {msg.model.replace(/^gemini-/, "")}
            </span>
          )}
          {!isUser && !msg.error && (
            <button
              onClick={handleCopy}
              className="opacity-70 hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
              title="Copier le texte"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 sm:gap-3 items-center">
      <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
        <Bot size={15} className="text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-xs bg-card border border-border/80 px-3.5 py-2 flex items-center gap-1.5 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  {
    icon: FileText,
    label: "Étude de cas complète & sur-mesure",
    prompt:
      "Aide-moi à concevoir une étude de cas complète, percutante et sur-mesure pour un nouveau projet. De quelles informations as-tu besoin ?",
  },
  {
    icon: Code2,
    label: "Architecture réseau & Systèmes",
    prompt:
      "Rédige une présentation claire et accessible d'une infrastructure réseau Cisco avec VLANs, haute disponibilité et Active Directory pour une organisation.",
  },
  {
    icon: Layers,
    label: "Pitch profil : Systèmes, Réseaux & Web",
    prompt:
      "Rédige un pitch sobre et percutant qui valorise ma double compétence rare : Administrateur Systèmes & Réseaux diplômé et Développeur Web Full-Stack.",
  },
  {
    icon: UserCheck,
    label: "Réponse professionnelle à un client",
    prompt:
      "Rédige une proposition de réponse par email ou WhatsApp professionnelle et courtoise pour un client qui me sollicite pour un audit réseau ou un projet web.",
  },
];

function AdminAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminApi
      .listSkills()
      .then((data) => {
        const active = data.filter((s) => s.is_active);
        setSkills(active);
        const defaultSlugs = active
          .filter((s) => s.slug === "assistant-portfolio" || s.slug === "redaction-etude-de-cas")
          .map((s) => s.slug);
        setSelectedSlugs(defaultSlugs.length > 0 ? defaultSlugs : active.map((s) => s.slug).slice(0, 2));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleSkill = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const history = messages.slice(-20).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const result = await adminApi.chat({
        message: text,
        history,
        skillSlugs: selectedSlugs,
      });

      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: result.reply,
        model: result.model,
        actionExecuted: result.actionExecuted,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (result.actionExecuted) {
        if (result.actionExecuted.entity === "project") {
          toast.success("Projet créé en mode brouillon !");
        } else {
          toast.success("Contenu enregistré avec succès !");
        }
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: generateId(),
        role: "assistant",
        text: err instanceof Error ? err.message : "Erreur de communication avec l'assistant.",
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [input, isLoading, messages, selectedSlugs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-6.25rem)] sm:h-[calc(100vh-8rem)] lg:h-[calc(100vh-9rem)] max-w-5xl mx-auto space-y-1.5 sm:space-y-2 min-h-0">
      {/* Navigation & En-tête compact */}
      <div className="shrink-0 space-y-1">
        <IaSubNav />

        <div className="flex items-center justify-between gap-2 pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="text-sm sm:text-lg font-bold flex items-center gap-1.5 text-foreground truncate">
              <Bot size={17} className="text-primary shrink-0" />
              <span>Assistant IA</span>
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground truncate">
              · Rédaction soignée & aide au portfolio
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl px-2 sm:px-2.5 shadow-2xs">
                  <SlidersHorizontal size={12} />
                  <span className="hidden xs:inline">Skills</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold bg-primary/10 text-primary">
                    {selectedSlugs.length}
                  </Badge>
                  <ChevronDown size={10} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-xs max-h-72 overflow-y-auto p-1.5 shadow-lg">
                <DropdownMenuLabel className="text-xs font-semibold">
                  Compétences actives
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {skills.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">Aucun skill configuré.</div>
                ) : (
                  skills.map((s) => (
                    <DropdownMenuCheckboxItem
                      key={s.slug}
                      checked={selectedSlugs.includes(s.slug)}
                      onCheckedChange={() => toggleSkill(s.slug)}
                      className="text-xs py-1.5 cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{s.title}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                          {s.description}
                        </span>
                      </div>
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMessages([])}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive rounded-xl"
                title="Effacer la conversation"
                aria-label="Effacer la conversation"
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Zone de discussion principale avec ascenseur confiné */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Fil des messages avec overscroll-contain pour une sensation mobile native */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-5 space-y-3 sm:space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-2 sm:p-6 max-w-lg mx-auto">
              <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2 sm:mb-3 shadow-xs">
                <Sparkles size={18} className="sm:hidden" />
                <Sparkles size={22} className="hidden sm:block" />
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-foreground">
                Assistant de Rédaction & Portfolio
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 mb-2.5 sm:mb-4 leading-relaxed max-w-md line-clamp-2 sm:line-clamp-none">
                Rédigez des études de cas captivantes, formulez vos architectures réseau et mettez en valeur vos compétences avec un français clair et soigné.
              </p>

              {/* Suggestions rapides tactiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 w-full text-left">
                {QUICK_PROMPTS.map((qp, i) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void handleSend(qp.prompt)}
                      className="group p-2 sm:p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-muted/60 hover:border-primary/40 active:scale-[0.99] transition-all text-xs flex items-center sm:items-start gap-2 sm:gap-2.5 min-h-[42px] sm:min-h-[48px]"
                    >
                      <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate text-xs">
                          {qp.label}
                        </span>
                        <span className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 mt-0.5 hidden xs:block">
                          {qp.prompt}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onActionExecuted={(action) => {
                    setMessages((prev) =>
                      prev.map((m) => (m.id === msg.id ? { ...m, actionExecuted: action } : m)),
                    );
                  }}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Champ de saisie mobile ergonomique */}
        <div className="border-t border-border/80 p-2 sm:p-3 bg-muted/20 shrink-0">
          <div className="rounded-2xl border border-input/90 bg-background p-1.5 pl-3 sm:pl-3.5 flex items-end gap-1.5 sm:gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez votre message…"
              rows={1}
              disabled={isLoading}
              className="flex-1 min-h-[38px] max-h-[120px] resize-none border-0 bg-transparent p-0 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground shadow-xs p-0 flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95"
              aria-label="Envoyer"
            >
              {isLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1 px-1">
            <span>
              {selectedSlugs.length > 0
                ? `${selectedSlugs.length} skill(s) actif(s)`
                : "Standard portfolio"}
            </span>
            <span className="hidden sm:inline">Maj + Entrée pour un saut de ligne</span>
          </div>
        </div>
      </div>
    </div>
  );
}

