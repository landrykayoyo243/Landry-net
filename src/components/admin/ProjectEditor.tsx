import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useBlocker, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Copy, Eye, Globe, ImagePlus, Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SortableList } from "@/components/admin/SortableList";
import { RichEditor } from "@/components/admin/RichEditor";
import { ConfirmDelete, FieldError } from "@/components/admin/ui";
import { ProjectBody, firstImage } from "@/components/portfolio/ProjectBody";
import { blockLabels, createBlock, newId, parseBlocks, safeUrl, slugify, starterTemplate, textDoc, type Block, type BlockType, type HeadingBlock, type ParagraphBlock, type MediaBlock, type MediaItem } from "@/lib/blocks";
import { uploadProjectImage, type ProjectRow } from "@/lib/admin-data";
import { ProjectAiAssistant } from "@/components/admin/ProjectAiAssistant";

type Form = {
  title: string; slug: string; tag: string; intro: string; summary: string;
  image_url: string; image_alt: string; technologies: string[]; external_url: string;
  featured: boolean; status: "draft" | "published"; content: Block[];
};

function fromRow(r: ProjectRow | null): Form {
  if (!r) return { title: "", slug: "", tag: "", intro: "", summary: "", image_url: "", image_alt: "", technologies: [], external_url: "", featured: false, status: "draft", content: starterTemplate() };
  return {
    title: r.title, slug: r.slug, tag: r.tag, intro: r.intro, summary: r.summary, image_url: r.image_url ?? "", image_alt: r.image_alt,
    technologies: r.technologies, external_url: r.external_url ?? "", featured: r.featured, status: r.status === "published" ? "published" : "draft",
    content: parseBlocks(r.content),
  };
}

function validate(f: Form) {
  const e: Record<string, string> = {};
  if (!f.title.trim()) e["title"] = "Le titre est obligatoire.";
  else if (f.title.length > 200) e["title"] = "200 caractères maximum.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) e["slug"] = "Lettres minuscules, chiffres et tirets uniquement.";
  if (f.external_url && !/^https?:\/\//.test(f.external_url)) e["external_url"] = "Adresse complète requise (https://…).";
  if (f.image_url && !f.image_alt.trim()) e["image_alt"] = "Décrivez l'image pour l'accessibilité.";
  if (f.summary.length > 600) e["summary"] = "600 caractères maximum.";
  return e;
}

export function ProjectEditor({
  row,
  nextOrder,
  asModal,
  onClose,
  onSaved,
}: {
  row: ProjectRow | null;
  nextOrder: number;
  asModal?: boolean;
  onClose?: () => void;
  onSaved?: () => Promise<unknown> | void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [id, setId] = useState<string | null>(row?.id ?? null);
  const [form, setForm] = useState<Form>(() => fromRow(row));
  const [slugTouched, setSlugTouched] = useState(!!row);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [deletingBlock, setDeletingBlock] = useState<Block | null>(null);
  const savingRef = useRef(false);

  const update = (patch: Partial<Form>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true); };

  async function save(opts: { silent?: boolean; status?: Form["status"] } = {}) {
    if (savingRef.current) return false;
    const data = { ...form, ...(opts.status ? { status: opts.status } : {}) };
    const errs = validate(data);
    if (!opts.silent) setErrors(errs);
    if (Object.keys(errs).length) { if (!opts.silent) toast.error("Corrigez les champs signalés avant d'enregistrer."); return false; }
    savingRef.current = true; setSaving(true);
    const payload = {
      title: data.title.trim(), slug: data.slug, tag: data.tag.trim(), intro: data.intro.trim(), summary: data.summary.trim(),
      image_url: data.image_url || null, image_alt: data.image_alt.trim(), technologies: data.technologies,
      external_url: data.external_url.trim() || null, featured: data.featured, status: data.status, content: data.content as never,
    };
    const res = id
      ? await supabase.from("projects").update(payload).eq("id", id).select("id").single()
      : await supabase.from("projects").insert({ ...payload, sort_order: nextOrder }).select("id").single();
    savingRef.current = false; setSaving(false);
    if (res.error) {
      if (!opts.silent) toast.error(res.error.code === "23505" ? "Ce slug est déjà utilisé par un autre projet." : "Enregistrement impossible. Réessayez.");
      if (res.error.code === "23505") setErrors((e) => ({ ...e, slug: "Ce slug est déjà utilisé." }));
      return false;
    }
    if (opts.status) setForm((f) => ({ ...f, status: opts.status! }));
    setDirty(false); setLastSaved(new Date());
    void qc.invalidateQueries({ queryKey: ["admin"] }); void qc.invalidateQueries({ queryKey: ["public"] });
    if (onSaved) await onSaved();
    if (!opts.silent) toast.success(opts.status === "published" ? "Projet publié" : "Projet enregistré");
    if (asModal) {
      if (onClose) onClose();
    } else if (!id) {
      setId(res.data.id);
      navigate({ to: "/admin/projets/$id", params: { id: res.data.id }, replace: true });
    }
    return true;
  }

  // Sauvegarde automatique des brouillons (uniquement hors modal pour éviter de fermer intempestivement)
  useEffect(() => {
    if (!dirty || form.status !== "draft" || asModal) return;
    const t = setTimeout(() => { void save({ silent: true }); }, 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, asModal]);

  useBlocker({
    shouldBlockFn: () => !asModal && dirty && !window.confirm("Des modifications ne sont pas enregistrées. Quitter quand même ?"),
    enableBeforeUnload: () => !asModal && dirty,
  });

  const [tagInput, setTagInput] = useState("");
  function addTech() {
    const v = tagInput.trim();
    if (v && !form.technologies.includes(v) && v.length <= 60) update({ technologies: [...form.technologies, v] });
    setTagInput("");
  }

  const [addType, setAddType] = useState<BlockType>("paragraph");
  const setBlock = (b: Block) => update({ content: form.content.map((x) => (x.id === b.id ? b : x)) });

  function insertBlockAfter(blockId: string, type: BlockType = "media") {
    const index = form.content.findIndex((b) => b.id === blockId);
    if (index === -1) return;
    const newBlock = createBlock(type);
    const updated = [
      ...form.content.slice(0, index + 1),
      newBlock,
      ...form.content.slice(index + 1),
    ];
    update({ content: updated });
    toast.success(type === "media" ? "Section média ajoutée dans cette section !" : "Bloc inséré !");
  }

  function insertBlockAtStart(type: BlockType = "media") {
    update({ content: [createBlock(type), ...form.content] });
    toast.success(type === "media" ? "Section média ajoutée au début !" : "Bloc inséré au début !");
  }

  const formSections = (
    <>
      <section className="space-y-4 rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6 shadow-xs">
        <h3 className="text-base sm:text-lg font-semibold">Fiche du projet</h3>
        <Field label="Titre *" error={errors["title"]}>
          <Input className="h-11 text-base sm:text-sm" value={form.title} onChange={(e) => update({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} />
        </Field>
        <Field label="Slug (adresse) *" error={errors["slug"]} hint={`/projets/${form.slug || "…"}`}>
          <Input className="h-11 text-base sm:text-sm" value={form.slug} onChange={(e) => { setSlugTouched(true); update({ slug: slugify(e.target.value) || e.target.value.toLowerCase() }); }} />
        </Field>
        <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
          <Field label="Statut affiché (étiquette)" hint="Ex. Projet personnel, En cours de développement"><Input className="h-11" value={form.tag} onChange={(e) => update({ tag: e.target.value })} /></Field>
          <Field label="Lien externe" error={errors["external_url"]}><Input className="h-11" type="url" placeholder="https://…" value={form.external_url} onChange={(e) => update({ external_url: e.target.value })} /></Field>
        </div>
        <Field label="Introduction" hint="Texte sous le titre de la page projet."><Textarea rows={3} value={form.intro} onChange={(e) => update({ intro: e.target.value })} /></Field>
        <Field label="Résumé / problème" error={errors["summary"]} hint="Affiché sur la carte du projet et dans l'aperçu de partage."><Textarea rows={2} value={form.summary} onChange={(e) => update({ summary: e.target.value })} /></Field>
        <div className="grid gap-3 sm:gap-5 sm:grid-cols-[180px_1fr]">
          <ImagePicker url={form.image_url} onChange={(url) => update({ image_url: url })} label="Image de couverture" />
          <Field label="Description de l'image" error={errors["image_alt"]}><Input className="h-11" value={form.image_alt} onChange={(e) => update({ image_alt: e.target.value })} /></Field>
        </div>
        <Field label="Technologies">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {form.technologies.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pl-3 pr-1 text-xs sm:text-sm font-semibold">
                {t}<button type="button" aria-label={`Retirer ${t}`} className="grid h-6 w-6 place-items-center rounded-full hover:bg-background" onClick={() => update({ technologies: form.technologies.filter((x) => x !== t) })}><X size={13} /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input className="h-11 flex-1 text-xs sm:text-sm" placeholder="Ex. React, Docker..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTech(); } }} />
            <Button type="button" variant="outline" className="h-11 shrink-0 px-3.5 text-xs sm:text-sm" onClick={addTech}>Ajouter</Button>
          </div>
        </Field>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Toggle label="Mis en avant sur l'accueil" checked={form.featured} onChange={(v) => update({ featured: v })} />
          <Toggle label={form.status === "published" ? "Publié" : "Brouillon"} checked={form.status === "published"} onChange={(v) => update({ status: v ? "published" : "draft" })} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6 shadow-xs">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">Étude de cas & Contenu détaillé</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Organisez vos sections, textes et médias explicatifs. Vous pouvez insérer des médias dans n'importe quelle section.
            </p>
          </div>
          {form.content.length === 0 && <Button type="button" variant="outline" className="min-h-10 text-xs sm:text-sm" onClick={() => update({ content: starterTemplate() })}>Utiliser le modèle guidé</Button>}
        </div>
        {form.content.length === 0 && <p className="mb-4 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Aucun bloc. Ajoutez-en un ci-dessous ou partez du modèle : Contexte, Problème, Solution, Mon rôle, Technologies, Résultats.</p>}
        
        <div className="space-y-3">
          <SortableList items={form.content} onReorder={(content) => update({ content })} render={(b, handle) => (
            <div className="rounded-xl sm:rounded-2xl border border-border bg-background p-3 sm:p-4 shadow-xs transition-shadow hover:shadow-sm">
              <div className="mb-2 flex items-center gap-1 pb-1">
                {handle}
                <span className="flex-1 text-xs font-semibold uppercase tracking-wide text-primary truncate">{blockLabels[b.type]}</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Dupliquer" onClick={() => { const i = form.content.findIndex((x) => x.id === b.id); const copy = { ...structuredClone(b), id: newId() }; update({ content: [...form.content.slice(0, i + 1), copy, ...form.content.slice(i + 1)] }); }}><Copy size={15} /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" aria-label="Supprimer le bloc" onClick={() => setDeletingBlock(b)}><Trash2 size={15} /></Button>
              </div>
              <BlockFields block={b} onChange={setBlock} />
            </div>
          )} />
        </div>

        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-2.5 pt-3 border-t border-border/60">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 w-full sm:w-auto gap-2"
            onClick={() => update({ content: [...form.content, createBlock("media")] })}
          >
            <ImagePlus size={16} /> + Ajouter une section média
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
            <select aria-label="Type de bloc" value={addType} onChange={(e) => setAddType(e.target.value as BlockType)} className="h-11 rounded-md border border-input bg-background px-3 text-xs sm:text-sm flex-1 sm:w-56">
              {(Object.keys(blockLabels) as BlockType[]).map((t) => <option key={t} value={t}>{blockLabels[t]}</option>)}
            </select>
            <Button type="button" variant="outline" className="min-h-11 shrink-0 gap-1 text-xs sm:text-sm" onClick={() => update({ content: [...form.content, createBlock(addType)] })}>
              <Plus size={14} /> Autre bloc
            </Button>
          </div>
        </div>
      </section>
    </>
  );

  const actionButtons = (
    <div className="flex flex-wrap items-center gap-2">
      {asModal && onClose && (
        <Button type="button" variant="outline" className="min-h-10 text-xs sm:text-sm flex-1 sm:flex-none" onClick={onClose}>Annuler</Button>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-10 text-xs sm:text-sm flex-1 sm:flex-none gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => setShowAiAssistant(true)}
      >
        <Sparkles size={15} /><span>Assistant IA</span>
      </Button>
      <Button type="button" variant="outline" className="min-h-10 text-xs sm:text-sm flex-1 sm:flex-none gap-1.5" onClick={() => setPreview(true)}>
        <Eye size={15} /><span>Aperçu</span>
      </Button>
      <Button type="button" variant="outline" className="min-h-10 text-xs sm:text-sm flex-1 sm:flex-none gap-1.5" disabled={saving} onClick={() => save()}>
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
        <span>Enregistrer</span>
      </Button>
      {form.status === "draft" && (
        <Button type="button" className="min-h-10 text-xs sm:text-sm flex-1 sm:flex-none bg-gradient-primary" disabled={saving} onClick={() => save({ status: "published" })}>
          Publier
        </Button>
      )}
    </div>
  );

  const dialogs = (
    <>
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[94dvh] h-[94dvh] w-[calc(100vw-1rem)] sm:w-[calc(100vw-3rem)] max-w-5xl overflow-y-auto p-0 rounded-2xl sm:rounded-3xl border border-border bg-background shadow-2xl">
          <DialogTitle className="sr-only">Aperçu du projet</DialogTitle>
          <Preview form={form} onClose={() => setPreview(false)} />
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={!!deletingBlock}
        onOpenChange={(o) => { if (!o) setDeletingBlock(null); }}
        title="Supprimer ce bloc ?"
        label={deletingBlock ? blockLabels[deletingBlock.type] : "Bloc"}
        description={`Le bloc « ${deletingBlock ? blockLabels[deletingBlock.type] : "sélectionné"} » sera retiré de l'étude de cas. Ses textes et contenus ne seront plus affichés.`}
        onConfirm={() => {
          if (deletingBlock) {
            update({ content: form.content.filter((x) => x.id !== deletingBlock.id) });
            toast.success("Bloc supprimé");
            setDeletingBlock(null);
          }
        }}
      />

      <ProjectAiAssistant
        open={showAiAssistant}
        onOpenChange={setShowAiAssistant}
        projectData={{
          title: form.title,
          tag: form.tag,
          intro: form.intro,
          summary: form.summary,
          technologies: form.technologies,
          content: form.content,
        }}
        onApplySummary={(intro, summary) => update({ intro, summary })}
        onApplyTechnologies={(technologies) => update({ technologies })}
        onApplyCaseStudyBlocks={(blocks) => update({ content: [...form.content, ...blocks] })}
        onAppendSingleSection={(secTitle, secContent) => {
          const heading = createBlock("heading") as HeadingBlock;
          heading.text = secTitle;
          heading.layout = "full";
          heading.tone = "plain";
          heading.variant = secTitle.toLowerCase().includes("résultat") ? "result" : "default";

          const paras = secContent
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean);

          const paraBlocks = paras.map((p) => {
            const b = createBlock("paragraph") as ParagraphBlock;
            b.doc = textDoc(p);
            return b;
          });

          update({ content: [...form.content, heading, ...paraBlocks] });
        }}
      />
    </>
  );

  if (asModal) {
    return (
      <div className="flex flex-col h-full max-h-[92dvh] min-h-0 w-full overflow-hidden bg-card">
        {/* En-tête fixe du modal */}
        <div className="shrink-0 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6 sm:py-3.5">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-base sm:text-lg font-bold leading-tight truncate">
              {row ? "Modifier le projet" : "Nouveau projet"}
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {dirty ? "Modifications non enregistrées" : "Renseignez les détails du projet"}
            </p>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={16} />
            </Button>
          )}
        </div>

        {/* Corps scrollable du modal */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5 min-w-0">
          {formSections}
        </div>

        {/* Pied d'actions fixe du modal */}
        <div className="shrink-0 border-t border-border bg-card px-3.5 py-3 sm:px-6">
          {actionButtons}
        </div>

        {dialogs}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="link" className="px-0"><Link to="/admin/projets"><ArrowLeft /> Tous les projets</Link></Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {saving ? "Enregistrement…" : dirty ? (form.status === "draft" ? "Modifications en cours — sauvegarde automatique" : "Modifications non enregistrées") : lastSaved ? `Enregistré à ${lastSaved.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
      </div>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">{row ? "Modifier le projet" : "Nouveau projet"}</h1>

      <div className="space-y-6">
        {formSections}
      </div>

      <div className="sticky bottom-0 z-20 mt-6 border-t border-border bg-card/95 py-3 backdrop-blur -mx-4 px-4 sm:mx-0 sm:rounded-2xl sm:border">
        {actionButtons}
      </div>

      {dialogs}
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border px-4">
      <span className="text-sm font-medium">{label}</span><Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function ImagePicker({ url, onChange, label }: { url: string; onChange: (url: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try { onChange(await uploadProjectImage(file)); toast.success("Image envoyée"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Envoi impossible."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <button type="button" onClick={() => input.current?.click()} className="relative grid aspect-[3/2] w-full place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground hover:border-primary">
        {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="flex flex-col items-center gap-1"><ImagePlus /> PNG, JPG, WEBP · 5 Mo</span>}
        {busy && <span className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="animate-spin" /></span>}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {url && <button type="button" className="text-xs font-semibold text-destructive" onClick={() => onChange("")}>Retirer l'image</button>}
    </div>
  );
}

function MediaBlockFields({ block, onChange }: { block: MediaBlock; onChange: (b: Block) => void }) {
  const multiInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMultiple, setUploadingMultiple] = useState(false);

  async function handleMultipleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingMultiple(true);
    try {
      const newItems: MediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const url = await uploadProjectImage(file);
        newItems.push({
          id: newId(),
          url,
          alt: "",
          title: "",
          caption: "",
        });
      }
      const existing = block.items.filter((it) => it.url.trim() !== "");
      onChange({ ...block, items: [...existing, ...newItems] });
      toast.success(`${newItems.length} média(s) importé(s) avec succès !`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi.");
    } finally {
      setUploadingMultiple(false);
      if (multiInputRef.current) multiInputRef.current.value = "";
    }
  }

  function addItem() {
    onChange({
      ...block,
      items: [
        ...block.items,
        { id: newId(), url: "", alt: "", title: "", caption: "" },
      ],
    });
  }

  function updateItem(index: number, patch: Partial<MediaItem>) {
    const next = [...block.items];
    const current = next[index];
    if (current) {
      next[index] = { ...current, ...patch };
      onChange({ ...block, items: next });
    }
  }

  function removeItem(index: number) {
    if (block.items.length <= 1) {
      updateItem(0, { url: "", alt: "", title: "", caption: "" });
      return;
    }
    onChange({
      ...block,
      items: block.items.filter((_, i) => i !== index),
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-muted/10 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="min-w-0 flex-1">
          <Input
            className="h-10 text-sm font-semibold"
            placeholder="Titre de la section (optionnel)"
            value={block.title ?? ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
          />
        </div>
        <select
          aria-label="Disposition"
          value={block.layout ?? "grid"}
          onChange={(e) => onChange({ ...block, layout: e.target.value as "grid" | "stacked" })}
          className="h-10 rounded-md border border-input bg-background px-3 text-xs sm:text-sm shrink-0"
        >
          <option value="grid">Galerie fluide</option>
          <option value="stacked">Grandes cartes</option>
        </select>
      </div>

      {/* Description de la section */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">
          Description de la section
        </label>
        <Textarea
          rows={3}
          className="text-xs sm:text-sm leading-relaxed"
          placeholder="Description de la section..."
          value={block.caption ?? ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
        />
      </div>

      {/* Images */}
      <div className="space-y-3 pt-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Images ({block.items.length})
        </span>

        <div className="grid gap-3 sm:grid-cols-2">
          {block.items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-3 space-y-2.5 shadow-2xs relative"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold">
                    {index + 1}
                  </span>
                  Image {index + 1}
                </span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline flex items-center gap-1"
                  onClick={() => removeItem(index)}
                  title="Supprimer"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>

              <ImagePicker
                url={item.url}
                label={`Image ${index + 1}`}
                onChange={(url) => updateItem(index, { url })}
              />

              <Input
                className="h-8 text-xs text-muted-foreground"
                placeholder="Légende (optionnelle)"
                value={item.caption || item.title || ""}
                onChange={(e) => updateItem(index, { caption: e.target.value, title: "" })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Boutons d'ajout */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
        <input
          ref={multiInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleMultipleFiles(e.target.files)}
          disabled={uploadingMultiple}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={() => multiInputRef.current?.click()}
          disabled={uploadingMultiple}
        >
          {uploadingMultiple ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
          Importer plusieurs images
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs font-semibold"
          onClick={addItem}
        >
          <Plus size={13} /> Ajouter une image
        </Button>
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "media": return <MediaBlockFields block={block as MediaBlock} onChange={onChange} />;
    case "heading": {
      const h = block as HeadingBlock;
      return (
        <div className="space-y-2">
          <Input className="h-11 text-base font-semibold" placeholder="Titre de section" value={h.text} onChange={(e) => onChange({ ...h, text: e.target.value })} />
          <div className="grid gap-2 sm:grid-cols-3">
            <select aria-label="Largeur" value={h.layout ?? "full"} onChange={(e) => onChange({ ...h, layout: e.target.value as HeadingBlock["layout"] })} className="h-10 rounded-md border border-input bg-background px-2 text-sm"><option value="full">Pleine largeur</option><option value="half">Demi-colonne</option></select>
            <select aria-label="Fond" value={h.tone ?? "plain"} onChange={(e) => onChange({ ...h, tone: e.target.value as HeadingBlock["tone"] })} className="h-10 rounded-md border border-input bg-background px-2 text-sm"><option value="plain">Fond blanc</option><option value="muted">Fond grisé</option></select>
            <select aria-label="Style" value={h.variant ?? "default"} onChange={(e) => onChange({ ...h, variant: e.target.value as HeadingBlock["variant"] })} className="h-10 rounded-md border border-input bg-background px-2 text-sm"><option value="default">Section simple</option><option value="steps">Étapes numérotées</option><option value="result">Résultat (coche)</option></select>
          </div>
        </div>
      );
    }
    case "subheading": return <Input className="h-11 font-semibold" placeholder="Sous-titre" value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />;
    case "paragraph": return <RichEditor value={block.doc} onChange={(doc) => onChange({ ...block, doc })} placeholder="Paragraphe" />;
    case "list": return (
      <div className="space-y-2">
        <select aria-label="Style de liste" value={block.style ?? "bullet"} onChange={(e) => onChange({ ...block, style: e.target.value as "bullet" })} className="h-10 rounded-md border border-input bg-background px-2 text-sm"><option value="bullet">Puces</option><option value="check">Coches</option><option value="tags">Étiquettes</option></select>
        <RichEditor value={block.doc} onChange={(doc) => onChange({ ...block, doc })} placeholder="Liste" />
      </div>
    );
    case "image": return (
      <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <ImagePicker url={block.url} label="Image" onChange={(url) => onChange({ ...block, url })} />
        <div className="space-y-2">
          <Input className="h-11" placeholder="Description de l'image (accessibilité)" value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })} />
          <Input className="h-11" placeholder="Titre de l'image" value={block.title ?? ""} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Textarea rows={2} placeholder="Légende" value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
          <Input className="h-11" placeholder="Note (ex. illustration explicative)" value={block.note ?? ""} onChange={(e) => onChange({ ...block, note: e.target.value })} />
        </div>
      </div>
    );
    case "quote": return (
      <div className="space-y-2">
        <RichEditor value={block.doc} lists={false} onChange={(doc) => onChange({ ...block, doc })} placeholder="Citation" />
        <Input className="h-11" placeholder="Auteur (facultatif)" value={block.cite ?? ""} onChange={(e) => onChange({ ...block, cite: e.target.value })} />
      </div>
    );
    case "code": return <Textarea rows={5} className="font-mono text-sm" placeholder="Code" value={block.code} onChange={(e) => onChange({ ...block, code: e.target.value })} />;
    case "button": return (
      <div className="grid gap-2 sm:grid-cols-2">
        <Input className="h-11" placeholder="Texte du bouton" value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
        <Input className="h-11" type="url" placeholder="https://…" value={block.url} onChange={(e) => onChange({ ...block, url: e.target.value })} />
        {block.url && !safeUrl(block.url) && <p className="text-sm text-destructive">Adresse non valide : le bouton ne sera pas affiché.</p>}
      </div>
    );
    case "divider": return <hr className="my-2 border-border" />;
  }
}

/** Aperçu fidèle : mêmes composants que la page publique, optimisé responsive mobile. */
function Preview({ form, onClose }: { form: Form; onClose?: () => void }) {
  const hero = useMemo(() => firstImage(form.content), [form.content]);
  const container = "mx-auto w-full max-w-5xl px-4 sm:px-6 md:px-8";
  const cover = form.image_url || hero?.url;
  return (
    <div className="bg-background pb-12 pt-14 sm:pt-12 text-foreground min-w-0">
      {/* Bandeau d'aperçu propre */}
      <div className="mx-3 sm:mx-6 md:mx-8 mb-6 flex items-center justify-between gap-3 rounded-full bg-accent/80 border border-primary/20 px-3.5 sm:px-5 py-2 text-xs font-semibold text-primary">
        <span className="flex items-center gap-1.5 truncate">
          <Sparkles size={13} className="shrink-0" />
          <span className="truncate">Aperçu · {form.status === "published" ? "Publié" : "Brouillon privé"}</span>
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted-foreground hover:text-foreground text-[11px] underline underline-offset-2"
          >
            Fermer
          </button>
        )}
      </div>

      <section className={container}>
        <p className="mb-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wide text-primary">
          Étude de cas · {form.tag || "Projet"}
        </p>
        <h1 className="max-w-4xl text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight break-words">
          {form.title || "Titre du projet"}
        </h1>
        {form.intro && (
          <p className="mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground">
            {form.intro}
          </p>
        )}
        {form.technologies.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-1.5 sm:gap-2">
            {form.technologies.map((t) => (
              <li key={t} className="rounded-full border border-border bg-secondary/60 px-2.5 sm:px-3 py-1 text-xs font-semibold">
                {t}
              </li>
            ))}
          </ul>
        )}
        {safeUrl(form.external_url) && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" className="rounded-full bg-gradient-primary w-full sm:w-auto">
              <Globe /> Voir le projet en ligne <ArrowUpRight />
            </Button>
          </div>
        )}
        {cover && (
          <div className="mt-8 sm:mt-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-card shadow-sm">
            <img
              src={cover}
              alt={form.image_alt || hero?.alt || form.title}
              className="aspect-[16/10] sm:aspect-[16/9] w-full object-cover"
            />
          </div>
        )}
        {hero?.note && <p className="mt-2 text-xs text-muted-foreground">{hero.note}</p>}
      </section>
      <ProjectBody blocks={form.content} />
    </div>
  );
}
