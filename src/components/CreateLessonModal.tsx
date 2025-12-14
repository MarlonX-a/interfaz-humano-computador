import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { X, Upload, FileUp, Sparkles, Plus, Edit, Trash2, BookOpen, Presentation, Video } from "lucide-react";
import toast from "react-hot-toast";
import { createLeccion, updateLeccion } from "../lib/data/lecciones";
import { supabase } from "../lib/supabaseClient";
import { getProfile } from "../lib/data/profiles";
import type { LeccionInsert, ModeloRA, Leccion, Prueba, ContentSlide, MediaFile } from "../types/db";
import { createModeloRA, updateModeloRA, listModelosByLeccion } from "../lib/data/modelos";
import { listPruebasByLeccion, deletePrueba } from "../lib/data/pruebas";
import QuickModelModal from "./QuickModelModal";
import EditPruebaModal from "./EditPruebaModal";
import SlideEditor from "./SlideEditor";
import MultiMediaUploader from "./MultiMediaUploader";

export default function CreateLessonModal({
  open,
  onClose,
  onCreated,
  parentLeccionId,
  leccion,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (newId: number) => void;
  parentLeccionId?: number | null;
  leccion?: Leccion | null;
  onUpdated?: (id: number) => void;
}) {
  const { t } = useTranslation();
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Estado para pruebas
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [loadingPruebas, setLoadingPruebas] = useState(false);
  const [editingPruebaId, setEditingPruebaId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Estado para slides y media
  const [slides, setSlides] = useState<ContentSlide[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'slides' | 'media' | 'model' | 'pruebas'>('info');
  const [availableModelos, setAvailableModelos] = useState<ModeloRA[]>([]);

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
          <div className="text-sm text-gray-700">{t('models.previewUnavailable')} <a className="text-blue-600 underline" target="_blank" rel="noreferrer" href={src}>{t('models.openModel')}</a></div>
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

  // Cargar userId al montar
  useEffect(() => {
    const loadUserId = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = (sessionData as any)?.session?.user?.id;
      setUserId(uid || null);
      try {
        if (uid) {
          const { data: profile } = await getProfile(uid);
          const role = profile?.role || (sessionData as any)?.session?.user?.user_metadata?.role || null;
          setUserRole(role || null);
        }
      } catch (err) {
        // fallback to metadata if profile fetch fails
        const fallback = (sessionData as any)?.session?.user?.user_metadata?.role || null;
        setUserRole(fallback || null);
      }
    };
    loadUserId();
  }, []);

  // Cargar pruebas cuando se abre el modal y hay una lección
  useEffect(() => {
    const loadPruebas = async () => {
      if (open && leccion?.id) {
        setLoadingPruebas(true);
        try {
          const pruebasData = await listPruebasByLeccion(leccion.id);
          setPruebas(pruebasData);
        } catch (error: any) {
          console.error('Error loading pruebas:', error);
          toast.error(error?.message || 'Error al cargar pruebas');
        } finally {
          setLoadingPruebas(false);
        }
      } else {
        setPruebas([]);
      }
    };
    loadPruebas();
  }, [open, leccion]);

  useEffect(() => {
    console.debug('[CreateLessonModal] open=', open, 'leccion=', leccion);
    if (!open) {
      setUploadedModelUrl(null);
      setUploadProgress(0);
      setUploading(false);
      setPendingQuickModel(null);
      setTitulo("");
      setDescripcion("");
      setNivel("");
      setThumbnailUrl("");
      setPruebas([]);
      setEditingPruebaId(null);
      setSlides([]);
      setMediaFiles([]);
      setActiveTab('info');
      setAvailableModelos([]);
    }
    // If we are opening in edit mode, prefill fields
    if (open && leccion) {
      setTitulo(leccion.titulo || "");
      setDescripcion(leccion.descripcion || "");
      setNivel(leccion.nivel || "");
      setThumbnailUrl(leccion.thumbnail_url || "");
      setSlides(Array.isArray(leccion.slides) ? leccion.slides : []);
      setMediaFiles(Array.isArray(leccion.media_files) ? leccion.media_files : []);
      // Cargar modelos disponibles para esta lección
      if (leccion.id) {
        listModelosByLeccion(leccion.id).then(modelos => setAvailableModelos(modelos)).catch(() => {});
      }
    }
  }, [open, leccion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      toast.error(t('createLesson.errors.titleRequired'));
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
        slides: slides.length > 0 ? slides : null,
        media_files: mediaFiles.length > 0 ? mediaFiles : null,
      };
      let targetLeccionId: number | undefined;
      if (leccion && leccion.id) {
        const updated = await updateLeccion(leccion.id, payload as any);
        targetLeccionId = updated.id;
        toast.success(t('createLesson.success.updated') || t('createLesson.success.created'));
        if (onUpdated) onUpdated(updated.id);
      } else {
        const created = await createLeccion(payload);
        targetLeccionId = created.id;
        toast.success(t('createLesson.success.created'));
        onCreated(created.id);
      }
      // If we have a pending quick created model, link it to the leccion
      if (pendingQuickModel) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = (sessionData as any)?.session?.user?.id;
            if (!userId) {
            toast.error(t('createLesson.errors.notAuthenticatedToLinkModel'));
          } else if (targetLeccionId) {
            await updateModeloRA(pendingQuickModel.id ?? pendingQuickModel, { leccion_id: targetLeccionId });
          }
        } catch (err: any) {
          console.warn('Error linking quick model', err);
          toast.error(t('createLesson.errors.linkModelError', { message: err?.message || '' }));
        }
        setPendingQuickModel(null);
      }
      // If a model file is set, upload to storage and create modelo_ra
      if (modelFile) {
        // Validate file extension & size
        const allowed = ["glb", "gltf", "usdz"];
        const ext = modelFile.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowed.includes(ext)) {
          toast.error(t('createLesson.errors.invalidFileType'));
          // skip upload, continue
        } else {
          const MAX_SIZE = 50 * 1024 * 1024; // 50MB
          if (modelFile.size > MAX_SIZE) {
            toast.error(t('createLesson.errors.fileTooLarge'));
          } else {
            setUploading(true);
            setUploadProgress(0);
            const filename = `${Date.now()}_${modelFile.name}`;
            const bucket = 'modelos-ra';
            const path = `lecciones/${targetLeccionId}/${filename}`;
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
                leccion_id: targetLeccionId,
                nombre_modelo: modelName || modelFile.name,
                archivo_url,
                tipo: modelType || null,
                descripcion: null,
                created_by: userId || null,
              } as any;
              console.debug('[CreateLessonModal] createModeloRA payload', modelPayload);
              await createModeloRA(modelPayload);
              toast.success(t('createLesson.success.modelUploadedAndLinked'));
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
              toast.error(err?.message || t('createLesson.errors.uploadError'));
            } finally {
              setUploading(false);
              setTimeout(() => setUploadProgress(0), 400);
            }
          }
        }
      }
      // Recargar pruebas después de guardar
      if (targetLeccionId) {
        try {
          const pruebasData = await listPruebasByLeccion(targetLeccionId);
          setPruebas(pruebasData);
        } catch (err) {
          console.warn('Error reloading pruebas:', err);
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
      toast.error(err?.message || t('createLesson.errors.createError'));
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

  // Funciones para gestionar pruebas
  const handleCreatePrueba = () => {
    if (!leccion?.id) {
      toast.error(t('teacher.pruebas.saveLessonFirst') || 'Debes guardar la lección primero');
      return;
    }
    setEditingPruebaId(0); // 0 = nueva prueba
  };

  const handleEditPrueba = (pruebaId: number) => {
    setEditingPruebaId(pruebaId);
  };

  const handleDeletePrueba = async (pruebaId: number) => {
    if (!confirm(t('teacher.pruebas.confirmDelete') || '¿Estás seguro de eliminar esta prueba?')) {
      return;
    }
    try {
      await deletePrueba(pruebaId);
      toast.success(t('teacher.pruebas.deleted') || 'Prueba eliminada');
      // Recargar pruebas
      if (leccion?.id) {
        const pruebasData = await listPruebasByLeccion(leccion.id);
        setPruebas(pruebasData);
      }
    } catch (error: any) {
      console.error('Error deleting prueba:', error);
      toast.error(error?.message || 'Error al eliminar prueba');
    }
  };

  const handlePruebaUpdated = async () => {
    // Recargar pruebas después de crear/actualizar
    if (leccion?.id) {
      try {
        const pruebasData = await listPruebasByLeccion(leccion.id);
        setPruebas(pruebasData);
      } catch (error: any) {
        console.error('Error reloading pruebas:', error);
      }
    }
    setEditingPruebaId(null);
  };

  const handlePruebaModalClose = () => {
    setEditingPruebaId(null);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div 
          ref={modalRef} 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="create-lesson-title" 
          className="mx-4 w-full max-w-3xl rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h3 id="create-lesson-title" className="text-xl font-bold text-white">
              ✨ {leccion ? t('createLesson.editTitle', { defaultValue: 'Editar Lección' }) : t('createLesson.title')}
            </h3>
            <p className="text-blue-100 text-sm mt-1">{t('createLesson.headerDescription') || 'Completa los campos para crear tu lección'}</p>
            <button 
              aria-label={t('close')} 
              onClick={onClose} 
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Pestañas */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === 'info' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📝 {t('createLesson.tabs.info', { defaultValue: 'Información' })}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('slides')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'slides' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Presentation size={16} />
                {t('createLesson.tabs.slides', { defaultValue: 'Diapositivas' })}
                {slides.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 rounded-full">{slides.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'media' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Video size={16} />
                {t('createLesson.tabs.media', { defaultValue: 'Media' })}
                {mediaFiles.length > 0 && <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 rounded-full">{mediaFiles.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('model')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === 'model' 
                    ? 'border-blue-500 text-blue-600 bg-white' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileUp size={16} />
                {t('createLesson.tabs.model', { defaultValue: 'Modelo RA' })}
              </button>
              {leccion?.id && (
                <button
                  type="button"
                  onClick={() => setActiveTab('pruebas')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'pruebas' 
                      ? 'border-blue-500 text-blue-600 bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <BookOpen size={16} />
                  {t('createLesson.tabs.pruebas', { defaultValue: 'Pruebas' })}
                  {pruebas.length > 0 && <span className="ml-1 text-xs bg-green-100 text-green-600 px-1.5 rounded-full">{pruebas.length}</span>}
                </button>
              )}
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Tab: Información */}
            {activeTab === 'info' && (
              <>
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('createLesson.fields.title')} <span className="text-red-500">*</span>
                  </label>
                  <input 
                    value={titulo} 
                    onChange={(e) => setTitulo(e.target.value)} 
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    placeholder={t('createLesson.placeholders.title') || 'Ej: Introducción a la Química Orgánica'}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('createLesson.fields.description')}</label>
                  <textarea 
                    value={descripcion} 
                    onChange={(e) => setDescripcion(e.target.value)} 
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none" 
                    rows={3} 
                    placeholder={t('createLesson.placeholders.description') || 'Describe brevemente el contenido de la lección...'}
                  />
                </div>

                {/* Nivel y Thumbnail */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createLesson.fields.level')}</label>
                    <select
                      value={nivel}
                      onChange={(e) => setNivel(e.target.value)}
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Básico">{t('createLesson.fields.levelOptions.basic') || 'Básico'}</option>
                      <option value="Intermedio">{t('createLesson.fields.levelOptions.intermediate') || 'Intermedio'}</option>
                      <option value="Avanzado">{t('createLesson.fields.levelOptions.advanced') || 'Avanzado'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createLesson.fields.thumbnail')}</label>
                    <input 
                      value={thumbnail_url} 
                      onChange={(e) => setThumbnailUrl(e.target.value)} 
                      className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                      placeholder={t('resourcePlaceholder') || 'https://...'}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Tab: Slides */}
            {activeTab === 'slides' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('createLesson.slidesDescription', { defaultValue: 'Crea diapositivas para tu lección. Puedes agregar texto, imágenes y asociar modelos 3D.' })}
                </p>
                <SlideEditor
                  slides={slides}
                  onChange={setSlides}
                  availableModelos={availableModelos}
                />
              </div>
            )}

            {/* Tab: Media */}
            {activeTab === 'media' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-4">
                  {t('createLesson.mediaDescription', { defaultValue: 'Agrega archivos multimedia como PDFs, videos, audios o imágenes para complementar la lección.' })}
                </p>
                <MultiMediaUploader
                  mediaFiles={mediaFiles}
                  onMediaFilesChange={setMediaFiles}
                  bucketName="contenido-media"
                />
              </div>
            )}

            {/* Tab: Modelo RA */}
            {activeTab === 'model' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('createLesson.modelDescription', { defaultValue: 'Sube un modelo 3D (.glb, .gltf, .usdz) o genera uno con IA para experiencias de realidad aumentada.' })}
                </p>
              
                {/* Botón de selección de archivo estilizado */}
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf,.usdz"
                    onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="model-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
                  >
                    <Upload size={20} className="text-gray-400 group-hover:text-blue-500" />
                    <span className="text-gray-600 group-hover:text-blue-600">
                      {modelFile ? modelFile.name : "Seleccionar archivo 3D (.glb, .gltf, .usdz)"}
                    </span>
                  </button>

                  {modelFile && (
                    <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                      <span className="text-sm text-green-700">✓ {modelFile.name}</span>
                    <button 
                      type="button" 
                      onClick={() => setModelFile(null)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Campos adicionales del modelo */}
                {modelFile && (
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      value={modelName} 
                      onChange={(e) => setModelName(e.target.value)} 
                      placeholder={t('models.quickModel.namePlaceholder') || 'Nombre del modelo'} 
                      className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    />
                    <input 
                      value={modelType} 
                      onChange={(e) => setModelType(e.target.value)} 
                      placeholder={t('models.quickModel.typeLabel') || 'Tipo (glb, usdz)'} 
                      className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                )}

                {/* Barra de progreso */}
                {uploading && (
                  <div className="space-y-1">
                    <div className="h-2 rounded-full overflow-hidden bg-gray-200">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }} 
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">{t('common.percentCompleted', { percent: uploadProgress })}</p>
                  </div>
                )}

                {/* Preview del modelo subido */}
                {uploadedModelUrl && (
                  <div className="border rounded-xl p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Modelo subido</span>
                      <a 
                        className="text-sm text-blue-600 hover:text-blue-700 underline" 
                        target="_blank" 
                        rel="noreferrer" 
                        href={uploadedModelUrl}
                      >
                        {t('createLesson.openInNewTab') || 'Abrir en nueva pestaña'}
                      </a>
                    </div>
                    <ModelPreview src={uploadedModelUrl} alt={modelName || 'Modelo'} />
                  </div>
                )}

                {/* Modelo rápido pendiente */}
                {pendingQuickModel && (
                  <div className="border rounded-xl p-3 bg-purple-50 border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">
                          {pendingQuickModel.nombre_modelo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {pendingQuickModel.archivo_url && (
                          <a 
                            className="text-sm text-purple-600 hover:text-purple-700 underline" 
                            target="_blank" 
                            rel="noreferrer" 
                            href={pendingQuickModel.archivo_url}
                          >
                            Ver
                          </a>
                        )}
                        <button 
                          type="button" 
                          onClick={() => { setUploadedModelUrl(null); setPendingQuickModel(null); }}
                          className="text-purple-400 hover:text-purple-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botón crear modelo RA rápido */}
                <button 
                  type="button" 
                  onClick={() => setShowQuickModelModal(true)} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-medium hover:from-purple-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Sparkles size={18} />
                    {t('models.quickModel.buttons.generateAi')}
                </button>
                </div>
              </div>
            )}

            {/* Tab: Pruebas */}
            {activeTab === 'pruebas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t('createLesson.pruebasDescription', { defaultValue: 'Gestiona las pruebas y evaluaciones asociadas a esta lección.' })}
                  </p>
                  {leccion?.id && ((userRole === 'admin') || (userId && leccion?.created_by === userId)) && (
                    <button
                      type="button"
                      onClick={handleCreatePrueba}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus size={16} />
                      {t('teacher.pruebas.newPrueba') || 'Nueva Prueba'}
                    </button>
                  )}
                </div>

                {!leccion?.id ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
                    {t('teacher.pruebas.saveLessonFirst') || 'Guarda la lección primero para poder crear pruebas asociadas'}
                  </div>
              ) : loadingPruebas ? (
                <div className="text-center py-4 text-gray-500">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  {t('loading') || 'Cargando...'}
                </div>
              ) : pruebas.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-500">
                  {t('teacher.pruebas.noPruebas') || 'No hay pruebas asociadas a esta lección'}
                </div>
              ) : (
                <div className="space-y-2">
                  {pruebas.map((prueba) => (
                    <div
                      key={prueba.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{prueba.titulo}</div>
                        {prueba.descripcion && (
                          <div className="text-sm text-gray-500 mt-1">{prueba.descripcion}</div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          {prueba.tiempo_limite && (
                            <span>{t('teacher.pruebas.timeLimit') || 'Tiempo límite'}: {prueba.tiempo_limite} min</span>
                          )}
                          <span className={`px-2 py-0.5 rounded ${prueba.activa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {prueba.activa ? (t('teacher.pruebas.active') || 'Activa') : (t('teacher.pruebas.inactive') || 'Inactiva')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {((userRole === 'admin') || (userId && leccion?.created_by === userId)) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditPrueba(prueba.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('teacher.pruebas.edit') || 'Editar'}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePrueba(prueba.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('teacher.pruebas.delete') || 'Eliminar'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <button 
                type="button" 
                disabled={isLoading} 
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors" 
                onClick={onClose}
              >
                {t('createLesson.buttons.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={isLoading} 
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {t(leccion ? 'createLesson.buttons.updating' : 'createLesson.buttons.creating')}
                  </span>
                ) : (
                  t(leccion ? 'createLesson.buttons.update' : 'createLesson.buttons.create')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <QuickModelModal 
        open={showQuickModelModal} 
        leccionId={parentLeccionId} 
        onClose={() => setShowQuickModelModal(false)} 
        onCreated={(model) => {
          setPendingQuickModel(model);
          setUploadedModelUrl(model.archivo_url);
          setShowQuickModelModal(false);
        }} 
      />
      {editingPruebaId !== null && userId && (
        <EditPruebaModal
          open={editingPruebaId !== null}
          onClose={handlePruebaModalClose}
          pruebaId={editingPruebaId === 0 ? null : editingPruebaId}
          onUpdated={handlePruebaUpdated}
          userId={userId}
          defaultLeccionId={leccion?.id || null}
        />
      )}
    </>
  );
}