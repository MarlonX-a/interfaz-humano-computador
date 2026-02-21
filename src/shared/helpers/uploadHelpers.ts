import { supabase } from "@/shared/lib/supabaseClient";

/**
 * Sube un archivo a Supabase Storage con seguimiento de progreso vía XHR.
 */
export async function uploadFileWithProgress(
  file: File,
  bucketName: string,
  objectPath: string,
  onProgress: (percent: number) => void
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token =
    (sessionData as any)?.session?.access_token ||
    (sessionData as any)?.access_token;
  if (!token) throw new Error("No auth token found");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucketName}/${encodeURIComponent(objectPath)}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed with status ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Error uploading file"));
    xhr.send(file);
  });

  onProgress(100);

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(objectPath);
  return urlData.publicUrl;
}

/**
 * Valida un archivo de modelo 3D (extensión y tamaño).
 * Retorna null si es válido, o un string con el código de error.
 */
export function validateModelFile(file: File): "invalidFileType" | "fileTooLarge" | null {
  const ALLOWED = ["glb", "gltf", "usdz"];
  const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED.includes(ext)) return "invalidFileType";
  if (file.size > MAX_SIZE) return "fileTooLarge";
  return null;
}

/**
 * Descarga automáticamente un archivo (abre link en nueva pestaña).
 */
export function triggerDownload(url: string, filename: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {
    // Silently ignore download failures
  }
}
