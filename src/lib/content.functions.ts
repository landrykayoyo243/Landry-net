import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Lectures publiques : client à clé publique, soumis aux règles d'accès (seuls
// les éléments publiés sont visibles).
function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
}

const projectCols = "id, slug, title, tag, intro, summary, image_url, image_alt, technologies, external_url, featured, sort_order, content";

export const listPublishedProjects = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("projects").select(projectCols)
    .eq("status", "published").order("sort_order").order("created_at");
  if (error) throw new Error("Impossible de charger les projets.");
  return data;
});

export const getPublishedProject = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({ slug: String(input.slug).slice(0, 120) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("projects").select(projectCols)
      .eq("status", "published").eq("slug", data.slug).maybeSingle();
    if (error) throw new Error("Impossible de charger le projet.");
    return row;
  });

export const listPublishedExperiences = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("experiences").select("id, kind, period, title, organization, sort_order")
    .eq("published", true).order("sort_order").order("created_at");
  if (error) throw new Error("Impossible de charger le parcours.");
  return data;
});

export const listPublishedCertifications = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("certifications").select("id, title, issuer, date_label, sort_order")
    .eq("published", true).order("sort_order").order("created_at");
  if (error) throw new Error("Impossible de charger les certifications.");
  return data;
});
