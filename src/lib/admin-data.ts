import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Accès admin directement depuis le navigateur : chaque écriture est contrôlée
// côté base par les règles d'accès (rôle admin obligatoire).

export type ProjectRow = Tables<"projects">;
export type ExperienceRow = Tables<"experiences">;
export type CertificationRow = Tables<"certifications">;
export type ContactMessageRow = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  message: string;
  status: "unread" | "read" | "replied";
  replied_at: string | null;
  reply_notes: string | null;
};

export const adminProjectsQuery = queryOptions({
  queryKey: ["admin", "projects"],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").order("sort_order").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const adminProjectQuery = (id: string) => queryOptions({
  queryKey: ["admin", "project", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});
export const adminExperiencesQuery = queryOptions({
  queryKey: ["admin", "experiences"],
  queryFn: async () => {
    const { data, error } = await supabase.from("experiences").select("*").order("sort_order").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const adminCertificationsQuery = queryOptions({
  queryKey: ["admin", "certifications"],
  queryFn: async () => {
    const { data, error } = await supabase.from("certifications").select("*").order("sort_order").order("created_at");
    if (error) throw error;
    return data;
  },
});
export const adminMessagesQuery = queryOptions({
  queryKey: ["admin", "messages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ContactMessageRow[];
  },
});

/** Enregistre le nouvel ordre d'affichage (uniquement les lignes qui changent). */
export async function saveOrder(table: "projects" | "experiences" | "certifications", ordered: { id: string; sort_order: number }[]) {
  const changes = ordered.map((row, index) => ({ id: row.id, from: row.sort_order, to: index })).filter((c) => c.from !== c.to);
  for (const c of changes) {
    const { error } = await supabase.from(table).update({ sort_order: c.to }).eq("id", c.id);
    if (error) throw error;
  }
}

import { uploadToCloudinary, validateImage } from "@/lib/cloudinary";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Envoie une image sur Cloudinary et renvoie son adresse publique. */
export async function uploadProjectImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const err = validateImage(file, 5);
  if (err) throw new Error(err);
  const result = await uploadToCloudinary(file, "image", onProgress, "projets");
  return result.secure_url;
}
