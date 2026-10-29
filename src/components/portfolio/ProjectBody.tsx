import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Globe, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { InlineItem, RichText } from "@/components/portfolio/RichText";
import { listItems, safeUrl, type Block, type HeadingBlock, type ImageBlock, type MediaBlock } from "@/lib/blocks";
import { getOptimizedImageUrl } from "@/lib/siteConfig";

const container = "mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8";
const pText = "mt-3 sm:mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground break-words";
const pResult = "mt-3 sm:mt-4 max-w-3xl text-base sm:text-xl leading-relaxed text-foreground/90 break-words";

type Section = { heading?: HeadingBlock; children: Block[] };
type Group = { kind: "half"; tone: "plain" | "muted"; sections: Section[] } | { kind: "full"; section: Section };

function toSections(blocks: Block[]): Section[] {
  const out: Section[] = [];
  for (const b of blocks) {
    if (b.type === "heading") out.push({ heading: b, children: [] });
    else {
      if (out.length === 0) out.push({ children: [] });
      out[out.length - 1]!.children.push(b);
    }
  }
  return out;
}

function toGroups(sections: Section[]): Group[] {
  const groups: Group[] = [];
  for (const s of sections) {
    const h = s.heading;
    const isHalf = h?.layout === "half" && h.variant !== "steps" && h.variant !== "result";
    const tone = h?.tone === "muted" ? "muted" : "plain";
    const last = groups[groups.length - 1];
    if (isHalf && last?.kind === "half" && last.tone === tone && last.sections.length < 2) last.sections.push(s);
    else if (isHalf) groups.push({ kind: "half", tone, sections: [s] });
    else groups.push({ kind: "full", section: s });
  }
  return groups;
}

const isPlainFull = (g: Group | undefined) => g?.kind === "full" && g.section.heading?.tone !== "muted";

export interface ImageViewerItem {
  url: string;
  alt?: string;
  title?: string;
  caption?: string;
  note?: string;
}

export function ImageViewerDialog({
  open,
  onOpenChange,
  items,
  initialIndex = 0,
  globalTitle,
  globalCaption,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ImageViewerItem[];
  initialIndex?: number;
  globalTitle?: string;
  globalCaption?: string;
}) {
  const validItems = items.filter((it) => !!safeUrl(it.url));
  const total = validItems.length;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex >= 0 && initialIndex < total ? initialIndex : 0);
    }
  }, [open, initialIndex, total]);

  const safeIndex = total === 0 ? 0 : (currentIndex >= total ? 0 : currentIndex < 0 ? total - 1 : currentIndex);
  const currentItem = validItems[safeIndex];

  const prev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((i) => (i <= 0 ? total - 1 : i - 1));
  }, [total]);

  const next = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((i) => (i >= total - 1 ? 0 : i + 1));
  }, [total]);

  useEffect(() => {
    if (!open || total <= 1) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, total, prev, next]);

  if (!currentItem) return null;

  const currentTitle = getCleanTitle(currentItem.title) || globalTitle || currentItem.alt || "Aperçu du visuel";
  const currentCaption = currentItem.caption?.trim() || globalCaption?.trim();
  const currentNote = currentItem.note?.trim();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    setTouchStartX(e.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (total <= 1 || touchStartX === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? null;
    if (touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStartX(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2.5rem)] md:w-full md:max-w-4xl lg:max-w-5xl max-h-[92dvh] sm:max-h-[94dvh] p-3 sm:p-5 md:p-6 bg-card/95 backdrop-blur-md border border-border/90 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden"
      >
        {/* Header avec titre, note, compteur et bouton de fermeture */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5 sm:pb-3 pr-10 min-w-0 shrink-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate">
              {currentTitle}
            </DialogTitle>
            {currentNote ? (
              <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                {currentNote}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">
                Aperçu agrandi de l'image
              </DialogDescription>
            )}
          </div>
          {total > 1 && (
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 shrink-0">
              {safeIndex + 1} / {total}
            </span>
          )}
        </div>

        {/* Zone centrale image avec support tactile et flèches */}
        <div
          className="relative flex-1 min-h-0 flex items-center justify-center rounded-xl sm:rounded-2xl bg-black/5 dark:bg-black/30 overflow-hidden my-2.5 sm:my-3 select-none touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={getOptimizedImageUrl(safeUrl(currentItem.url), { width: 1600 })}
            alt={currentItem.alt || currentTitle}
            decoding="async"
            className="max-h-[46vh] sm:max-h-[60vh] md:max-h-[68vh] w-auto max-w-full h-auto object-contain mx-auto rounded-lg transition-transform duration-200"
          />

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Image précédente"
                className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/60 hover:bg-black/85 text-white shadow-lg backdrop-blur-xs transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Image suivante"
                className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/60 hover:bg-black/85 text-white shadow-lg backdrop-blur-xs transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
            </>
          )}
        </div>

        {/* Légende / caption si présente */}
        {currentCaption && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 sm:p-3.5 max-h-[14vh] sm:max-h-[18vh] overflow-y-auto shrink-0">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line break-words">
              {currentCaption}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ZoomButton({ image }: { image: ImageBlock }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="rounded-full gap-1.5 shadow-2xs hover:bg-accent shrink-0 text-xs sm:text-sm"
      >
        <ZoomIn size={14} />
        <span>Agrandir l'image</span>
      </Button>
      <ImageViewerDialog
        open={open}
        onOpenChange={setOpen}
        items={[image]}
      />
    </>
  );
}

function getCleanTitle(title?: string): string | undefined {
  if (!title) return undefined;
  const t = title.trim();
  if (!t) return undefined;
  // Ignore les noms techniques ou générés automatiquement (ex: file_0000000061008243981e, img_...)
  if (/^(file_|img_|image_|pxl_|capture_|screenshot_)/i.test(t)) return undefined;
  if (!/\s/.test(t) && t.length > 16) return undefined;
  return t;
}

function MediaSectionBlock({ block }: { block: MediaBlock }) {
  const validItems = block.items.filter((it) => !!safeUrl(it.url));
  if (validItems.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const total = validItems.length;
  const safeIndex = currentIndex >= total ? 0 : currentIndex;
  const currentItem = validItems[safeIndex]!;

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i <= 0 ? total - 1 : i - 1));
  }, [total]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i >= total - 1 ? 0 : i + 1));
  }, [total]);

  const handleInlineTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    setTouchStartX(e.touches[0]?.clientX ?? null);
  };

  const handleInlineTouchEnd = (e: React.TouchEvent) => {
    if (total <= 1 || touchStartX === null) return;
    const touchEndX = e.changedTouches[0]?.clientX ?? null;
    if (touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStartX(null);
  };

  const blockTitle = block.title?.trim() || validItems.find((it) => getCleanTitle(it.title))?.title?.trim();
  const blockCaption = block.caption?.trim() || validItems.find((it) => it.caption?.trim())?.caption?.trim();

  return (
    <>
      <div className="my-8 sm:my-10 space-y-3 sm:space-y-4 max-w-4xl min-w-0">
        {/* Cadre de l'image avec boutons responsives et support tactile */}
        <div
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted/20 shadow-xs select-none touch-pan-y"
          onTouchStart={handleInlineTouchStart}
          onTouchEnd={handleInlineTouchEnd}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLightboxOpen(true);
              }
            }}
            className="group relative aspect-[16/10] sm:aspect-[16/9] w-full cursor-pointer overflow-hidden select-none"
            title="Cliquer pour agrandir"
          >
            <img
              src={getOptimizedImageUrl(safeUrl(currentItem.url), { width: 1000 })}
              alt={currentItem.alt || blockTitle || "Média"}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain sm:object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />

            {/* Compteur discret */}
            {total > 1 && (
              <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-white shadow-sm backdrop-blur-xs">
                {safeIndex + 1} / {total}
              </div>
            )}

            {/* Badge Agrandir */}
            <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-sm backdrop-blur-xs hover:bg-black/80 transition-colors">
              <ZoomIn size={12} className="sm:size-3.5" />
              <span>Agrandir</span>
            </div>
          </div>

          {/* Flèches de défilement responsives */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Image précédente"
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg backdrop-blur-xs transition-transform hover:scale-105 active:scale-95"
              >
                <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Image suivante"
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 sm:h-11 sm:w-11 place-items-center rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg backdrop-blur-xs transition-transform hover:scale-105 active:scale-95"
              >
                <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
              </button>
            </>
          )}
        </div>

        {/* Titre et description sous le média */}
        {(blockTitle || blockCaption) && (
          <div className="space-y-1.5 pt-1 min-w-0">
            {blockTitle && (
              <h3 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-foreground break-words">
                {blockTitle}
              </h3>
            )}
            {blockCaption && (
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                {blockCaption}
              </p>
            )}
          </div>
        )}
      </div>

      <ImageViewerDialog
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        items={validItems}
        initialIndex={safeIndex}
        {...(blockTitle !== undefined ? { globalTitle: blockTitle } : {})}
        {...(blockCaption !== undefined ? { globalCaption: blockCaption } : {})}
      />
    </>
  );
}

function ImageFigureBlock({ block }: { block: ImageBlock }) {
  const [open, setOpen] = useState(false);
  const src = safeUrl(block.url);
  if (!src) return null;

  return (
    <>
      <figure className="my-6 sm:my-8 max-w-4xl min-w-0">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          className="group relative cursor-pointer overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted/20 shadow-xs select-none"
          title="Cliquer pour agrandir"
        >
          <img
            src={getOptimizedImageUrl(src, { width: 1100 })}
            alt={block.alt}
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] sm:aspect-[3/2] w-full object-cover transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-white shadow-sm backdrop-blur-xs hover:bg-black/80 transition-colors">
            <ZoomIn size={12} className="sm:size-3.5" />
            <span>Agrandir</span>
          </div>
        </div>
        {(block.title || block.caption || block.note) && (
          <figcaption className="mt-2.5 sm:mt-3 space-y-1 min-w-0">
            {block.title && <h4 className="text-base sm:text-lg font-bold text-foreground break-words">{block.title}</h4>}
            {block.caption && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{block.caption}</p>}
            {block.note && <p className="text-xs text-muted-foreground break-words">{block.note}</p>}
          </figcaption>
        )}
      </figure>

      <ImageViewerDialog
        open={open}
        onOpenChange={setOpen}
        items={[block]}
      />
    </>
  );
}

function Child({ block, result }: { block: Block; result?: boolean | undefined }) {
  switch (block.type) {
    case "paragraph": return <RichText doc={block.doc} pClass={result ? pResult : pText} />;
    case "subheading": return <h3 className="mt-6 sm:mt-8 text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground break-words">{block.text}</h3>;
    case "list": {
      const items = listItems(block.doc);
      if (block.style === "check") {
        return (
          <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5 sm:gap-3 text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground min-w-0">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" />
                <span className="flex-1 min-w-0 break-words"><InlineItem item={it} /></span>
              </li>
            ))}
          </ul>
        );
      }
      if (block.style === "tags") {
        return (
          <ul className="mt-5 sm:mt-6 flex flex-wrap gap-2 sm:gap-2.5">
            {items.map((it, i) => (
              <li key={i} className="rounded-full border border-border/80 bg-secondary/80 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-secondary-foreground shadow-2xs">
                <InlineItem item={it} />
              </li>
            ))}
          </ul>
        );
      }
      return <RichText doc={block.doc} pClass={pText} />;
    }
    case "media": return <MediaSectionBlock block={block as MediaBlock} />;
    case "image": return <ImageFigureBlock block={block as ImageBlock} />;
    case "quote": return (
      <blockquote className="my-6 sm:my-8 border-l-2 border-primary pl-4 sm:pl-6 text-foreground max-w-3xl min-w-0">
        <RichText doc={block.doc} pClass="text-sm sm:text-base md:text-lg leading-relaxed text-foreground italic break-words font-serif" />
        {block.cite && <footer className="mt-2 text-xs sm:text-sm font-semibold text-primary not-italic break-words">— {block.cite}</footer>}
      </blockquote>
    );
    case "code": return (
      <div className="my-5 sm:my-6 max-w-3xl overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-ink shadow-xs min-w-0">
        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs text-ink-foreground/60">
          <span>Snippet</span>
        </div>
        <pre className="overflow-x-auto p-3 sm:p-4 text-xs sm:text-sm text-ink-foreground font-mono leading-relaxed">
          <code>{block.code}</code>
        </pre>
      </div>
    );
    case "button": {
      const href = safeUrl(block.url);
      if (!href) return null;
      const external = /^https?:/.test(href);
      return (
        <Button asChild size="lg" className="mt-5 sm:mt-6 rounded-full bg-gradient-primary gap-2 shadow-sm w-full sm:w-auto justify-center">
          <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="truncate">
            {external && <Globe size={18} className="shrink-0" />}
            <span className="truncate">{block.label}</span>
            {external && <ArrowUpRight size={16} className="shrink-0" />}
          </a>
        </Button>
      );
    }
    case "divider": return <hr className="my-8 sm:my-10 border-border/80 max-w-4xl" />;
    default: return null;
  }
}

function Children({ blocks, result }: { blocks: Block[]; result?: boolean | undefined }) {
  return <>{blocks.map((b) => <Child key={b.id} block={b} result={result} />)}</>;
}

function Steps({ blocks }: { blocks: Block[] }) {
  const steps: { title: string; id: string; body: Block[] }[] = [];
  const intro: Block[] = [];
  for (const b of blocks) {
    if (b.type === "subheading") steps.push({ title: b.text, id: b.id, body: [] });
    else if (steps.length) steps[steps.length - 1]!.body.push(b);
    else intro.push(b);
  }
  return (
    <div className="mt-6 space-y-6 sm:space-y-8 max-w-4xl min-w-0">
      <Children blocks={intro} />
      <div className="space-y-6 sm:space-y-8 divide-y divide-border/60">
        {steps.map((s, i) => (
          <div key={s.id} className={i > 0 ? "pt-6 sm:pt-8" : ""}>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="inline-flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground break-words">{s.title}</h3>
            </div>
            <div className="mt-2.5 sm:mt-3 pl-8 sm:pl-10 space-y-3 sm:space-y-4 min-w-0">
              {s.body.map((b) => (
                b.type === "paragraph"
                  ? <RichText key={b.id} doc={b.doc} pClass={pText} />
                  : <Child key={b.id} block={b} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FullSection({ section, pb }: { section: Section; pb: boolean }) {
  const h = section.heading;
  const muted = h?.tone === "muted";
  const firstImage = section.children[0]?.type === "image" ? (section.children[0] as ImageBlock) : null;
  if (h?.variant === "result") {
    return (
      <section className={`${container} ${pb ? "pb-10 md:pb-16" : ""}`}>
        <div className="mt-8 sm:mt-12 border-t-2 border-primary/30 pt-6 sm:pt-8 max-w-4xl min-w-0">
          <h2 className="flex items-start sm:items-center gap-2.5 sm:gap-3 text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground break-words">
            <CheckCircle2 className="shrink-0 text-primary h-6 w-6 sm:h-7 sm:w-7 mt-0.5 sm:mt-0" />
            <span>{h.text}</span>
          </h2>
          <Children blocks={section.children} result />
        </div>
      </section>
    );
  }
  const inner = (
    <div className="max-w-4xl min-w-0">
      {h && (firstImage
        ? <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4"><h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground break-words">{h.text}</h2><ZoomButton image={firstImage} /></div>
        : <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-3 sm:mb-4 break-words">{h.text}</h2>)}
      {h?.variant === "steps" ? <Steps blocks={section.children} /> : <Children blocks={section.children} />}
    </div>
  );
  if (muted) return <section className="border-y border-border/60 bg-muted/20 py-8 sm:py-12 md:py-16 my-6 sm:my-8"><div className={container}>{inner}</div></section>;
  return <section className={`${container} pt-8 sm:pt-10 md:pt-14 ${pb ? "pb-8 sm:pb-10 md:pb-14" : ""}`}>{inner}</section>;
}

function HalfGroup({ group }: { group: Extract<Group, { kind: "half" }> }) {
  const muted = group.tone === "muted";
  const cols = group.sections.map((s, i) => (
    <div key={s.heading?.id ?? i} className="space-y-3 sm:space-y-4 min-w-0">
      {s.heading && <h2 className={`${muted ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl"} font-bold tracking-tight text-foreground break-words`}>{s.heading.text}</h2>}
      <Children blocks={s.children} />
    </div>
  ));
  if (muted) return <section className="border-y border-border/60 bg-muted/20 py-8 sm:py-12 md:py-16 my-6 sm:my-8"><div className={`${container} grid gap-6 sm:gap-8 md:grid-cols-2 md:gap-14`}>{cols}</div></section>;
  return <section className={`${container} grid gap-6 sm:gap-8 py-8 sm:py-10 md:grid-cols-2 md:gap-14 md:py-14`}>{cols}</section>;
}

/** Corps d'une étude de cas, rendu à partir des blocs structurés. */
export function ProjectBody({ blocks }: { blocks: Block[] }) {
  const groups = toGroups(toSections(blocks));
  return (
    <>
      {groups.map((g, i) => {
        if (g.kind === "half") return <HalfGroup key={i} group={g} />;
        const next = groups[i + 1];
        const pb = !(isPlainFull(next));
        return <FullSection key={g.section.heading?.id ?? i} section={g.section} pb={isPlainFull(g) ? pb : false} />;
      })}
    </>
  );
}

/** Première image du corps, utilisée en visuel d'en-tête de secours si aucun bloc ImageBlock n'est présent. */
export function firstImage(blocks: Block[]): ImageBlock | undefined {
  return blocks.find((b): b is ImageBlock => b.type === "image" && !!safeUrl(b.url));
}
