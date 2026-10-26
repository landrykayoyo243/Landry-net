import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Globe, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InlineItem, RichText } from "@/components/portfolio/RichText";
import { listItems, safeUrl, type Block, type HeadingBlock, type ImageBlock, type MediaBlock, type MediaItem } from "@/lib/blocks";
import { getOptimizedImageUrl } from "@/lib/siteConfig";

const container = "mx-auto w-full max-w-6xl px-5 md:px-8";
const pText = "mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground";
const pResult = "mt-4 max-w-3xl text-lg sm:text-xl leading-relaxed text-foreground/90";

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

function ZoomButton({ image }: { image: ImageBlock }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-1.5 shadow-2xs hover:bg-accent">
          <ZoomIn size={14} />
          <span>Agrandir l'image</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto p-4 sm:p-6 bg-card border-border">
        <DialogTitle className="text-lg font-bold text-foreground">{image.title || image.alt}</DialogTitle>
        {image.note && <DialogDescription className="text-sm text-muted-foreground">{image.note}</DialogDescription>}
        <div className="mt-3 overflow-hidden rounded-xl bg-muted/40">
          <img src={getOptimizedImageUrl(safeUrl(image.url), { width: 1400 })} alt={image.alt} width={1200} height={800} decoding="async" className="h-auto w-full object-contain mx-auto max-h-[70vh]" />
        </div>
        {image.caption && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{image.caption}</p>}
      </DialogContent>
    </Dialog>
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

  const total = validItems.length;
  const safeIndex = currentIndex >= total ? 0 : currentIndex;
  const currentItem = validItems[safeIndex]!;

  const prev = useCallback(() => {
    setCurrentIndex((i) => (i <= 0 ? total - 1 : i - 1));
  }, [total]);

  const next = useCallback(() => {
    setCurrentIndex((i) => (i >= total - 1 ? 0 : i + 1));
  }, [total]);

  // Défilement au clavier (Flèches gauche / droite)
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, prev, next]);

  // Le titre et la description appartiennent au bloc : ils restent toujours affichés au défilement des images
  const blockTitle = block.title?.trim() || validItems.find((it) => getCleanTitle(it.title))?.title?.trim();
  const blockCaption = block.caption?.trim() || validItems.find((it) => it.caption?.trim())?.caption?.trim();

  return (
    <>
      <div className="my-10 space-y-4 max-w-4xl">

        {/* Image EN HAUT */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted/20 shadow-sm">
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

            {/* Compteur */}
            {total > 1 && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                {safeIndex + 1} / {total}
              </div>
            )}

            {/* Agrandir */}
            <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-black/80 transition-colors">
              <ZoomIn size={13} />
              <span>Agrandir</span>
            </div>
          </div>

          {/* Flèches visibles avec fond sombre */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Image précédente"
                className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-black/60 text-white shadow-lg transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Image suivante"
                className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-black/60 text-white shadow-lg transition-all hover:bg-black/80 hover:scale-105 active:scale-95"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>

        {/* Titre et description EN BAS (toujours visibles même si on change d'image) */}
        {(blockTitle || blockCaption) && (
          <div className="space-y-1.5 pt-1">
            {blockTitle && (
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {blockTitle}
              </h3>
            )}
            {blockCaption && (
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed whitespace-pre-line">
                {blockCaption}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Visionneur plein écran défilable (Lightbox) */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-h-[96dvh] w-[calc(100vw-1rem)] sm:w-[calc(100vw-3rem)] max-w-5xl overflow-y-auto p-3 sm:p-6 bg-card border-border">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 pr-8">
            <DialogTitle className="text-base sm:text-lg font-bold truncate">
              {blockTitle || `Visuel ${safeIndex + 1}/${total}`}
            </DialogTitle>
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-0.5 shrink-0">
              {safeIndex + 1} / {total}
            </span>
          </div>

          {/* Image plein écran avec boutons défilement */}
          <div className="relative mt-3 flex items-center justify-center rounded-2xl bg-muted/40 p-1 sm:p-2">
            <img
              src={getOptimizedImageUrl(safeUrl(currentItem.url), { width: 1600 })}
              alt={currentItem.alt || blockTitle || "Média plein écran"}
              decoding="async"
              className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Image précédente"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-background/90 backdrop-blur text-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Image suivante"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-full bg-background/90 backdrop-blur text-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          {/* Description en plein écran */}
          {blockCaption && (
            <div className="mt-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {blockCaption}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Child({ block, result }: { block: Block; result?: boolean | undefined }) {
  switch (block.type) {
    case "paragraph": return <RichText doc={block.doc} pClass={result ? pResult : pText} />;
    case "subheading": return <h3 className="mt-8 text-xl sm:text-2xl font-bold tracking-tight text-foreground">{block.text}</h3>;
    case "list": {
      const items = listItems(block.doc);
      if (block.style === "check") {
        return (
          <ul className="mt-6 space-y-3.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-3 text-base sm:text-lg leading-relaxed text-muted-foreground">
                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-primary" />
                <span className="flex-1"><InlineItem item={it} /></span>
              </li>
            ))}
          </ul>
        );
      }
      if (block.style === "tags") {
        return (
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {items.map((it, i) => (
              <li key={i} className="rounded-full border border-border/80 bg-secondary/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-secondary-foreground shadow-2xs">
                <InlineItem item={it} />
              </li>
            ))}
          </ul>
        );
      }
      return <RichText doc={block.doc} pClass={pText} />;
    }
    case "media": return <MediaSectionBlock block={block as MediaBlock} />;
    case "image": {
      const src = safeUrl(block.url);
      if (!src) return null;
      return (
        <figure className="my-8 max-w-4xl">
          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/80 bg-muted/20 shadow-xs">
            <img src={getOptimizedImageUrl(src, { width: 1100 })} alt={block.alt} width={1200} height={800} loading="lazy" decoding="async" className="aspect-[16/10] sm:aspect-[3/2] w-full object-cover" />
          </div>
          {(block.title || block.caption || block.note) && (
            <figcaption className="mt-3 space-y-1">
              {block.title && <h4 className="text-base sm:text-lg font-bold text-foreground">{block.title}</h4>}
              {block.caption && <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{block.caption}</p>}
              {block.note && <p className="text-xs text-muted-foreground">{block.note}</p>}
            </figcaption>
          )}
        </figure>
      );
    }
    case "quote": return (
      <blockquote className="my-8 border-l-2 border-primary pl-5 sm:pl-6 text-foreground max-w-3xl">
        <RichText doc={block.doc} pClass="text-base sm:text-lg leading-relaxed text-foreground" />
        {block.cite && <footer className="mt-2 text-sm font-semibold text-primary">— {block.cite}</footer>}
      </blockquote>
    );
    case "code": return (
      <div className="my-6 max-w-3xl overflow-hidden rounded-2xl border border-border bg-ink shadow-xs">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-ink-foreground/60">
          <span>Snippet</span>
        </div>
        <pre className="overflow-x-auto p-4 text-xs sm:text-sm text-ink-foreground font-mono leading-relaxed">
          <code>{block.code}</code>
        </pre>
      </div>
    );
    case "button": {
      const href = safeUrl(block.url);
      if (!href) return null;
      const external = /^https?:/.test(href);
      return (
        <Button asChild size="lg" className="mt-6 rounded-full bg-gradient-primary gap-2 shadow-sm">
          <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
            {external && <Globe size={18} />}
            {block.label}
            {external && <ArrowUpRight size={16} />}
          </a>
        </Button>
      );
    }
    case "divider": return <hr className="my-10 border-border/80 max-w-4xl" />;
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
    <div className="mt-6 space-y-8 max-w-4xl">
      <Children blocks={intro} />
      <div className="space-y-8 divide-y divide-border/60">
        {steps.map((s, i) => (
          <div key={s.id} className={i > 0 ? "pt-8" : ""}>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{s.title}</h3>
            </div>
            <div className="mt-3 pl-10 space-y-4">
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
      <section className={`${container} ${pb ? "pb-12 md:pb-16" : ""}`}>
        <div className="mt-12 border-t-2 border-primary/30 pt-8 max-w-4xl">
          <h2 className="flex items-center gap-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            <CheckCircle2 className="shrink-0 text-primary h-7 w-7" />
            {h.text}
          </h2>
          <Children blocks={section.children} result />
        </div>
      </section>
    );
  }
  const inner = (
    <div className="max-w-4xl">
      {h && (firstImage
        ? <div className="flex flex-wrap items-center justify-between gap-4 mb-4"><h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{h.text}</h2><ZoomButton image={firstImage} /></div>
        : <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">{h.text}</h2>)}
      {h?.variant === "steps" ? <Steps blocks={section.children} /> : <Children blocks={section.children} />}
    </div>
  );
  if (muted) return <section className="border-y border-border/60 bg-muted/20 py-12 md:py-16 my-8"><div className={container}>{inner}</div></section>;
  return <section className={`${container} pt-10 md:pt-14 ${pb ? "pb-10 md:pb-14" : ""}`}>{inner}</section>;
}

function HalfGroup({ group }: { group: Extract<Group, { kind: "half" }> }) {
  const muted = group.tone === "muted";
  const cols = group.sections.map((s, i) => (
    <div key={s.heading?.id ?? i} className="space-y-4">
      {s.heading && <h2 className={`${muted ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"} font-bold tracking-tight text-foreground`}>{s.heading.text}</h2>}
      <Children blocks={s.children} />
    </div>
  ));
  if (muted) return <section className="border-y border-border/60 bg-muted/20 py-12 md:py-16 my-8"><div className={`${container} grid gap-8 md:grid-cols-2 md:gap-14`}>{cols}</div></section>;
  return <section className={`${container} grid gap-8 py-10 md:grid-cols-2 md:gap-14 md:py-14`}>{cols}</section>;
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
