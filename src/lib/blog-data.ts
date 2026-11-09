import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { uploadToCloudinary, validateImage, compressImageBeforeUpload } from "@/lib/cloudinary";

export type BlogPostRow = Tables<"blog_posts">;

/** Lecture publique — uniquement les articles publiés */
export const blogPostsQuery = queryOptions({
  queryKey: ["blog", "posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BlogPostRow[];
  },
});

export const blogPostQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BlogPostRow | null;
    },
  });

/** Admin — tous les articles (brouillons et publiés) */
export const adminBlogPostsQuery = queryOptions({
  queryKey: ["admin", "blog", "posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as BlogPostRow[];
  },
});

export const adminBlogPostQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "blog", "post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BlogPostRow | null;
    },
  });

/** Calcule le temps de lecture estimé à partir du HTML (environ 200 mots/min) */
export function estimateReadingTime(html: string): number {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/** Téléverse une image d'article de blog sur Cloudinary */
export async function uploadBlogImage(file: File): Promise<string> {
  validateImage(file);
  const compressed = await compressImageBeforeUpload(file);
  return uploadToCloudinary(compressed);
}
