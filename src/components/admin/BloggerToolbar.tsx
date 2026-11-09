import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Link2,
  ImagePlus,
  Video,
  Table as TableIcon,
  Minus,
  Undo,
  Redo,
  ChevronDown,
  CodeXml,
  PenTool,
  RemoveFormatting,
  Rows3,
  Columns3,
  Trash2,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export interface BloggerToolbarProps {
  editor: Editor | null;
  mode: "wysiwyg" | "html";
  onModeChange: (nextMode: "wysiwyg" | "html") => void;
  onOpenMedia: () => void;
  onOpenLink: () => void;
  onOpenVideo: () => void;
  onOpenTable: () => void;
}

export function BloggerToolbar({
  editor,
  mode,
  onModeChange,
  onOpenMedia,
  onOpenLink,
  onOpenVideo,
  onOpenTable,
}: BloggerToolbarProps) {
  const isWysiwyg = mode === "wysiwyg";

  // Helper pour état actif d'un bouton avec hit-box propre et responsive
  const btnClass = (active: boolean) =>
    `inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium transition-colors select-none cursor-pointer active:scale-95 ${
      active
        ? "bg-primary/15 text-primary font-bold shadow-2xs"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const currentHeading = () => {
    if (!editor || !isWysiwyg) return "Paragraphe";
    if (editor.isActive("heading", { level: 1 })) return "Titre 1";
    if (editor.isActive("heading", { level: 2 })) return "Titre 2";
    if (editor.isActive("heading", { level: 3 })) return "Titre 3";
    return "Paragraphe";
  };

  const currentAlign = () => {
    if (!editor || !isWysiwyg) return "left";
    if (editor.isActive({ textAlign: "center" })) return "center";
    if (editor.isActive({ textAlign: "right" })) return "right";
    if (editor.isActive({ textAlign: "justify" })) return "justify";
    return "left";
  };

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card px-2.5 sm:px-4 py-1.5 text-xs select-none overflow-x-auto whitespace-nowrap scrollbar-none sm:flex-wrap">
      {/* ── 1. SÉLECTEUR DE MODE (Style Blogger exact) ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1.5 px-2 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
            title="Changer de mode d'édition"
          >
            {mode === "html" ? (
              <>
                <CodeXml size={15} className="text-primary shrink-0" />
                <span className="hidden sm:inline">HTML</span>
              </>
            ) : (
              <>
                <PenTool size={15} className="text-primary shrink-0" />
                <span className="hidden sm:inline">Rédiger</span>
              </>
            )}
            <ChevronDown size={13} className="text-muted-foreground opacity-70 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 bg-card border border-border shadow-xl z-50">
          <DropdownMenuItem
            onClick={() => onModeChange("html")}
            className={`flex items-center gap-2 text-xs py-2 cursor-pointer ${
              mode === "html" ? "bg-primary/10 text-primary font-semibold" : ""
            }`}
          >
            <CodeXml size={16} />
            <span>Affichage HTML</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onModeChange("wysiwyg")}
            className={`flex items-center gap-2 text-xs py-2 cursor-pointer ${
              mode === "wysiwyg" ? "bg-primary/10 text-primary font-semibold" : ""
            }`}
          >
            <PenTool size={16} />
            <span>Affichage &quot;Rédiger&quot;</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 2. ANNULER / RÉTABLIR ── */}
      <button
        type="button"
        title="Annuler (Ctrl+Z)"
        disabled={!editor || !isWysiwyg || !editor.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
        className={`${btnClass(false)} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Undo size={14} />
      </button>
      <button
        type="button"
        title="Rétablir (Ctrl+Y)"
        disabled={!editor || !isWysiwyg || !editor.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
        className={`${btnClass(false)} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        <Redo size={14} />
      </button>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 3. TITRES ET STYLES DE PARAGRAPHE ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!isWysiwyg || !editor}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 gap-1 px-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="truncate max-w-[90px]">{currentHeading()}</span>
            <ChevronDown size={12} className="text-muted-foreground opacity-60 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40 bg-card border border-border shadow-xl z-50">
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setParagraph().run()}
            className="text-xs py-1.5 cursor-pointer"
          >
            Paragraphe
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className="text-base font-bold py-1.5 cursor-pointer"
          >
            Titre 1 (H1)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className="text-sm font-semibold py-1.5 cursor-pointer"
          >
            Titre 2 (H2)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className="text-xs font-semibold py-1.5 cursor-pointer"
          >
            Titre 3 (H3)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 4. GRAS, ITALIQUE, SOULIGNÉ, BARRÉ ── */}
      <button
        type="button"
        title="Gras (Ctrl+B)"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        className={btnClass(!!editor?.isActive("bold"))}
      >
        <Bold size={14} />
      </button>

      <button
        type="button"
        title="Italique (Ctrl+I)"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        className={btnClass(!!editor?.isActive("italic"))}
      >
        <Italic size={14} />
      </button>

      <button
        type="button"
        title="Souligné (Ctrl+U)"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        className={btnClass(!!editor?.isActive("underline"))}
      >
        <Underline size={14} />
      </button>

      <button
        type="button"
        title="Barré"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        className={btnClass(!!editor?.isActive("strike"))}
      >
        <Strikethrough size={14} />
      </button>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 5. ALIGNEMENTS ── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!isWysiwyg || !editor}>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Alignement du texte"
          >
            {currentAlign() === "center" && <AlignCenter size={14} />}
            {currentAlign() === "right" && <AlignRight size={14} />}
            {currentAlign() === "justify" && <AlignJustify size={14} />}
            {currentAlign() === "left" && <AlignLeft size={14} />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36 bg-card border border-border shadow-xl z-50">
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
            className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
          >
            <AlignLeft size={14} /> Gauche
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
            className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
          >
            <AlignCenter size={14} /> Centré
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
            className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
          >
            <AlignRight size={14} /> Droite
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
            className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
          >
            <AlignJustify size={14} /> Justifié
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 6. LISTES À PUCES ET NUMÉROTÉES ── */}
      <button
        type="button"
        title="Liste à puces"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        className={btnClass(!!editor?.isActive("bulletList"))}
      >
        <List size={14} />
      </button>

      <button
        type="button"
        title="Liste numérotée"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        className={btnClass(!!editor?.isActive("orderedList"))}
      >
        <ListOrdered size={14} />
      </button>

      <button
        type="button"
        title="Citation (Blockquote)"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        className={btnClass(!!editor?.isActive("blockquote"))}
      >
        <Quote size={14} />
      </button>

      <button
        type="button"
        title="Bloc de code"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        className={btnClass(!!editor?.isActive("codeBlock"))}
      >
        <Code size={14} />
      </button>

      <div className="h-4 w-px bg-border/80 mx-1 shrink-0" />

      {/* ── 7. INSERTION (Lien, Image, Vidéo, Table, Séparateur) ── */}
      <button
        type="button"
        title="Insérer un lien (Ctrl+K)"
        disabled={!isWysiwyg || !editor}
        onClick={onOpenLink}
        className={btnClass(!!editor?.isActive("link"))}
      >
        <Link2 size={14} />
      </button>

      <button
        type="button"
        title="Insérer une image ou média"
        disabled={!isWysiwyg || !editor}
        onClick={onOpenMedia}
        className={btnClass(false)}
      >
        <ImagePlus size={14} />
      </button>

      <button
        type="button"
        title="Insérer une vidéo (YouTube / Vimeo)"
        disabled={!isWysiwyg || !editor}
        onClick={onOpenVideo}
        className={btnClass(false)}
      >
        <Video size={14} />
      </button>

      {/* Menu Tableau */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!isWysiwyg || !editor}>
          <button
            type="button"
            title="Options de tableau"
            className={btnClass(!!editor?.isActive("table"))}
          >
            <TableIcon size={14} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 bg-card border border-border shadow-xl z-50">
          <DropdownMenuItem onClick={onOpenTable} className="text-xs py-1.5 flex items-center gap-2 cursor-pointer">
            <Plus size={14} /> Insérer un tableau...
          </DropdownMenuItem>
          {editor?.isActive("table") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().addRowAfter().run()}
                className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
              >
                <Rows3 size={14} /> Ajouter une ligne
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
                className="text-xs py-1.5 flex items-center gap-2 cursor-pointer"
              >
                <Columns3 size={14} /> Ajouter une colonne
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().deleteRow().run()}
                className="text-xs py-1.5 flex items-center gap-2 cursor-pointer text-destructive"
              >
                <Trash2 size={14} /> Supprimer la ligne
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().deleteColumn().run()}
                className="text-xs py-1.5 flex items-center gap-2 cursor-pointer text-destructive"
              >
                <Trash2 size={14} /> Supprimer la colonne
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => editor?.chain().focus().deleteTable().run()}
                className="text-xs py-1.5 flex items-center gap-2 cursor-pointer text-destructive"
              >
                <Trash2 size={14} /> Supprimer le tableau
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        title="Séparateur horizontal"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        className={btnClass(false)}
      >
        <Minus size={14} />
      </button>

      <button
        type="button"
        title="Effacer le formatage"
        disabled={!isWysiwyg || !editor}
        onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        className={btnClass(false)}
      >
        <RemoveFormatting size={14} />
      </button>
    </div>
  );
}
