import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Award, BrainCircuit, Briefcase, Building2, Camera, FileText, FolderKanban, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus } from "@/lib/admin-auth";

const logo = { url: "/landry-net-logo.jpg" };

const IDLE_MS = 30 * 60 * 1000;

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Espace admin — Landry Net" }, { name: "robots", content: "noindex, nofollow" }] }),
  beforeLoad: async ({ location }) => {
    const status = await getAdminStatus();
    if (status.state === "anonymous") throw redirect({ to: "/connexion-requise" });
    if (status.state === "forbidden") throw redirect({ to: "/acces-refuse" });
    if (status.mustChangePassword && location.pathname !== "/admin/compte") throw redirect({ to: "/admin/compte" });
    return { admin: status };
  },
  component: AdminLayout,
});

const links = [
  { to: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/projets", label: "Projets", icon: FolderKanban },
  { to: "/admin/immersion", label: "Immersion terrain", icon: Camera },
  { to: "/admin/parcours", label: "Parcours", icon: Briefcase },
  { to: "/admin/certifications", label: "Certifications", icon: Award },
  { to: "/admin/organisations", label: "Organisations", icon: Building2 },
  { to: "/admin/medias", label: "Mon CV", icon: FileText },
  { to: "/admin/ia", label: "Assistant IA", icon: BrainCircuit },
  { to: "/admin/parametres", label: "Paramètres & Secrets", icon: KeyRound },
  { to: "/admin/journal", label: "Journal d'audit", icon: ShieldCheck },
  { to: "/admin/compte", label: "Mon compte", icon: UserCog },
] as const;

function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.removeQueries({ queryKey: ["admin"] });
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };
}

function Nav({
  onNavigate,
  locked,
  onToggleSidebar,
  collapsed = false,
}: {
  onNavigate?: () => void;
  locked: boolean;
  onToggleSidebar?: () => void;
  collapsed?: boolean;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      {collapsed ? (
        /* Mode icônes : logo centré + bouton toggle en dessous */
        <div className="flex flex-col items-center gap-1 border-b border-border/50 py-3 px-2">
          <Link to="/admin" onClick={onNavigate} title="Tableau de bord" className="flex items-center justify-center">
            <img src={logo.url} alt="Landry Net" width={36} height={36} className="h-9 w-9 rounded-md" />
          </Link>
          {onToggleSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="hidden lg:grid h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              title="Afficher le menu"
              aria-label="Afficher le menu"
            >
              <PanelLeftOpen size={16} />
            </Button>
          )}
        </div>
      ) : (
        /* Mode étendu : logo + texte + bouton toggle */
        <div className="flex items-center justify-between px-4 py-5 border-b border-border/50">
          <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2.5 min-w-0">
            <img src={logo.url} alt="" width={36} height={36} className="h-9 w-9 rounded-md shrink-0" />
            <span className="text-lg font-bold uppercase tracking-wide truncate">
              <span className="text-primary">Landry</span> Net
            </span>
          </Link>
          {onToggleSidebar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="hidden lg:grid h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              title="Réduire le menu"
              aria-label="Réduire le menu"
            >
              <PanelLeftClose size={18} />
            </Button>
          )}
        </div>
      )}

      {/* Navigation — scrollbar ultra fine */}
      <nav aria-label="Navigation admin" className="flex-1 space-y-1 px-2 py-3 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
        {links.map(({ to, label, icon: Icon, ...rest }) => {
          const active = "exact" in rest ? path === to || path === `${to}/` : path.startsWith(to);
          const disabled = locked && to !== "/admin/compte";
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              disabled={disabled}
              title={collapsed ? label : undefined}
              className={`flex min-h-11 items-center rounded-xl text-sm font-semibold transition ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              } ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${disabled ? "pointer-events-none opacity-40" : ""}`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Pied de page */}
      <div className="border-t border-border p-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          title={collapsed ? "Voir le site" : undefined}
          className={`flex min-h-11 items-center rounded-xl text-sm text-muted-foreground hover:bg-secondary ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          {collapsed ? "↗" : "Voir le site ↗"}
        </a>
        <button
          type="button"
          onClick={signOut}
          title={collapsed ? "Se déconnecter" : undefined}
          className={`flex min-h-11 w-full items-center rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();
  const locked = admin.mustChangePassword;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isProjectEditor =
    path.startsWith("/admin/projets/nouveau") ||
    (path.startsWith("/admin/projets/") && path !== "/admin/projets" && path !== "/admin/projets/");

  // État d'ouverture/fermeture de la sidebar sur grand écran (desktop)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("admin_sidebar_open");
      if (saved !== null) return saved === "true";
      if (isProjectEditor) return false;
    }
    return true;
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_open", String(next));
      }
      return next;
    });
  };

  // Expiration de session après inactivité.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => { void signOut(); }, IDLE_MS); };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_OUT") window.location.assign("/admin/login"); });
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-muted text-foreground relative">
      {/* ── Sidebar Desktop : mode étendu (w-64) ou réduit icônes (w-16) ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r border-border bg-card transition-all duration-300 ease-in-out lg:block ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div className={`h-full ${sidebarOpen ? "w-64" : "w-16"}`}>
          <Nav locked={locked} onToggleSidebar={toggleSidebar} collapsed={!sidebarOpen} />
        </div>
      </aside>

      {!isProjectEditor && (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
          <Link to="/admin" className="flex items-center gap-2">
            <img src={logo.url} alt="" width={880} height={880} className="h-8 w-8 rounded-md" />
            <span className="font-bold uppercase tracking-wide"><span className="text-primary">Landry</span> Net</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-11 w-11 cursor-pointer" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu /></Button>
        </header>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Nav locked={locked} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <main
        className={`min-w-0 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        } ${isProjectEditor ? "h-screen overflow-hidden" : "overflow-x-hidden"}`}
      >
        <div className={isProjectEditor ? "w-full h-full min-w-0" : "mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-6 lg:py-10 min-w-0"}>
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
