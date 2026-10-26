import { supabase } from "@/integrations/supabase/client";

export type UploadResourceType = "image" | "raw";

/**
 * Sous-dossiers organisés dans le dossier principal Cloudinary (ex: Landry_Media/...)
 */
export type CloudinaryFolder =
  | "projets"
  | "cv"
  | "organisations"
  | "immersion"
  | "medias"
  | (string & {});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
}

/**
 * Upload un fichier vers Cloudinary via un upload signé côté serveur.
 * La clé API secrète ne passe jamais dans le navigateur.
 *
 * @param folder Sous-dossier de destination (projets, cv, organisations, immersion, etc.)
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: UploadResourceType = "image",
  onProgress?: (pct: number) => void,
  folder: CloudinaryFolder = "medias",
): Promise<CloudinaryUploadResult> {
  // 1. Rafraîchir la session Supabase pour garantir un token valide
  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Non authentifié. Veuillez vous reconnecter.");

  // 2. Demander une signature au serveur avec le dossier cible
  const signRes = await fetch("/api/cloudinary-sign", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ resource_type: resourceType, folder }),
  });
  if (!signRes.ok) {
    const err = (await signRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Erreur de signature Cloudinary.");
  }
  const { signature, timestamp, apiKey, cloudName, folder: targetFolder } = (await signRes.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };

  // 3. Upload direct vers Cloudinary
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", targetFolder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  // Upload avec progression via XHR
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
      } else {
        const err = JSON.parse(xhr.responseText || "{}") as { error?: { message?: string } };
        reject(new Error(err.error?.message ?? "Échec de l'envoi vers Cloudinary."));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau lors de l'envoi."));
    xhr.send(fd);
  });
}

/** Valide le type MIME d'une image ou d'un logo SVG avant l'upload. */
export function validateImage(file: File, maxMb = 5): string | null {
  const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (!ALLOWED.includes(file.type) && !isSvg) return "Format non autorisé : SVG, PNG, JPG, WEBP ou GIF.";
  if (file.size > maxMb * 1024 * 1024) return `Fichier trop lourd : ${maxMb} Mo maximum.`;
  return null;
}

/** Valide un fichier PDF avant l'upload. */
export function validatePdf(file: File, maxMb = 10): string | null {
  if (file.type !== "application/pdf") return "Seuls les fichiers PDF sont acceptés.";
  if (file.size > maxMb * 1024 * 1024) return `Fichier trop lourd : ${maxMb} Mo maximum.`;
  return null;
}
