import { Link, useRouterState } from "@tanstack/react-router";
import { MessageSquareText, Layers, LayoutDashboard, Settings2 } from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin/ia", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { to: "/admin/ia/assistant", label: "Chat IA", icon: MessageSquareText },
  { to: "/admin/ia/skills", label: "Skills IA", icon: Layers },
  { to: "/admin/parametres", label: "Configuration & Clé", icon: Settings2 },
] as const;

export function IaSubNav() {
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav aria-label="Navigation Assistant IA" className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/70 border border-border/60 shadow-xs">
        {NAV_ITEMS.map(({ to, label, icon: Icon, ...rest }) => {
          const isExact = "exact" in rest && rest.exact;
          const isActive = isExact
            ? currentPath === to || currentPath === `${to}/`
            : currentPath.startsWith(to);

          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon size={15} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
