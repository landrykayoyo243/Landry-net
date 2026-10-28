import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Sparkles,
  Bot,
  Zap,
  Gauge,
  ShieldCheck,
  ArrowRight,
  FolderKanban,
  Settings,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApi, type AiSkill } from "@/lib/admin-api-client";
import { IaSubNav } from "@/components/admin/IaSubNav";

export const Route = createFileRoute("/admin/ia/")({
  component: AdminIaIndexPage,
});

function AdminIaIndexPage() {
  const [aiData, setAiData] = useState<{
    config: {
      model: string;
      daily_request_limit: number;
      max_prompt_chars: number;
      allow_contact_messages: boolean;
    };
    usage: {
      day: string;
      request_count: number;
      daily_limit: number;
      remaining: number;
    };
  } | null>(null);

  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getAiData().catch(() => null),
      adminApi.listSkills().catch(() => []),
    ])
      .then(([ai, sk]) => {
        setAiData(ai);
        setSkills(sk);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSkillsCount = skills.filter((s) => s.is_active).length;
  const usagePercent = aiData
    ? Math.min(100, Math.round((aiData.usage.request_count / aiData.usage.daily_limit) * 100))
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* En-tête principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Assistant IA
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Génération de contenu, rédaction d'études de cas et assistance pour votre portfolio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-full bg-gradient-primary text-primary-foreground shadow-sm text-xs gap-1.5 h-9">
            <Link to="/admin/ia/assistant">
              <Bot size={15} />
              <span>Ouvrir le Chat IA</span>
            </Link>
          </Button>
        </div>
      </div>

      <IaSubNav />

      {/* Cartes métriques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1.5"><Gauge size={14} /> Quota Journalier</span>
            <span className="font-semibold text-foreground">{usagePercent}%</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">
              {aiData ? aiData.usage.request_count : "—"}
            </span>
            <span className="text-xs text-muted-foreground">
              / {aiData ? aiData.usage.daily_limit : 100} requêtes
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent > 80 ? "bg-destructive" : usagePercent > 50 ? "bg-amber-500" : "bg-primary"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {aiData ? `${aiData.usage.remaining} requêtes restantes aujourd'hui` : "Chargement..."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1.5"><Bot size={14} /> Moteur IA Actif</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5 mt-0.5">
              {aiData ? aiData.config.model : "gemini-3.5-flash"}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Plafond prompt : {aiData ? aiData.config.max_prompt_chars.toLocaleString() : "8 000"} caractères
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1.5"><Zap size={14} /> Compétences (Skills)</span>
            <Link to="/admin/ia/skills" className="text-primary hover:underline text-[11px]">
              Gérer
            </Link>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">{loading ? "—" : activeSkillsCount}</span>
            <span className="text-xs text-muted-foreground">/ {skills.length} actifs</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Prompts dynamiques personnalisés en base de données
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Confidentialité</span>
            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              AES-256
            </Badge>
          </div>
          <div className="text-sm font-semibold text-foreground pt-1">
            Coffre-fort sécurisé
          </div>
          <p className="text-[11px] text-muted-foreground">
            {aiData?.config.allow_contact_messages
              ? "Messages contact autorisés"
              : "Messages privés protégés par défaut"}
          </p>
        </div>
      </div>

      {/* Raccourcis d'action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/ia/assistant"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                Chat & Conversation
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Posez vos questions, demandez des formulations d'articles ou préparez des pitchs avec vos skills actifs.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span>Ouvrir l'assistant</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          to="/admin/ia/skills"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-purple-500/50 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-purple-500 transition-colors">
                Bibliothèque de Skills
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Consultez, modifiez ou créez des consignes expertes (études de cas, Telegram, réponses pro, vulgarisation).
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <span>Explorer les skills</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        <Link
          to="/admin/projets"
          className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-emerald-500/50 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                Éditeur de Projets
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Générez des études de cas structurées, des résumés accrocheurs et des tags technologiques directement dans vos fiches.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>Accéder aux projets</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* Aperçu des compétences actives */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap size={16} className="text-primary" />
            <span>Compétences IA configurées en base</span>
          </h2>
          <Button asChild variant="ghost" size="sm" className="text-xs text-primary">
            <Link to="/admin/ia/skills">Voir tout</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {skills.map((s) => (
            <div
              key={s.slug}
              className={`rounded-xl border p-3 flex flex-col justify-between text-xs transition-all ${
                s.is_active
                  ? "border-border bg-background/70 shadow-2xs"
                  : "border-border/40 bg-muted/20 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-foreground truncate">{s.title}</span>
                  {s.is_system && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1 shrink-0 text-primary border-primary/30">
                      Système
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-[11px] line-clamp-2">
                  {s.description || "Aucune description"}
                </p>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                <span className="font-mono text-primary/80">/{s.slug}</span>
                <span className={s.is_active ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                  {s.is_active ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
