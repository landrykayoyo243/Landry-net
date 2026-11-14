import { useState, type FormEvent } from "react";
import { z } from "zod";
import { CheckCircle2, MessageSquare, Send } from "lucide-react";
import { profile } from "@/content/portfolio";
import { errorBtn } from "@/components/portfolio/ErrorPage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import "./contact-section.css";

const schema = z.object({
  name: z.string().trim().min(1, "Veuillez indiquer votre nom").max(100, "100 caractères maximum"),
  email: z.string().trim().min(1, "Veuillez indiquer votre email").email("Adresse email invalide").max(255, "255 caractères maximum"),
  subject: z.string().trim().min(1, "Veuillez préciser l'objet").max(200, "200 caractères maximum"),
  message: z.string().trim().min(10, "Message trop court (10 caractères minimum)").max(3000, "3000 caractères maximum"),
});

type Errors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

const fieldBase =
  "w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:px-4 sm:py-3 sm:text-base";

async function sendMessage(data: z.infer<typeof schema>) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorData.error || "Impossible d'envoyer l'email pour le moment.");
  }
}

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sentInfo, setSentInfo] = useState<{ name: string; subject: string } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const result = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!result.success) {
      const nextErrors: Errors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof Errors;
        if (!nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      setStatus("idle");
      form.querySelector<HTMLElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }

    setErrors({});
    setServerError(null);
    setStatus("sending");
    try {
      await sendMessage(result.data);
      setSentInfo({ name: result.data.name, subject: result.data.subject });
      setStatus("sent");
      setConfirmOpen(true);
      form.reset();
    } catch (error) {
      console.error(error);
      setServerError(error instanceof Error ? error.message : "Erreur lors de l'envoi");
      setStatus("failed");
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div>
    
 <label htmlFor="subject" className="mb-1 block text-xs font-semibold text-foreground sm:mb-1.5 sm:text-sm">Objet</label>

            <input id="name" name="name" type="text" autoComplete="name" placeholder="Votre nom" className={fieldBase} aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
            {errors.name && <p id="name-err" className="mt-1 text-xs font-medium text-destructive">{errors.name}</p>}
          </div>
          <div>

<label htmlFor="email" className="mb-1 block text-xs font-semibold text-foreground sm:mb-1.5 sm:text-sm">Adresse email</label>
            
            <input id="email" name="email" type="email" autoComplete="email" placeholder="votre.email@exemple.com" className={fieldBase} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
            {errors.email && <p id="email-err" className="mt-1 text-xs font-medium text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div>
 <label htmlFor="subject" className="mb-1 block text-xs font-semibold text-foreground sm:mb-1.5 sm:text-sm">Objet</label>
         
          <input id="subject" name="subject" type="text" placeholder="Ex. : Projet réseau, site web…" className={fieldBase} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-err" : undefined} />
          {errors.subject && <p id="subject-err" className="mt-1 text-xs font-medium text-destructive">{errors.subject}</p>}
        </div>

        <div>
 <label htmlFor="message" className="mb-1 block text-xs font-semibold text-foreground sm:mb-1.5 sm:text-sm">Message</label>
         
          <textarea id="message" name="message" rows={3} placeholder="Décrivez votre besoin…" className={`${fieldBase} resize-y`} aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
          {errors.message && <p id="message-err" className="mt-1 text-xs font-medium text-destructive">{errors.message}</p>}
        </div>

        <button type="submit" disabled={status === "sending"} aria-busy={status === "sending"} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5 sm:text-base">
          {status === "sending" ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /><span>Envoi en cours…</span></>
          ) : (
            <><Send size={16} /><span>Envoyer le message</span></>
          )}
        </button>

        <div aria-live="polite">
          {status === "failed" && (
            <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 bg-white p-4">
              <p className="text-sm font-semibold text-destructive">{serverError || "Votre message n'a pas pu être envoyé. Vous pouvez réessayer ou m'écrire sur WhatsApp."}</p>
              <a href={profile.whatsapp} target="_blank" rel="noreferrer" className={errorBtn.whatsapp}>Écrire sur WhatsApp</a>
            </div>
          )}
        </div>
      </form>

      <p className="mt-4 border-t border-border/60 pt-3 text-center text-xs text-muted-foreground sm:mt-5 sm:pt-4 sm:text-sm">
        Une question urgente ?{" "}
        <a href={profile.whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <MessageSquare size={14} aria-hidden /> Écrivez-moi sur WhatsApp
        </a>
      </p>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border-border bg-card p-6 text-center shadow-xl sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 ring-8 ring-emerald-500/5">
            <CheckCircle2 size={36} className="stroke-[2.2]" />
          </div>
          <DialogHeader className="mt-4 space-y-2 text-center sm:text-center">
            <DialogTitle className="text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">Message envoyé</DialogTitle>
            <DialogDescription className="text-center text-sm leading-relaxed text-muted-foreground">
              {sentInfo?.name ? <>Merci <strong className="text-foreground">{sentInfo.name}</strong> ! Votre message concernant <strong className="text-foreground">« {sentInfo.subject} »</strong> a bien été reçu. Je vous répondrai sous 24h.</> : "Merci ! Votre message a bien été transmis. Je vous répondrai sous 24 heures."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-center">
            <Button type="button" onClick={() => setConfirmOpen(false)} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground shadow-sm hover:opacity-90">Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
