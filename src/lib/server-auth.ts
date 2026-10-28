import { createClient, type User } from "@supabase/supabase-js";

export type AdminAuthResult =
  | { authorized: true; user: User }
  | { authorized: false; status: 401 | 403; error: string };

/**
 * Vérifie l'authentification et le rôle administrateur côté serveur pour une requête API.
 * Renvoie 401 si le token est manquant/expiré, ou 403 si l'utilisateur n'a pas le rôle admin.
 */
export async function verifyAdminRequest(request: Request): Promise<AdminAuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return {
      authorized: false,
      status: 401,
      error: "Connexion requise pour accéder à cette ressource.",
    };
  }

  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceKey) {
    console.error("[server-auth] Clés Supabase serveur manquantes");
    return {
      authorized: false,
      status: 500,
      error: "Configuration serveur incomplète.",
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !userData.user) {
    return {
      authorized: false,
      status: 401,
      error: "Session invalide ou expirée. Veuillez vous reconnecter.",
    };
  }

  // Vérification stricte du rôle admin en base via la fonction SECURITY DEFINER has_role
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    return {
      authorized: false,
      status: 403,
      error: "Accès refusé. Privilèges administrateur requis.",
    };
  }

  return { authorized: true, user: userData.user };
}

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}
