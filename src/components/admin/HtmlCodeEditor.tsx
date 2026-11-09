import { useState, useEffect, useRef } from "react";
import { Copy, Check, CodeXml, Wand2, WrapText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatHtml } from "@/lib/formatHtml";

export function HtmlCodeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineGutterRef = useRef<HTMLDivElement>(null);
  const linesCount = (value.match(/\n/g) || []).length + 1;

  // Auto-formate à l'ouverture si le HTML est sur une seule ligne avec des balises
  useEffect(() => {
    if (value && value.includes("<") && value.includes(">")) {
      const lineCount = (value.match(/\n/g) || []).length;
      if (lineCount < 2 && value.length > 20) {
        const formatted = formatHtml(value);
        if (formatted !== value) {
          onChange(formatted);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Code HTML copié dans le presse-papiers");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFormat() {
    const formatted = formatHtml(value);
    if (formatted !== value) {
      onChange(formatted);
      toast.success("Code HTML structuré et indenté selon les balises propres !");
    } else {
      toast.info("Le code HTML est déjà propre et bien indenté.");
    }
  }

  // Permet la tabulation (Tab) dans le textarea pour indenter proprement
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const newVal = val.substring(0, start) + "  " + val.substring(end);
      onChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  }

  // Synchronisation du scroll vertical entre le textarea et la gouttière des numéros de ligne
  function handleScroll(e: React.UIEvent<HTMLTextAreaElement>) {
    if (lineGutterRef.current) {
      lineGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }

  return (
    <div className="relative flex flex-col h-full w-full min-h-[460px] rounded-xl border border-border bg-card overflow-hidden shadow-2xs font-mono">
      {/* Barre d'état et actions HTML */}
      <div className="shrink-0 flex items-center justify-between border-b border-border/80 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground select-none gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CodeXml size={14} className="text-primary" />
          <span className="font-semibold text-foreground text-[11px]">Éditeur de code HTML</span>
          <span className="text-[10px] bg-secondary text-secondary-foreground font-medium px-2 py-0.5 rounded-full">
            {linesCount} ligne{linesCount > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFormat}
            className="h-7 px-2.5 text-[11px] gap-1 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50 font-medium"
            title="Indenter et organiser proprement selon les balises HTML"
          >
            <Wand2 size={12} />
            <span>Formater balises</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWrapLines(!wrapLines)}
            className={`h-7 px-2 text-[11px] gap-1 ${
              wrapLines ? "text-primary bg-primary/10 font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
            title={wrapLines ? "Désactiver le retour à la ligne auto" : "Activer le retour à la ligne auto"}
          >
            <WrapText size={12} />
            <span className="hidden sm:inline">{wrapLines ? "Wrap activé" : "Wrap"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyCode}
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copied ? "Copié" : "Copier"}</span>
          </Button>
        </div>
      </div>

      {/* Zone de code avec numéros de lignes synchronisés */}
      <div className="relative flex-1 flex min-h-0 bg-background overflow-hidden">
        {/* Colonne numéros de ligne synchronisée */}
        <div
          ref={lineGutterRef}
          className="shrink-0 select-none border-r border-border/60 bg-muted/20 px-3 py-4 text-right text-xs font-mono text-muted-foreground/50 leading-6 overflow-hidden"
          style={{ width: "3.5rem" }}
          aria-hidden
        >
          {Array.from({ length: Math.max(linesCount, 15) }, (_, i) => (
            <div key={i + 1} className="h-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea code source */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder="<h1>Titre...</h1>&#10;<p>Rédigez votre code HTML ici...</p>"
          spellCheck={false}
          className={`flex-1 resize-none border-0 bg-transparent p-4 text-xs sm:text-sm font-mono text-foreground leading-6 focus:outline-none focus:ring-0 overflow-y-auto ${
            wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
          }`}
        />
      </div>
    </div>
  );
}
