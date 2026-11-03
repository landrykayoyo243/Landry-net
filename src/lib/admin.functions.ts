import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const GENERIC = "Identifiants incorrects.";
const LIMITED = "Trop de tentatives. Patientez quelques minutes avant de réessayer.";

/** Connexion admin côté serveur : limitation des tentatives + messages génériques. */
export const adminSignIn = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string }) => ({
    email: String(input?.email ?? "").trim().slice(0, 254),
    password: String(input?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const admin = await import("@/lib/admin.server");
    await admin.ensureAdminBootstrap().catch(() => console.error("Admin bootstrap error"));
    if (!data.email || !data.password) return { ok: false as const, error: GENERIC };

    const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const keys = await admin.attemptKeys(ip, data.email);
    if (await admin.isRateLimited(keys)) return { ok: false as const, error: LIMITED };

    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: auth, error } = await client.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error || !auth.session) {
      await admin.recordFailure(keys);
      return { ok: false as const, error: GENERIC };
    }
    await admin.clearFailures(keys);
    return { ok: true as const, access_token: auth.session.access_token, refresh_token: auth.session.refresh_token };
  });

/** Lève l'obligation de changer le mot de passe, après un changement réussi. */
export const clearPasswordChangeFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Accès refusé");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, { app_metadata: { must_change_password: false } });
    if (error) throw new Error("Mise à jour impossible");
    return { ok: true };
  });
