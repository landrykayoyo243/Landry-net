import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  History,
  Lock,
  Code2,
  Zap,
  Search,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminApi, type AiSkill, type AiSkillVersion } from "@/lib/admin-api-client";
import { IaSubNav } from "@/components/admin/IaSubNav";

export const Route = createFileRoute("/admin/ia/skills")({
  component: AdminIaSkillsPage,
});

const SLUG_REGEX = /^[a-z0-9-]+$/;

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SkillFormModal({
  skill,
  open,
  onClose,
  onSaved,
}: {
  skill: AiSkill | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !skill;
  const [title, setTitle] = useState(skill?.title ?? "");
  const [slug, setSlug] = useState(skill?.slug ?? "");
  const [description, setDescription] = useState(skill?.description ?? "");
  const [content, setContent] = useState(skill?.content ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(skill?.title ?? "");
    setSlug(skill?.slug ?? "");
    setDescription(skill?.description ?? "");
    setContent(skill?.content ?? "");
    setSlugTouched(false);
  }, [skill, open]);

  const handleTitleChange = (v: string) => {
    setTitle(v);
    if (!slugTouched && isNew) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Le titre est requis.");
    if (!content.trim()) return toast.error("Le prompt système est requis.");
    if (isNew && (!slug.trim() || !SLUG_REGEX.test(slug))) {
      return toast.error("Le slug ne doit contenir que des lettres minuscules, chiffres et tirets.");
    }

    try {
      setSaving(true);
      if (isNew) {
        await adminApi.createSkill({ slug, title, description, content });
        toast.success(`Skill « ${title} » créé avec succès.`);
      } else {
        await adminApi.updateSkill({ id: skill!.id, title, description, content });
        toast.success(`Skill « ${title} » mis à jour.`);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Zap size={18} className="text-primary shrink-0" />
            <span className="truncate">{isNew ? "Créer un skill IA" : `Modifier « ${skill!.title} »`}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Les skills sont des consignes expertes stockées en base et injectées dynamiquement à l'IA.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-title" className="text-xs font-semibold">Titre de la compétence *</Label>
            <Input
              id="skill-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Rédacteur d'Étude de Cas"
              required
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-slug" className="text-xs font-semibold">
              Identifiant unique (slug) *
            </Label>
            <Input
              id="skill-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              disabled={!isNew}
              placeholder="ex: redaction-etude-de-cas"
              required
              className="h-10 text-sm font-mono rounded-xl"
            />
            {!isNew && (
              <p className="text-[11px] text-muted-foreground">L'identifiant ne peut plus être modifié une fois créé.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-desc" className="text-xs font-semibold">Description courte</Label>
            <Input
              id="skill-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Structure et rédige des études de cas détaillées avec suggestions d'images..."
              className="h-10 text-sm rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skill-content" className="text-xs font-semibold">
              Prompt système (Instructions détaillées pour l'IA) *
            </Label>
            <textarea
              id="skill-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tu es un expert en... Tes consignes sont : 1. ..., 2. ..."
              rows={8}
              required
              className="w-full rounded-xl border border-input bg-background p-3 text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              size="sm"
              className="rounded-xl bg-gradient-primary text-primary-foreground text-xs shadow-xs"
            >
              {saving ? "Enregistrement..." : isNew ? "Créer le skill" : "Mettre à jour"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SkillHistoryModal({
  skill,
  open,
  onClose,
  onRollback,
}: {
  skill: AiSkill | null;
  open: boolean;
  onClose: () => void;
  onRollback: (version: AiSkillVersion) => void;
}) {
  const [versions, setVersions] = useState<AiSkillVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (skill && open) {
      setLoading(true);
      adminApi
        .getSkillVersions(skill.id)
        .then(setVersions)
        .catch(() => toast.error("Impossible de charger l'historique."))
        .finally(() => setLoading(false));
    }
  }, [skill, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
            <History size={16} className="text-primary shrink-0" />
            <span className="truncate">Historique — {skill?.title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Chaque modification crée un instantané immuable que vous pouvez restaurer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Chargement des versions...</div>
          ) : versions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">Aucune version archivée pour ce skill.</div>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="rounded-xl border border-border bg-card p-3 sm:p-3.5 space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="font-semibold text-foreground">Version {v.version}</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <span className="text-[11px] text-muted-foreground">{formatDate(v.created_at)}</span>
                    {!skill?.is_system && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onRollback(v)}
                        className="h-7 text-[11px] gap-1 rounded-lg"
                      >
                        <RotateCcw size={11} /> Restaurer
                      </Button>
                    )}
                  </div>
                </div>
                <pre className="p-2.5 rounded-lg bg-muted/60 text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto border border-border/40 text-muted-foreground [overflow-wrap:anywhere] break-words">
                  {v.content}
                </pre>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SkillCard({
  skill,
  onToggle,
  onEdit,
  onDelete,
  onHistory,
}: {
  skill: AiSkill;
  onToggle: (s: AiSkill) => void;
  onEdit: (s: AiSkill) => void;
  onDelete: (s: AiSkill) => void;
  onHistory: (s: AiSkill) => void;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <Card className={`rounded-2xl border transition-all ${skill.is_active ? "border-border bg-card shadow-xs" : "border-border/40 bg-muted/10 opacity-70"}`}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Ligne haute : titre, badges, switch */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-foreground truncate">{skill.title}</h3>
              {skill.is_system && (
                <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5 font-semibold text-primary bg-primary/10 border-primary/20">
                  <Lock size={9} /> Système
                </Badge>
              )}
              <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 text-muted-foreground">
                v{skill.version}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {skill.description || "Aucune description renseignée."}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <Switch
              checked={skill.is_active}
              onCheckedChange={() => onToggle(skill)}
              aria-label={skill.is_active ? "Désactiver le skill" : "Activer le skill"}
            />
          </div>
        </div>

        {/* Ligne basse : slug & actions */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/50 text-xs">
          <span className="font-mono text-[11px] text-primary/80 truncate min-w-0 flex-1">
            /{skill.slug}
          </span>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title="Aperçu des consignes"
              aria-label="Aperçu des consignes"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onHistory(skill)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
              title="Historique des versions"
              aria-label="Historique des versions"
            >
              <History size={14} />
            </Button>
            {!skill.is_system && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(skill)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  title="Modifier"
                  aria-label="Modifier le skill"
                >
                  <Edit3 size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(skill)}
                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                  title="Supprimer"
                  aria-label="Supprimer le skill"
                >
                  <Trash2 size={14} />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Aperçu rétractable du contenu */}
        {showPreview && (
          <div className="rounded-xl bg-muted/40 border border-border/60 p-3 animate-in fade-in-50 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Code2 size={12} />
              <span>Prompt système configuré en base</span>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto [overflow-wrap:anywhere] break-words">
              {skill.content}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminIaSkillsPage() {
  const [skills, setSkills] = useState<AiSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editSkill, setEditSkill] = useState<AiSkill | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [historySkill, setHistorySkill] = useState<AiSkill | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AiSkill | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminApi.listSkills();
      setSkills(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement des skills.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggle = async (skill: AiSkill) => {
    try {
      await adminApi.updateSkill({ id: skill.id, is_active: !skill.is_active });
      setSkills((prev) =>
        prev.map((s) => (s.id === skill.id ? { ...s, is_active: !s.is_active } : s))
      );
      toast.success(skill.is_active ? `Skill « ${skill.title} » désactivé.` : `Skill « ${skill.title} » activé.`);
    } catch (err) {
      toast.error("Impossible de modifier le statut.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteSkill(deleteTarget.id);
      setSkills((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`Skill « ${deleteTarget.title} » supprimé.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  };

  const handleRollback = async (version: AiSkillVersion) => {
    if (!historySkill) return;
    try {
      await adminApi.updateSkill({
        id: historySkill.id,
        content: version.content,
      });
      toast.success(`Skill restauré à la version ${version.version}.`);
      setShowHistory(false);
      load();
    } catch (err) {
      toast.error("Échec de la restauration de version.");
    }
  };

  const filtered = skills.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-foreground">
            <Zap size={20} className="text-primary shrink-0 sm:hidden" />
            <Zap size={22} className="text-primary shrink-0 hidden sm:block" />
            <span className="truncate">Skills IA (Consignes)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">
            Gérez les compétences de votre assistant stockées en base de données pour orienter la rédaction.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditSkill(null);
            setShowForm(true);
          }}
          size="sm"
          className="rounded-full bg-gradient-primary text-primary-foreground shadow-sm text-xs gap-1.5 h-9 w-full sm:w-auto justify-center"
        >
          <Plus size={15} />
          <span>Nouveau Skill</span>
        </Button>
      </div>

      <IaSubNav />

      {/* Barre de recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un skill par nom, slug ou description…"
          className="pl-9 h-10 rounded-xl text-xs sm:text-sm bg-card"
        />
      </div>

      {/* Liste des skills */}
      {loading ? (
        <div className="py-12 text-center text-xs text-muted-foreground">Chargement des compétences...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Aucun skill trouvé</p>
          <p className="text-xs text-muted-foreground">
            {search ? "Modifiez votre recherche." : "Créez votre premier skill dynamique."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onEdit={(s) => {
                setEditSkill(s);
                setShowForm(true);
              }}
              onDelete={setDeleteTarget}
              onHistory={(s) => {
                setHistorySkill(s);
                setShowHistory(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      <SkillFormModal
        skill={editSkill}
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
      />

      <SkillHistoryModal
        skill={historySkill}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRollback={handleRollback}
      />

      {/* Confirmation suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">
              Supprimer le skill ?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement le skill « {deleteTarget?.title} » ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="rounded-xl text-xs">
              Annuler
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-xl text-xs">
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
