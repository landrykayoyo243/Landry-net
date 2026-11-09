import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link2, Video, Table as TableIcon, Trash2 } from "lucide-react";
import { safeUrl } from "@/lib/blocks";

export function LinkInsertDialog({
  open,
  initialUrl = "",
  initialText = "",
  onClose,
  onConfirm,
  onRemove,
}: {
  open: boolean;
  initialUrl?: string;
  initialText?: string;
  onClose: () => void;
  onConfirm: (url: string, text?: string) => void;
  onRemove?: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl || "https://");
      setText(initialText || "");
      setError("");
      setTimeout(() => inputRef.current?.select(), 80);
    }
  }, [open, initialUrl, initialText]);

  function handleConfirm() {
    const trimmed = url.trim();
    if (!trimmed) {
      if (onRemove) onRemove();
      onClose();
      return;
    }
    const safe = safeUrl(trimmed);
    if (!safe) {
      setError("Adresse non valide. Utilisez https://, mailto: ou tel:");
      return;
    }
    onConfirm(safe, text.trim() || undefined);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:rounded-3xl p-5 shadow-2xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Link2 size={18} className="text-primary" />
            {initialUrl ? "Modifier le lien" : "Insérer un lien"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="link-href" className="text-xs font-semibold">
              Adresse web (URL)
            </Label>
            <Input
              id="link-href"
              ref={inputRef}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              placeholder="https://exemple.com"
              className="h-10 text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="link-text" className="text-xs font-semibold">
              Texte à afficher (optionnel)
            </Label>
            <Input
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Texte du lien"
              className="h-10 text-xs sm:text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          {initialUrl && onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:bg-destructive/10"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              <Trash2 size={13} /> Supprimer
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="text-xs bg-gradient-primary"
            >
              Appliquer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VideoInsertDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  function handleConfirm() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Veuillez saisir une URL de vidéo.");
      return;
    }
    // Simple validation
    if (!trimmed.includes("youtube.com") && !trimmed.includes("youtu.be") && !trimmed.includes("vimeo.com")) {
      setError("Veuillez entrer une adresse YouTube ou Vimeo valide.");
      return;
    }
    onConfirm(trimmed);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-sm rounded-2xl sm:rounded-3xl p-5 shadow-2xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Video size={18} className="text-primary" />
            Insérer une vidéo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="video-url" className="text-xs font-semibold">
              Lien YouTube ou Vimeo
            </Label>
            <Input
              id="video-url"
              ref={inputRef}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="h-10 text-xs sm:text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground">
              La vidéo s'affichera directement dans un lecteur responsive au sein de l'article.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="text-xs bg-gradient-primary"
          >
            Insérer la vidéo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TableInsertDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (rows: number, cols: number) => void;
}) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-xs rounded-2xl sm:rounded-3xl p-5 shadow-2xl border border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <TableIcon size={18} className="text-primary" />
            Insérer un tableau
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Lignes</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Colonnes</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onConfirm(rows, cols);
              onClose();
            }}
            className="text-xs bg-gradient-primary"
          >
            Créer le tableau
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
