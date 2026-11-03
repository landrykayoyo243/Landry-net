import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { brandsQuery, type PublicBrand } from "@/lib/content.queries";
import { getOptimizedImageUrl } from "@/lib/siteConfig";
import { brandsSection } from "@/content/portfolio";
import { Reveal } from "@/components/portfolio/Reveal";

/** Typographies logo sur-mesure pour les institutions (effet épuré monochrome & lisible). */
function TypographicLogo({
  name,
  isActive,
  isHero = false,
}: {
  name: string;
  isActive: boolean;
  isHero?: boolean;
}) {
  const n = name.trim().toLowerCase();
  const baseClass = `transition-colors duration-300 ${
    isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
  }`;

  if (n === "xsecurity") {
    return (
      <span
        className={`font-sans ${
          isHero ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl md:text-[2rem]"
        } font-black tracking-[0.16em] ${baseClass}`}
      >
        XSECURITY
      </span>
    );
  }
  if (n === "inpp") {
    return (
      <span
        className={`font-sans ${
          isHero ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl md:text-5xl"
        } font-black tracking-wider ${baseClass}`}
      >
        INPP
      </span>
    );
  }
  if (n === "cnss") {
    return (
      <span
        className={`font-sans ${
          isHero ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl md:text-4xl"
        } font-bold tracking-[0.22em] ${baseClass}`}
      >
        CNSS
      </span>
    );
  }
  if (n.includes("don bosco")) {
    return (
      <div className={`text-center leading-tight ${baseClass}`}>
        <span
          className={`block font-serif ${
            isHero ? "text-lg sm:text-xl" : "text-base sm:text-lg md:text-xl"
          } font-semibold tracking-wide`}
        >
          UNIVERSITÉ
        </span>
        <span
          className={`block font-sans ${
            isHero ? "text-xs sm:text-sm" : "text-xs sm:text-sm"
          } font-bold tracking-[0.2em] text-foreground/70`}
        >
          DON BOSCO
        </span>
      </div>
    );
  }
  if (n === "paylix") {
    return (
      <span
        className={`font-sans ${
          isHero ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl md:text-5xl"
        } font-black tracking-tight ${baseClass}`}
      >
        Pay<span className="text-primary font-bold">Lix</span>
      </span>
    );
  }
  if (n.includes("cisco")) {
    return (
      <div className={`flex items-baseline gap-2 ${baseClass}`}>
        <span
          className={`font-sans ${
            isHero ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl md:text-4xl"
          } font-black tracking-tight`}
        >
          CISCO
        </span>
        <span className="font-sans text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Networking
        </span>
      </div>
    );
  }

  return (
    <span
      className={`font-sans ${
        isHero ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl md:text-3xl"
      } font-bold tracking-tight ${baseClass}`}
    >
      {name}
    </span>
  );
}

function BrandLogo({
  brand,
  isActive,
  onToggle,
  size = "normal",
}: {
  brand: PublicBrand;
  isActive: boolean;
  onToggle: () => void;
  size?: "normal" | "hero";
}) {
  const isHero = size === "hero";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${brand.name} — ${isActive ? "actif" : "afficher"}`}
      aria-pressed={isActive}
      className="group relative flex items-center justify-center p-1.5 transition-transform duration-300 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg"
    >
      {brand.logo_url ? (
        <img
          src={getOptimizedImageUrl(brand.logo_url, { width: isHero ? 500 : 440 })}
          alt={brand.name}
          loading="lazy"
          decoding="async"
          className={`${
            isHero
              ? "h-13 sm:h-16 md:h-16 max-w-[170px] sm:max-w-[210px] md:max-w-[230px]"
              : "h-9 sm:h-11 md:h-13 lg:h-15 max-w-[140px] sm:max-w-[170px] md:max-w-[200px]"
          } w-auto object-contain transition-all duration-300 ${
            isActive
              ? "grayscale-0 opacity-100 scale-105"
              : "grayscale opacity-85 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105"
          }`}
        />
      ) : (
        <TypographicLogo name={brand.name} isActive={isActive} isHero={isHero} />
      )}
    </button>
  );
}

type MobileGroup =
  | { type: "hero"; item: PublicBrand }
  | { type: "duo"; items: [PublicBrand, PublicBrand] }
  | { type: "single"; item: PublicBrand };

/**
 * Réorganisation mobile intelligente :
 * - Les marques en haut sont mises en valeur en taille "hero" (plus grandes et imposantes).
 * - Aucun logo n'est laissé orphelin au bas : répartition parfaite en duos.
 */
function buildSmartMobileGroups(items: PublicBrand[]): MobileGroup[] {
  if (items.length === 0) return [];

  const groups: MobileGroup[] = [];

  // Si le nombre total est impair (ex: 7 ou 5 ou 9) :
  // Le tout premier logo est le GRAND HERO en haut (ex: XSECURITY), puis uniquement des duos équilibrés !
  if (items.length % 2 === 1) {
    groups.push({ type: "hero", item: items[0] });
    for (let i = 1; i < items.length; i += 2) {
      if (i + 1 < items.length) {
        groups.push({ type: "duo", items: [items[i], items[i + 1]] });
      } else {
        groups.push({ type: "single", item: items[i] });
      }
    }
    return groups;
  }

  // Si le nombre total est pair (ex: 8 ou 10) :
  // Les 2 premiers logos sont en haut en taille Hero (grands et centrés), puis des duos équilibrés !
  if (items.length >= 8) {
    groups.push({ type: "hero", item: items[0] });
    groups.push({ type: "hero", item: items[1] });
    for (let i = 2; i < items.length; i += 2) {
      if (i + 1 < items.length) {
        groups.push({ type: "duo", items: [items[i], items[i + 1]] });
      }
    }
    return groups;
  }

  // Si 6 : 1 grand hero en haut, 2 duos, et 1 hero de fermeture en bas (harmonie diamant)
  if (items.length === 6) {
    groups.push({ type: "hero", item: items[0] });
    groups.push({ type: "duo", items: [items[1], items[2]] });
    groups.push({ type: "duo", items: [items[3], items[4]] });
    groups.push({ type: "hero", item: items[5] });
    return groups;
  }

  // Fallback duos
  for (let i = 0; i < items.length; i += 2) {
    if (i + 1 < items.length) {
      groups.push({ type: "duo", items: [items[i], items[i + 1]] });
    } else {
      groups.push({ type: "hero", item: items[i] });
    }
  }
  return groups;
}

/**
 * Grille organique de logos :
 * - Sur Desktop : 2 rangées en quinconce centrées, contenues dans max-w-[860px].
 * - Sur Mobile : réorganisation intelligente avec logos du haut plus grands (Hero) et duos équilibrés sans orphelin.
 */
export function BrandsMarquee() {
  const { data: list = [] } = useQuery(brandsQuery);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);

  const toggle = (id: string) => {
    setActiveBrandId((prev) => (prev === id ? null : id));
  };

  // Répartition Desktop en 2 rangées décalées (quinconce) dans un bloc centré
  const { desktopRow1, desktopRow2 } = useMemo(() => {
    if (list.length === 0) return { desktopRow1: [], desktopRow2: [] };
    const splitAt = list.length <= 6 ? Math.ceil(list.length / 2) : Math.ceil(list.length * 0.6);
    return {
      desktopRow1: list.slice(0, splitAt),
      desktopRow2: list.slice(splitAt),
    };
  }, [list]);

  // Répartition Mobile intelligente
  const mobileGroups = useMemo(() => buildSmartMobileGroups(list), [list]);

  if (list.length === 0) return null;

  return (
    <section
      aria-label="Institutions et partenaires de confiance"
      className="border-y border-border/60 bg-background py-10 sm:py-14 md:py-16 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        {/* En-tête compact et fidèle */}
        <Reveal>
          <div className="mx-auto mb-8 sm:mb-10 max-w-2xl text-center">
            <div className="mb-2.5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary sm:text-sm">
              <span className="h-[1.5px] w-5 sm:w-6 bg-primary inline-block" aria-hidden />
              <span>{brandsSection.eyebrow}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[2.75rem] font-normal leading-[1.15] tracking-tight text-foreground">
              {brandsSection.titleLead}{" "}
              <span className="italic font-serif text-primary block sm:inline">
                {brandsSection.titleAccent}
              </span>
            </h2>
          </div>
        </Reveal>

        {/* ── DESKTOP (Bloc centré, logos en quinconce préservé) ── */}
        <Reveal className="hidden md:block">
          <div className="mx-auto max-w-[860px] space-y-7 lg:space-y-9">
            {/* Rangée 1 : centrée avec bon espacement */}
            <div className="flex items-center justify-center gap-8 lg:gap-14">
              {desktopRow1.map((brand) => (
                <BrandLogo
                  key={brand.id}
                  brand={brand}
                  isActive={activeBrandId === brand.id}
                  onToggle={() => toggle(brand.id)}
                />
              ))}
            </div>

            {/* Rangée 2 : décalée en quinconce dans les intervalles */}
            {desktopRow2.length > 0 && (
              <div className="flex items-center justify-center gap-10 lg:gap-16">
                {desktopRow2.map((brand) => (
                  <BrandLogo
                    key={brand.id}
                    brand={brand}
                    isActive={activeBrandId === brand.id}
                    onToggle={() => toggle(brand.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* ── MOBILE (Réorganisation intelligente, logos du haut plus grands, zéro orphelin) ── */}
        <Reveal className="block md:hidden">
          <div className="mx-auto max-w-[340px] space-y-4 sm:space-y-5">
            {mobileGroups.map((group, idx) => {
              if (group.type === "hero" || group.type === "single") {
                const item = "item" in group ? group.item : group.items[0];
                const isHero = group.type === "hero";
                return (
                  <div
                    key={`hero-${idx}`}
                    className={`flex justify-center ${isHero ? "py-1.5" : "py-1"}`}
                  >
                    <BrandLogo
                      brand={item}
                      size={isHero ? "hero" : "normal"}
                      isActive={activeBrandId === item.id}
                      onToggle={() => toggle(item.id)}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={`duo-${idx}`}
                  className="grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-2"
                >
                  {group.items.map((brand) => (
                    <BrandLogo
                      key={brand.id}
                      brand={brand}
                      size="normal"
                      isActive={activeBrandId === brand.id}
                      onToggle={() => toggle(brand.id)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
