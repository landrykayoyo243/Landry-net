import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Award, BrainCircuit, Briefcase, Building2, Camera, FileText, FolderKanban, KeyRound, LayoutDashboard, LogOut, Menu, MessageSquare, ShieldCheck, UserCog } from "lucide-react";
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

function Nav({ onNavigate, locked }: { onNavigate?: () => void; locked: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useSignOut();
  return (
    <div className="flex h-full flex-col">
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2.5 px-5 py-6">
        <img src={logo.url} alt="" width={880} height={880} className="h-9 w-9 rounded-md" />
        <span className="text-lg font-bold uppercase tracking-wide"><span className="text-primary">Landry</span> Net</span>
      </Link>
      <nav aria-label="Navigation admin" className="flex-1 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon, ...rest }) => {
          const active = "exact" in rest ? path === to || path === `${to}/` : path.startsWith(to);
          const disabled = locked && to !== "/admin/compte";
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              disabled={disabled}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-accent text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${disabled ? "pointer-events-none opacity-40" : ""}`}
            >
              <Icon size={18} /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <a href="/" target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-xl px-3 text-sm text-muted-foreground hover:bg-secondary">Voir le site ↗</a>
        <button type="button" onClick={signOut} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-destructive hover:bg-destructive/10">
          <LogOut size={18} /> Se déconnecter
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
    <div className="min-h-screen bg-muted text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card lg:block"><Nav locked={locked} /></aside>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <img src={logo.url} alt="" width={880} height={880} className="h-8 w-8 rounded-md" />
          <span className="font-bold uppercase tracking-wide"><span className="text-primary">Landry</span> Net</span>
        </Link>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu /></Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Nav locked={locked} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <main className="lg:pl-64 min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-6 lg:py-10 min-w-0"><Outlet /></div>
      </main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
