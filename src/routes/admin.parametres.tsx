import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Zap,
  Gauge,
  Sliders,
  Check,
  Lock,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { adminApi, type AdminSecretMeta } from "@/lib/admin-api-client";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminParametresPage,
});

interface AiModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  recommended: boolean;
}

function AdminParametresPage() {
  const [secrets, setSecrets] = useState<AdminSecretMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Modale Ajouter / Remplacer
  const [editSecret, setEditSecret] = useState<AdminSecretMeta | null>(null);
  const [secretValue, setSecretValue] = useState("");
  const [showSecretValue, setShowSecretValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modale Supprimer
  const [deleteTarget, setDeleteTarget] = useState<AdminSecretMeta | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Modale Rotation Clé Maître
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [oldMasterKey, setOldMasterKey] = useState("");
  const [newMasterKey, setNewMasterKey] = useState("");
  const [isRotating, setIsRotating] = useState(false);

  // Test secret
  const [testingName, setTestingName] = useState<string | null>(null);

  // ── PHASE B : Configuration IA & Quotas ──────────────────────────────────
  const [aiConfig, setAiConfig] = useState({
    model: "gemini-1.5-flash",
    daily_request_limit: 100,
    max_prompt_chars: 8000,
    allow_contact_messages: false,
  });
  const [aiUsage, setAiUsage] = useState({
    day: new Date().toISOString().slice(0, 10),
    request_count: 0,
    daily_limit: 100,
    remaining: 100,
  });
  const [aiModels, setAiModels] = useState<AiModel[]>([]);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isSavingAiConfig, setIsSavingAiConfig] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [secretsData, aiData] = await Promise.all([
        adminApi.listSecrets(),
        adminApi.getAiData().catch(() => null),
      ]);
      setSecrets(secretsData);
      if (aiData) {
        setAiConfig(aiData.config);
        setAiUsage(aiData.usage);
        setAiModels(aiData.models);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSecret || !secretValue.trim()) {
      toast.error("Veuillez saisir une valeur pour le secret.");
      return;
    }

    try {
      setIsSaving(true);
      await adminApi.saveSecret({
        name: editSecret.name,
        label: editSecret.label,
        value: secretValue.trim(),
      });
      toast.success(`Le secret « ${editSecret.label} » a été chiffré et enregistré.`);
      setEditSecret(null);
      setSecretValue("");
      setShowSecretValue(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSecret = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmationInput.trim() !== deleteTarget.name) {
      toast.error(`Veuillez taper exactement "${deleteTarget.name}" pour confirmer.`);
      return;
    }

    try {
      setIsDeleting(true);
      await adminApi.deleteSecret(deleteTarget.name);
      toast.success(`Le secret « ${deleteTarget.label} » a été supprimé.`);
      setDeleteTarget(null);
      setDeleteConfirmationInput("");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestSecret = async (secret: AdminSecretMeta) => {
    try {
      setTestingName(secret.name);
      const res = await adminApi.testSecret(secret.name);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du test");
    } finally {
      setTestingName(null);
    }
  };

  const handleRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldMasterKey.trim() || !newMasterKey.trim()) {
      toast.error("Veuillez renseigner l'ancienne et la nouvelle clé maître.");
      return;
    }

    try {
      setIsRotating(true);
      const res = await adminApi.rotateMasterKey(oldMasterKey.trim(), newMasterKey.trim());
      toast.success(res.message || "Rotation réussie !");
      setShowRotationModal(false);
      setOldMasterKey("");
      setNewMasterKey("");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la rotation");
    } finally {
      setIsRotating(false);
    }
  };

  // ── Handlers Phase B : IA Gemini ─────────────────────────────────────────
  const handleTestAiConnection = async () => {
    try {
      setIsTestingAi(true);
      const res = await adminApi.testAiConnection();
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de tester l'IA");
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveAiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingAiConfig(true);
      await adminApi.updateAiConfig(aiConfig);
      toast.success("Configuration et plafonds de l'IA enregistrés.");
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement IA");
    } finally {
      setIsSavingAiConfig(false);
    }
  };

  const usagePercent = Math.min(
    100,
    Math.round((aiUsage.request_count / Math.max(1, aiUsage.daily_limit)) * 100),
  );

  const geminiSecretConfigured = secrets.find((s) => s.name === "ai_api_key")?.is_configured;
  const telegramConfigured = secrets.find((s) => s.name === "telegram_bot_token")?.is_configured && secrets.find((s) => s.name === "telegram_chat_id")?.is_configured;

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const handleTestTelegram = async () => {
    try {
      setIsTestingTelegram(true);
      const res = await adminApi.testTelegram();
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur notification Telegram");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* En-tête de page */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Paramètres & Coffre de secrets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chiffrement AES-256-GCM, passerelle Google Gemini et plafonds de requêtes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRotationModal(true)}
            className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Rotation clé maître
          </Button>
        </div>
      </div>

      {/* ── SECTION 1 : COFFRE DE SECRETS CHIFFRÉS (PHASE A) ─────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Coffre de secrets chiffrés</h2>
          </div>
          <span className="text-xs text-muted-foreground">Chiffré serveur (AES-256-GCM)</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {secrets.map((secret) => {
            const isConfigured = secret.is_configured;
            const isTesting = testingName === secret.name;

            return (
              <Card key={secret.name} className="flex flex-col justify-between border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold leading-snug">{secret.label}</CardTitle>
                      <CardDescription className="text-xs font-mono text-muted-foreground">
                        {secret.name}
                      </CardDescription>
                    </div>
                    <div className="shrink-0">
                      {isConfigured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Configuré
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                          <XCircle className="h-3 w-3" /> Non configuré
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <div className="rounded-lg bg-muted/50 p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Valeur masquée :</span>
                      <span className="font-mono font-medium text-foreground">
                        {isConfigured ? `••••••••${secret.last4}` : "—"}
                      </span>
                    </div>
                    {isConfigured && secret.updated_at && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Dernière mise à jour :</span>
                        <span>{new Date(secret.updated_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setEditSecret(secret);
                        setSecretValue("");
                        setShowSecretValue(false);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      {isConfigured ? "Remplacer" : "Ajouter"}
                    </Button>

                    {isConfigured && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isTesting}
                          onClick={() => handleTestSecret(secret)}
                          className="text-xs"
                          title="Tester le déchiffrement"
                        >
                          <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin" : ""}`} />
                          <span className="ml-1 hidden sm:inline">Tester</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeleteTarget(secret);
                            setDeleteConfirmationInput("");
                          }}
                          className="text-xs text-destructive hover:bg-destructive/10"
                          title="Supprimer le secret"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  {secret.name === "telegram_bot_token" && telegramConfigured && (
                    <div className="pt-2 border-t border-border/50">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isTestingTelegram}
                        onClick={handleTestTelegram}
                        className="w-full text-xs gap-1.5 rounded-lg text-primary"
                      >
                        <Send className={`h-3 w-3 ${isTestingTelegram ? "animate-spin" : ""}`} />
                        <span>{isTestingTelegram ? "Envoi test..." : "Envoyer une alerte test Telegram"}</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 2 : SERVICE IA GOOGLE GEMINI (PHASE B) ───────────────── */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Service IA Google Gemini</h2>
              <p className="text-xs text-muted-foreground">
                Passerelle unique serveur, choix du modèle, quotas et protection de la vie privée.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!geminiSecretConfigured || isTestingAi}
            onClick={handleTestAiConnection}
            className="flex items-center gap-1.5 text-xs self-start sm:self-auto"
          >
            <Zap className={`h-3.5 w-3.5 text-amber-500 ${isTestingAi ? "animate-pulse" : ""}`} />
            {isTestingAi ? "Test en cours..." : "Tester la connexion Gemini"}
          </Button>
        </div>

        {!geminiSecretConfigured && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Clé API Gemini manquante
            </div>
            <p className="mt-1 text-muted-foreground">
              Veuillez ajouter votre clé dans l'emplacement « Clé API IA (Gemini) » ci-dessus pour activer le module IA.
            </p>
          </div>
        )}

        {/* Compteur d'utilisation du jour */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Compteur d'utilisation du jour
              </CardTitle>
              <span className="text-xs font-mono font-medium text-foreground">
                {aiUsage.request_count} / {aiUsage.daily_limit} requêtes ({usagePercent}%)
              </span>
            </div>
            <CardDescription className="text-xs">
              Réinitialisé automatiquement chaque jour à minuit UTC.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all duration-500 ${
                  usagePercent > 90
                    ? "bg-destructive"
                    : usagePercent > 70
                    ? "bg-amber-500"
                    : "bg-primary"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Restant aujourd'hui : <strong>{aiUsage.remaining}</strong> requête(s)</span>
              <span>Date : {aiUsage.day}</span>
            </div>
          </CardContent>
        </Card>

        {/* Formulaire de configuration des plafonds et du modèle */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              Paramètres du modèle et plafonds de consommation
            </CardTitle>
            <CardDescription className="text-xs">
              Ajustez le modèle sélectionné et les plafonds pour maîtriser les coûts et le quota.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleSaveAiConfig} className="space-y-5">
              {/* Choix du modèle */}
              <div className="space-y-2">
                <Label htmlFor="ai-model" className="text-xs font-semibold">
                  Modèle Gemini sélectionné
                </Label>
                <select
                  id="ai-model"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {aiModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} {m.recommended ? "★ Recommandé (Flash - Rapide & Économique)" : ""}
                    </option>
                  ))}
                  {/* Fallback si modèle non présent dans la liste */}
                  {!aiModels.some((m) => m.id === aiConfig.model) && (
                    <option value={aiConfig.model}>{aiConfig.model}</option>
                  )}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Les modèles <strong>Flash</strong> sont optimisés pour une réponse instantanée et une consommation minimale de quota.
                </p>
              </div>

              {/* Plafonds : requêtes/jour et taille max */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="daily-limit" className="text-xs font-semibold">
                    Plafond de requêtes par jour
                  </Label>
                  <Input
                    id="daily-limit"
                    type="number"
                    min="1"
                    max="10000"
                    value={aiConfig.daily_request_limit}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, daily_request_limit: parseInt(e.target.value, 10) || 100 })
                    }
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Bloque toute requête supplémentaire pour éviter les dépassements inattendus.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="max-prompt" className="text-xs font-semibold">
                    Taille maximale d'une demande (caractères)
                  </Label>
                  <Input
                    id="max-prompt"
                    type="number"
                    min="500"
                    max="50000"
                    value={aiConfig.max_prompt_chars}
                    onChange={(e) =>
                      setAiConfig({ ...aiConfig, max_prompt_chars: parseInt(e.target.value, 10) || 8000 })
                    }
                    className="h-8 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Empêche l'envoi de documents volumineux risquant d'épuiser le quota.
                  </p>
                </div>
              </div>

              {/* Interrupteur Offre Gratuite : Messages de contact */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow-contact" className="text-xs font-semibold flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      Traitement IA des messages de contact (Offre payante uniquement)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Par défaut, aucun message reçu via le formulaire de contact n'est transmis à l'IA pour préserver la confidentialité des expéditeurs avec l'offre gratuite de Gemini.
                    </p>
                  </div>
                  <Switch
                    id="allow-contact"
                    checked={aiConfig.allow_contact_messages}
                    onCheckedChange={(checked) =>
                      setAiConfig({ ...aiConfig, allow_contact_messages: checked })
                    }
                  />
                </div>
                {aiConfig.allow_contact_messages && (
                  <div className="rounded-lg bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                    Attention : n'activez cet interrupteur que si vous avez lié une carte de crédit à votre projet Google Cloud (l'offre payante exclut vos données de l'entraînement des modèles de Google).
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" size="sm" disabled={isSavingAiConfig} className="text-xs">
                  {isSavingAiConfig ? "Enregistrement..." : "Enregistrer les paramètres IA"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ── MODALES (PHASE A) ────────────────────────────────────────────── */}
      {/* Modale d'ajout / remplacement de secret */}
      <Dialog open={Boolean(editSecret)} onOpenChange={(open) => !open && setEditSecret(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveSecret}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                {editSecret?.is_configured ? "Remplacer le secret" : "Ajouter un secret"}
              </DialogTitle>
              <DialogDescription>
                Saisissez la valeur pour <strong>{editSecret?.label}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="secret-value" className="text-xs font-semibold">
                  Nouvelle valeur secrète
                </Label>
                <div className="relative">
                  <Input
                    id="secret-value"
                    type={showSecretValue ? "text" : "password"}
                    value={secretValue}
                    onChange={(e) => setSecretValue(e.target.value)}
                    placeholder="Saisissez la clé ou le jeton..."
                    className="pr-10 font-mono text-sm"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretValue(!showSecretValue)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showSecretValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    Pour votre sécurité, cette valeur sera chiffrée avec AES-256-GCM et <strong>ne sera plus jamais réaffichée</strong> dans l'interface après confirmation.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditSecret(null)} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving || !secretValue.trim()}>
                {isSaving ? "Chiffrement..." : "Enregistrer et chiffrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale de suppression avec confirmation par nom */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le secret
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le secret <strong>{deleteTarget?.label}</strong> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">
              Pour confirmer la suppression, veuillez saisir le nom technique du secret :{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-bold font-mono text-foreground">
                {deleteTarget?.name}
              </code>
            </p>
            <Input
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder={deleteTarget?.name}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || deleteConfirmationInput.trim() !== deleteTarget?.name}
              onClick={handleDeleteSecret}
            >
              {isDeleting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale de rotation de clé maître */}
      <Dialog open={showRotationModal} onOpenChange={setShowRotationModal}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleRotate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <RotateCcw className="h-5 w-5" />
                Rotation de la clé maître (APP_ENCRYPTION_KEY)
              </DialogTitle>
              <DialogDescription>
                Permet de ré-enchiffrer tous les secrets existants avec une nouvelle clé maître sans aucune perte de données.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="old-key" className="text-xs font-semibold">
                  Ancienne clé maître (actuellement configurée)
                </Label>
                <Input
                  id="old-key"
                  type="password"
                  value={oldMasterKey}
                  onChange={(e) => setOldMasterKey(e.target.value)}
                  placeholder="64 caractères hexadécimaux..."
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-key" className="text-xs font-semibold">
                  Nouvelle clé maître (32 octets aléatoires)
                </Label>
                <Input
                  id="new-key"
                  type="password"
                  value={newMasterKey}
                  onChange={(e) => setNewMasterKey(e.target.value)}
                  placeholder="64 caractères hexadécimaux générés..."
                  className="font-mono text-xs"
                  required
                />
              </div>

              <div className="rounded-lg bg-muted p-3 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Important après la rotation :</p>
                <p>
                  Mettez à jour la variable d'environnement <code className="font-mono">APP_ENCRYPTION_KEY</code> sur votre serveur avec la nouvelle clé, puis redéployez.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setShowRotationModal(false)} disabled={isRotating}>
                Annuler
              </Button>
              <Button type="submit" disabled={isRotating || !oldMasterKey || !newMasterKey}>
                {isRotating ? "Rotation en cours..." : "Lancer la rotation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
