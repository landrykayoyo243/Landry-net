import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  RefreshCw,
  Calendar,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Globe,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminApi, type AdminAuditEntry } from "@/lib/admin-api-client";

export const Route = createFileRoute("/admin/journal")({
  component: AdminJournalPage,
});

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "secret.create": { label: "Création secret", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  "secret.update": { label: "Modification secret", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  "secret.delete": { label: "Suppression secret", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  "secret.test": { label: "Test déchiffrement", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  "secret.rotate": { label: "Rotation clé maître", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  "ai.generate": { label: "Requête IA", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  "ai.quota_exceeded": { label: "Quota IA atteint", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  "ai.error": { label: "Erreur IA", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  "skill.create": { label: "Création skill", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  "skill.update": { label: "Mise à jour skill", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  "skill.delete": { label: "Suppression skill", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  "assistant.proposal.apply": { label: "Proposition acceptée", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  "assistant.proposal.ignore": { label: "Proposition ignorée", color: "bg-muted text-muted-foreground border-border" },
};

function AdminJournalPage() {
  const [logs, setLogs] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filtres
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Modale détails
  const [inspectEntry, setInspectEntry] = useState<AdminAuditEntry | null>(null);

  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await adminApi.listAuditLogs({
        page: targetPage,
        limit: 15,
        action: selectedAction,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      setLogs(res.logs);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement du journal");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAction, dateFrom, dateTo]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Journal d'audit & sécurité
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Traçabilité immuable des actions d'administration et d'IA (conservation minimale de 90 jours).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Barre de filtres */}
      <Card className="border-border bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Filtre par action */}
            <div className="space-y-1.5">
              <Label htmlFor="action-filter" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Type d'action
              </Label>
              <select
                id="action-filter"
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Toutes les actions</option>
                <option value="secret.create">Création de secret</option>
                <option value="secret.update">Modification de secret</option>
                <option value="secret.delete">Suppression de secret</option>
                <option value="secret.test">Test de déchiffrement</option>
                <option value="secret.rotate">Rotation clé maître</option>
                <option value="ai.generate">Requêtes IA</option>
                <option value="skill.create">Création de skill</option>
                <option value="skill.update">Mise à jour de skill</option>
                <option value="skill.delete">Suppression de skill</option>
              </select>
            </div>

            {/* Date début */}
            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Date début
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Date fin */}
            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Date fin
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Réinitialiser les filtres */}
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  setSelectedAction("all");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé du compteur */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalCount} événement(s) enregistré(s)</span>
        <span>Page {page} sur {totalPages}</span>
      </div>

      {/* Liste des entrées */}
      {logs.length === 0 ? (
        <Card className="border-dashed border-border bg-card/50 p-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">Aucun événement trouvé</p>
          <p className="text-xs text-muted-foreground mt-1">
            Modifiez vos filtres ou effectuez une action pour alimenter le journal.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((entry) => {
            const actionInfo = ACTION_LABELS[entry.action] ?? {
              label: entry.action,
              color: "bg-muted text-muted-foreground border-border",
            };

            const isSuccess = entry.result === "success";

            return (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isSuccess ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${actionInfo.color}`}
                      >
                        {actionInfo.label}
                      </span>
                      <span className="font-mono text-xs font-medium text-foreground truncate max-w-[200px]">
                        {entry.target}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.created_at).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Laptop className="h-3 w-3" />
                        {entry.approx_device}
                      </span>
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {entry.approx_country} ({entry.ip_masked})
                      </span>
                      {entry.user_email && (
                        <span className="truncate max-w-[150px]">
                          par {entry.user_email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1"
                    onClick={() => setInspectEntry(entry)}
                  >
                    <Info className="h-3 w-3" />
                    Détails
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => fetchLogs(page - 1)}
            className="flex items-center gap-1 text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Précédent
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => fetchLogs(page + 1)}
            className="flex items-center gap-1 text-xs"
          >
            Suivant <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Modale d'inspection des détails assainis */}
      <Dialog open={Boolean(inspectEntry)} onOpenChange={(open) => !open && setInspectEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Détails de l'événement d'audit
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              ID : {inspectEntry?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">Action :</span>
              <span className="col-span-2 font-semibold text-foreground">{inspectEntry?.action}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">Cible :</span>
              <span className="col-span-2 font-mono text-foreground">{inspectEntry?.target}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">Résultat :</span>
              <span className="col-span-2 font-semibold text-foreground">{inspectEntry?.result}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">Date :</span>
              <span className="col-span-2 text-foreground">
                {inspectEntry?.created_at && new Date(inspectEntry.created_at).toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">Utilisateur :</span>
              <span className="col-span-2 text-foreground">{inspectEntry?.user_email || "Système"}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 border-b border-border pb-2">
              <span className="text-muted-foreground">IP masquée :</span>
              <span className="col-span-2 font-mono text-foreground">{inspectEntry?.ip_masked}</span>
            </div>

            <div className="space-y-1 pt-1">
              <span className="text-muted-foreground font-semibold">Métadonnées assainies :</span>
              <pre className="rounded-lg bg-muted p-2.5 font-mono text-[11px] text-foreground overflow-x-auto max-h-48">
                {JSON.stringify(inspectEntry?.details ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
