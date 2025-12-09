import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { createLeccion } from "../lib/data/lecciones";
import { supabase } from "../lib/supabaseClient";
import type { LeccionInsert, ModeloRA } from "../types/db";
import { createModeloRA, updateModeloRA } from "../lib/data/modelos";
import QuickModelModal from "./QuickModelModal";

export default function CreateLessonModal({
  open,
  onClose,
  onCreated,
  parentLeccionId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (newId: number) => void;
  parentLeccionId?: number | null;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nivel, setNivel] = useState("");
  const [thumbnail_url, setThumbnailUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelType, setModelType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [showQuickModelModal, setShowQuickModelModal] = useState(false);
  const [pendingQuickModel, setPendingQuickModel] = useState<ModeloRA | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Simple inline component to show a preview using model-viewer if available
  const ModelPreview = ({ src, alt } : { src: string; alt?: string }) => {
    const [hasViewer, setHasViewer] = useState(false);
    useEffect(() => {
      // If model-viewer is already registered, show it
      if ((window as any).customElements && (window as any).customElements.get('model-viewer')) {
        setHasViewer(true);
        return;
      }
      // Otherwise, dynamically load the script
      const existing = document.querySelector('script[data-model-viewer]');
      if (!existing) {
        const script = document.createElement('script');
        script.setAttribute('data-model-viewer', 'true');
        script.type = 'module';
        script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
        script.onload = () => setHasViewer(true);
        document.head.appendChild(script);
      } else {
        setHasViewer(!!((window as any).customElements && (window as any).customElements.get('model-viewer')));
      }
    }, []);
    if (!src) return null;
    return (
      <div>
        {hasViewer ? (
          // @ts-ignore - model-viewer element
          <model-viewer src={src} alt={alt || 'modelo'} style={{ width: '100%', height: 200 }} camera-controls auto-rotate />
        ) : (
          <div className="text-sm text-gray-700">Previsualización no disponible. <a className="text-blue-600 underline" target="_blank" rel="noreferrer" href={src}>Abrir modelo</a></div>
        )}
      </div>
    );
  };

  // Keep hooks always called in the same order independent of `open`
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    console.debug('[CreateLessonModal] open=', open);
    if (!open) {
      setUploadedModelUrl(null);
      setUploadProgress(0);
      setUploading(false);
      setPendingQuickModel(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error("El título es requerido");
      return;
    }
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = (sessionData as any)?.session?.user?.id;
      const payload: LeccionInsert = {
        titulo: titulo.trim(),
        descripcion: descripcion || null,
        nivel: nivel || null,
        thumbnail_url: thumbnail_url || null,
        created_by: userId || null,
      };
      const created = await createLeccion(payload);
      toast.success("Lección creada");
      onCreated(created.id);
      // If we have a pending quick created model, link it to the leccion
      if (pendingQuickModel) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = (sessionData as any)?.session?.user?.id;
          if (!userId) {
            toast.error('Debes iniciar sesión para asociar el modelo a la lección');
          } else {
            await updateModeloRA(pendingQuickModel.id ?? pendingQuickModel, { leccion_id: created.id });
          }
        } catch (err: any) {
          console.warn('Error linking quick model', err);
          toast.error('Error asociando el modelo: ' + (err?.message || ''));        
        }
        setPendingQuickModel(null);
      }
      // If a model file is set, upload to storage and create modelo_ra
      if (modelFile) {
        // Validate file extension & size
        const allowed = ["glb", "gltf", "usdz"];
        const ext = modelFile.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowed.includes(ext)) {
          toast.error("Tipo de archivo no válido. Usa .glb, .gltf o .usdz");
          // skip upload, continue
        } else {
          const MAX_SIZE = 50 * 1024 * 1024; // 50MB
          if (modelFile.size > MAX_SIZE) {
            toast.error("Archivo demasiado grande. Máximo 50 MB");
          } else {
            setUploading(true);
            setUploadProgress(0);
            const filename = `${Date.now()}_${modelFile.name}`;
            const bucket = 'modelos-ra';
            const path = `lecciones/${created.id}/${filename}`;
            // Upload file to Supabase Storage using XHR so we can track progress
            const uploadFileWithProgress = async (file: File, bucketName: string, objectPath: string) => {
              return new Promise<void>(async (resolve, reject) => {
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  const token = (sessionData as any)?.session?.access_token || (sessionData as any)?.access_token;
                  if (!token) return reject(new Error('No auth token found'));
                  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucketName}/${encodeURIComponent(objectPath)}`;
                  const xhr = new XMLHttpRequest();
                  xhr.open('PUT', url);
                  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                  // Supabase ignores Content-Type for raw uploads; but set it to file type
                  xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                  // Do not upsert by default
                  xhr.setRequestHeader('x-upsert', 'false');
                  xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                      const percent = Math.round((e.loaded / e.total) * 100);
                      setUploadProgress(percent);
                    }
                  };
                  xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      setUploadProgress(100);
                      resolve();
                    } else {
                      reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                  };
                  xhr.onerror = () => reject(new Error('Error uploading file'));
                  xhr.send(file);
                } catch (err) {
                  reject(err);
                }
              });
            };
            try {
              await uploadFileWithProgress(modelFile, bucket, path);
              // get public URL
              const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
              const archivo_url = urlData.publicUrl;
              const { data: sessionData } = await supabase.auth.getSession();
              const userId = (sessionData as any)?.session?.user?.id;
              // Create model row
              const modelPayload = {
                leccion_id: created.id,
                nombre_modelo: modelName || modelFile.name,
                archivo_url,
                tipo: modelType || null,
                descripcion: null,
                created_by: userId || null,
              } as any;
              console.debug('[CreateLessonModal] createModeloRA payload', modelPayload);
              await createModeloRA(modelPayload);
              toast.success('Modelo de RA subido y asociado a la lección');
              setUploadProgress(100);
              setUploadedModelUrl(archivo_url);
                // Auto-download to preview the uploaded model
                try {
                  const a = document.createElement('a');
                  a.href = archivo_url;
                  a.download = modelPayload.nombre_modelo || `modelo_${Date.now()}.glb`;
                  a.target = '_blank';
                  a.rel = 'noreferrer';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                } catch (err) {
                  console.warn('Auto-download of uploaded model failed', err);
                }
              // Reset model fields after upload
              setModelFile(null);
              setModelName("");
              setModelType("");
            } catch (err: any) {
              console.error('upload exception', err);
              toast.error(err?.message || 'Error subiendo modelo');
            } finally {
              setUploading(false);
              setTimeout(() => setUploadProgress(0), 400);
            }
          }
        }
      }
      // limpiar y cerrar
      setTitulo("");
      setDescripcion("");
      setNivel("");
      setThumbnailUrl("");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error creando lección");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
        } catch (e) {}
      }, 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="create-lesson-title" className="mx-4 w-full max-w-md rounded-lg p-4 sm:p-6 bg-white shadow-lg overflow-y-auto">
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100">
          <X size={18} />
        </button>
        <h3 id="create-lesson-title" className="text-lg font-semibold mb-4">Crear Lección</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block mb-1">Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block mb-1">Descripción</label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full border px-3 py-2 rounded" rows={3} />
          </div>
          <div>
            <label className="block mb-1">Nivel</label>
            <input value={nivel} onChange={(e) => setNivel(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block mb-1">Thumbnail URL</label>
            <input value={thumbnail_url} onChange={(e) => setThumbnailUrl(e.target.value)} className="w-full border px-3 py-2 rounded" />
          </div>
          <div>
            <label className="block mb-1">Modelo RA (opcional)</label>
            <input
              type="file"
              accept=".glb,.gltf,.usdz"
              onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
              className="w-full"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Nombre del modelo (opcional)" className="border px-3 py-2 rounded" />
              <input value={modelType} onChange={(e) => setModelType(e.target.value)} placeholder="Tipo (ej. glb, usdz)" className="border px-3 py-2 rounded" />
            </div>
              {uploading && (
              <div className="mt-2 h-2 rounded overflow-hidden bg-gray-200">
                <div className="h-full bg-green-600" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
              {uploadedModelUrl && (
                <div className="mt-3 border rounded p-2 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-700">Modelo subido</div>
                    <a className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer" href={uploadedModelUrl}>Abrir</a>
                  </div>
                  <div className="mt-2">
                    {/* Try to load model-viewer at runtime to show inline preview; fallback to link */}
                    <ModelPreview src={uploadedModelUrl} alt={modelName || 'Modelo'} />
                  </div>
                </div>
              )}
                {pendingQuickModel && (
                  <div className="mt-3 border rounded p-2 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-700">Modelo rápido: {pendingQuickModel.nombre_modelo}</div>
                      {pendingQuickModel.archivo_url && (
                        <a className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer" href={pendingQuickModel.archivo_url}>Abrir</a>
                      )}
                    </div>
                  </div>
                )}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setShowQuickModelModal(true)} className="px-3 py-2 rounded bg-indigo-600 text-white">Crear modelo RA rápido</button>
                {pendingQuickModel && (
                  <button type="button" className="px-3 py-2 rounded bg-gray-200" onClick={async () => { setUploadedModelUrl(null); setPendingQuickModel(null); }}>
                    Quitar modelo rapido
                  </button>
                )}
              </div>
          </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
            <button type="button" disabled={isLoading} className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="px-3 py-2 rounded bg-blue-600 text-white">
              {isLoading ? "Creando..." : "Crear Lección"}
            </button>
            </div>
        </form>
      </div>
      </div>
      <QuickModelModal open={showQuickModelModal} leccionId={parentLeccionId} onClose={() => setShowQuickModelModal(false)} onCreated={(model) => {
        setPendingQuickModel(model);
        setUploadedModelUrl(model.archivo_url);
        setShowQuickModelModal(false);
      }} />
    </>
  );
}