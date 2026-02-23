import { useRef, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { X, Upload, FileUp, Sparkles, Plus, Edit, Trash2, BookOpen, Presentation, Video, Image, Link } from "lucide-react";
import type { Leccion } from "@/shared/types";
import QuickModelModal from "@/features/models3d/components/QuickModelModal";
import EditPruebaModal from "@/features/pruebas/components/EditPruebaModal";
import SlideEditor from "./SlideEditor";
import MultiMediaUploader from "@/shared/components/MultiMediaUploader";
import { useCreateLesson } from "@/features/content/hooks/useCreateLesson";

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
  const modalRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  // ── Toda la lógica vive en el hook ──
  const {
    titulo, setTitulo,
    descripcion, setDescripcion,
    nivel, setNivel,
    thumbnail_url, setThumbnailUrl,
    thumbnailUploading,
    handleThumbnailUpload,
    isLoading,
    modelFile, setModelFile,
    modelName, setModelName,
    modelType, setModelType,
    uploading, uploadProgress,
    uploadedModelUrl, setUploadedModelUrl,
    showQuickModelModal, setShowQuickModelModal,
    pendingQuickModel, setPendingQuickModel,
    pruebas, loadingPruebas,
    editingPruebaId,
    userId, userRole,
    slides, setSlides,
    mediaFiles, setMediaFiles,
    activeTab, setActiveTab,
    availableModelos,
    handleSubmit,
    handleCreatePrueba,
    handleEditPrueba,
    handleDeletePrueba,
    handlePruebaUpdated,
    handlePruebaModalClose,
    handleQuickModelCreated,
    handleDeleteModelo,
  } = useCreateLesson({ open, leccion, onClose, onCreated, onUpdated });

  // ── Keyboard & focus (UI-only) ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try { modalRef.current?.querySelector<HTMLInputElement>("input")?.focus(); } catch {}
      }, 50);
    }
  }, [open]);

  // Simple inline component to show a preview using model-viewer if available
  const ModelPreview = ({ src, alt }: { src: string; alt?: string }) => {
    const [hasViewer, setHasViewer] = useState(false);
    useEffect(() => {
      if ((window as any).customElements?.get('model-viewer')) { setHasViewer(true); return; }
      const existing = document.querySelector('script[data-model-viewer]');
      if (!existing) {
        const script = document.createElement('script');
        script.setAttribute('data-model-viewer', 'true');
        script.type = 'module';
        script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
        script.onload = () => setHasViewer(true);
        document.head.appendChild(script);
      } else {
        setHasViewer(!!((window as any).customElements?.get('model-viewer')));
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
                    
                    {/* Preview */}
                    {thumbnail_url && (
                      <div className="relative mb-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        <img
                          src={thumbnail_url}
                          alt="Thumbnail preview"
                          className="w-full h-24 object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => setThumbnailUrl("")}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                          title={t('createLesson.fields.removeThumbnail') || 'Eliminar thumbnail'}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Link input */}
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <Link size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={thumbnail_url}
                          onChange={(e) => setThumbnailUrl(e.target.value)}
                          className="w-full border border-gray-300 pl-8 pr-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          placeholder={t('createLesson.placeholders.thumbnailUrl') || 'https://...'}
                        />
                      </div>
                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleThumbnailUpload(file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        disabled={thumbnailUploading}
                        className="flex items-center gap-1 px-2.5 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm disabled:opacity-50"
                        title={t('createLesson.fields.uploadThumbnail') || 'Subir imagen'}
                      >
                        {thumbnailUploading ? (
                          <span className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                        ) : (
                          <Image size={16} />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{t('createLesson.fields.thumbnailHint') || 'Pega un enlace o sube una imagen (JPG, PNG, WebP, GIF, máx 5 MB)'}</p>
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

                {/* Modelos existentes vinculados a esta lección */}
                {availableModelos.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FileUp size={16} className="text-purple-600" />
                      {t('createLesson.existingModels', { defaultValue: 'Modelos vinculados a esta lección' })}
                      <span className="text-xs text-gray-400">({availableModelos.length})</span>
                    </h4>
                    <div className="space-y-2">
                      {availableModelos.map((modelo) => (
                        <div key={modelo.id} className="border rounded-xl p-3 bg-purple-50 border-purple-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-purple-700">{modelo.nombre_modelo}</span>
                              {modelo.tipo && <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full">{modelo.tipo}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {modelo.archivo_url && (
                                <a 
                                  className="text-sm text-purple-600 hover:text-purple-700 underline" 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  href={modelo.archivo_url}
                                >
                                  {t('createLesson.openInNewTab') || 'Abrir en nueva pestaña'}
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteModelo(modelo.id)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t('createLesson.deleteModel') || 'Eliminar modelo'}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {modelo.archivo_url && (
                            <ModelPreview src={modelo.archivo_url} alt={modelo.nombre_modelo} />
                          )}
                          {!modelo.archivo_url && (
                            <p className="text-xs text-gray-400 italic">{t('createLesson.noModelUrl', { defaultValue: 'Sin archivo de modelo disponible' })}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <hr className="border-gray-200" />
                  </div>
                )}
              
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
        onCreated={handleQuickModelCreated} 
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