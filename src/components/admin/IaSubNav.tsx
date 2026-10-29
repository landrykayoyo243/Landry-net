import { Link, useRouterState } from "@tanstack/react-router";
import { MessageSquareText, Layers, LayoutDashboard, Settings2 } from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin/ia", label: "Vue d'ensemble", shortLabel: "Aperçu", icon: LayoutDashboard, exact: true },
  { to: "/admin/ia/assistant", label: "Chat IA", shortLabel: "Chat", icon: MessageSquareText },
  { to: "/admin/ia/skills", label: "Skills IA", shortLabel: "Skills", icon: Layers },
  { to: "/admin/parametres", label: "Configuration & Clé", shortLabel: "Config", icon: Settings2 },
] as const;

export function IaSubNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navigation Assistant IA"
      className="w-full overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
    >
      <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-muted/70 border border-border/60 shadow-xs min-w-max">
        {NAV_ITEMS.map(({ to, label, shortLabel, icon: Icon, ...rest }) => {
          const isExact = "exact" in rest && rest.exact;
          const isActive = isExact
            ? currentPath === to || currentPath === `${to}/`
            : currentPath.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border/50 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon size={14} className={isActive ? "text-primary shrink-0" : "text-muted-foreground shrink-0"} />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
