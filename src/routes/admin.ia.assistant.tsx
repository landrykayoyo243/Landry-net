import { createFileRoute } from "@tanstack/react-router";
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
import { adminApi, type AiSkill } from "@/lib/admin-api-client";
import { IaSubNav } from "@/components/admin/IaSubNav";

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
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1.5" />;

        if (line.startsWith("[SECTION:") || line.startsWith("###") || line.startsWith("##")) {
          const cleanTitle = line.replace(/^[#\[\]\s:]+|[\]]+$/g, "").replace(/^SECTION:\s*/i, "");
          return (
            <h4 key={idx} className="font-bold text-foreground pt-1.5 pb-0.5 text-xs sm:text-sm text-primary flex items-center gap-1.5">
              <span>{cleanTitle}</span>
            </h4>
          );
        }

        if (/^[-*•]\s+/.test(line)) {
          const content = line.replace(/^[-*•]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary mt-1 text-[8px] shrink-0">•</span>
              <span className="flex-1">{renderBoldParts(content)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderBoldParts(line)}</p>;
      })}
    </div>
  );
}

function renderBoldParts(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.text);
    setCopied(true);
    toast.success("Texte copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} animate-in fade-in-50`}>
      <div
        className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold shadow-2xs mt-0.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary border border-border text-foreground"
        }`}
      >
        {isUser ? "LK" : <Bot size={15} className="text-primary" />}
      </div>

      <div className={`group max-w-[92%] sm:max-w-[82%] space-y-1 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs ${
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
        </div>

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
    label: "Rédiger une étude de cas",
    prompt: "Aide-moi à rédiger une étude de cas détaillée pour un projet de mon portfolio. Quelles sont les informations clés dont tu as besoin ?",
  },
  {
    icon: Code2,
    label: "Vulgariser un choix technique",
    prompt: "Explique de manière simple et accessible à un recruteur pourquoi j'ai choisi Docker et TypeScript sur mon projet.",
  },
  {
    icon: Layers,
    label: "Améliorer mon pitch profil",
    prompt: "Rédige un pitch percutant en 3 phrases pour présenter mon profil de Développeur Full-Stack & DevOps passionné.",
  },
  {
    icon: UserCheck,
    label: "Répondre à une proposition de mission",
    prompt: "Rédige une proposition de réponse par email professionnelle et courtoise pour un client qui me sollicite pour une mission freelance.",
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
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
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
    <div className="flex flex-col h-[calc(100dvh-5.5rem)] sm:h-[calc(100vh-8rem)] max-w-5xl mx-auto space-y-2 sm:space-y-3">
      {/* Navigation & En-tête */}
      <div className="shrink-0 space-y-1.5">
        <IaSubNav />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-xl font-bold flex items-center gap-2 text-foreground">
              <Bot size={18} className="text-primary" />
              <span>Assistant IA</span>
            </h1>
            <span className="hidden sm:inline-block text-xs text-muted-foreground">
              · Posez vos questions et préparez vos contenus
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 sm:h-8 gap-1.5 text-xs rounded-xl px-2.5">
                  <SlidersHorizontal size={12} />
                  <span className="hidden sm:inline">Skills</span>
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-semibold bg-primary/10 text-primary">
                    {selectedSlugs.length}
                  </Badge>
                  <ChevronDown size={10} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-72 overflow-y-auto p-1.5">
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
                className="h-7 sm:h-8 px-2 text-xs text-muted-foreground hover:text-destructive rounded-xl"
                title="Effacer la conversation"
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Zone de discussion */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Fil des messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-3 sm:p-4 max-w-lg mx-auto">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-2.5 shadow-xs">
                <Sparkles size={22} />
              </div>
              <h2 className="text-sm sm:text-lg font-bold text-foreground">
                Assistant de Rédaction & Portfolio
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 mb-4 max-w-md">
                Connecté à vos compétences actives pour vous aider à rédiger des études de cas, formuler des réponses professionnelles ou clarifier des choix d'architecture.
              </p>

              {/* Suggestions rapides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                {QUICK_PROMPTS.map((qp, i) => {
                  const Icon = qp.icon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void handleSend(qp.prompt)}
                      className="group p-2.5 sm:p-3 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/50 hover:border-primary/40 transition-all text-xs flex items-start gap-2"
                    >
                      <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                        <Icon size={12} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
                          {qp.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
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
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Champ de saisie mobile ergonomique (sans ascenseur double, sans scrollbar disgracieuse) */}
        <div className="border-t border-border/80 p-2 sm:p-3 bg-muted/15 shrink-0">
          <div className="rounded-2xl border border-input/90 bg-background p-1.5 pl-3.5 flex items-end gap-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all shadow-2xs">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question ou demandez une rédaction… (Entrée pour envoyer)"
              rows={1}
              disabled={isLoading}
              className="flex-1 min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent p-0 py-1.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 leading-relaxed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            />
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-xl bg-gradient-primary text-primary-foreground shadow-xs p-0 flex items-center justify-center"
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
                : "Aucun skill actif"}
            </span>
            <span className="hidden sm:inline">Maj + Entrée pour un saut de ligne</span>
          </div>
        </div>
      </div>
    </div>
  );
}
