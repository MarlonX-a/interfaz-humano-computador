import { useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { X } from "lucide-react";
import CreateLessonModal from "./CreateLessonModal";
import SlideEditor from "./SlideEditor";
import MultiMediaUploader from "@/shared/components/MultiMediaUploader";
import { useEditContenido } from "@/features/content/hooks/useEditContenido";

interface EditContenidoModalProps {
  open: boolean;
  onClose: () => void;
  contenidoId: number | null;
  onUpdated: () => void;
  userId: string;
}

export default function EditContenidoModal({
  open,
  onClose,
  contenidoId,
  onUpdated,
  userId,
}: EditContenidoModalProps) {
  const { t } = useTranslation();

  const hook = useEditContenido({ open, contenidoId, userId, onClose, onUpdated });
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Focus first input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
        } catch (e) {}
      }, 50);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const inputClass = "w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-contenido-title"
          className="mx-4 w-full max-w-3xl max-h-[90vh] rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h3 id="edit-contenido-title" className="text-xl font-bold text-white">
              ✏️ {t('teacher.contents.editContent') || 'Editar Contenido'}
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {t('teacher.contents.editContentDescription') || 'Modifica los campos del contenido'}
            </p>
            <button
              aria-label={t('close') || 'Cerrar'}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={hook.handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
            {hook.loading ? (
              <div className="text-center py-8 text-gray-500">
                {t('loading') || 'Cargando...'}
              </div>
            ) : (
              <>
                {/* Lecciones (múltiples) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("teacher.contents.lessons") || "Lecciones"} <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Lecciones seleccionadas */}
                  {hook.selectedLeccionIds.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {hook.selectedLeccionIds.map((leccionId) => {
                        const leccion = hook.lecciones.find((l) => l.id === leccionId) || 
                                       hook.contenido?.lecciones?.find((l) => l.id === leccionId);
                        if (!leccion) return null;
                        return (
                          <div
                            key={leccionId}
                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {leccion.thumbnail_url && (
                                <img
                                  src={leccion.thumbnail_url}
                                  alt={leccion.titulo}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{leccion.titulo}</h4>
                                {leccion.descripcion && (
                                  <p className="text-sm text-gray-600 line-clamp-1">{leccion.descripcion}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const l = hook.lecciones.find((x) => x.id === leccionId) ?? null;
                                  hook.openCreateLessonModal(l);
                                }}
                                className="px-3 py-1.5 text-sm rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              >
                                {t('teacher.edit') || 'Editar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => hook.removeLeccion(leccionId)}
                                className="px-3 py-1.5 text-sm rounded bg-red-100 text-red-800 hover:bg-red-200"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selector de lecciones disponibles */}
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    {hook.lecciones.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {t('teacher.contents.noLessonsAvailable') || 'No hay lecciones disponibles'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {hook.lecciones.map((leccion) => {
                          const isSelected = hook.selectedLeccionIds.includes(leccion.id);
                          return (
                            <label
                              key={leccion.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => hook.toggleLeccion(leccion.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{leccion.titulo}</span>
                                {leccion.descripcion && (
                                  <p className="text-xs text-gray-500 line-clamp-1">{leccion.descripcion}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botón crear nueva lección */}
                  <button
                    type="button"
                    onClick={() => hook.openCreateLessonModal(null)}
                    className="mt-3 w-full px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>+</span>
                    <span>{t("addcontent.form.createLesson") || "Crear nueva lección"}</span>
                  </button>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.title") || "Título"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={hook.titulo}
                    onChange={(e) => hook.setTitulo(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.description") || "Descripción"}
                  </label>
                  <textarea
                    className={inputClass}
                    value={hook.texto_html}
                    onChange={(e) => hook.setTextoHtml(e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Tipo y Autor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.type") || "Tipo"}
                    </label>
                    <select
                      className={inputClass}
                      value={hook.type}
                      onChange={(e) => hook.setType(e.target.value)}
                    >
                      {hook.typeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.author") || "Autor"}
                    </label>
                    <input
                      className={inputClass}
                      value={hook.author}
                      onChange={(e) => hook.handleAuthorChange(e.target.value)}
                      onKeyDown={hook.handleAuthorKeyDown}
                    />
                    {hook.showAuthorSuggestions && hook.filteredAuthorSuggestions.length > 0 && (
                      <div className="absolute left-0 z-20 bg-white border rounded mt-1 p-2 flex gap-2 max-w-full overflow-auto shadow-lg">
                        {hook.filteredAuthorSuggestions.map((a, i) => (
                          <button
                            key={a}
                            type="button"
                            className={`px-3 py-1 rounded-full ${i === hook.authorActiveIndex ? 'bg-gray-200' : 'bg-gray-100'}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => hook.setAuthorActiveIndex(i)}
                            onClick={() => hook.insertAuthorSuggestion(a)}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Dificultad y Orden */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.difficulty") || "Dificultad"}
                    </label>
                    <select
                      className={inputClass}
                      value={hook.difficulty}
                      onChange={(e) => hook.setDifficulty(e.target.value as "fácil" | "media" | "difícil")}
                    >
                      <option value="fácil">{t("addcontent.form.difficultyOptions.easy") || "Fácil"}</option>
                      <option value="media">{t("addcontent.form.difficultyOptions.medium") || "Media"}</option>
                      <option value="difícil">{t("addcontent.form.difficultyOptions.hard") || "Difícil"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('teacher.contents.order') || 'Orden'}
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      value={hook.orden ?? ""}
                      onChange={(e) => hook.setOrden(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.tags") || "Etiquetas"}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {hook.tags.map((tag) => (
                      <span key={tag} className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          className="text-xs hover:text-red-600"
                          onClick={() => hook.removeTag(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    className={inputClass}
                    value={hook.tagInput}
                    onChange={(e) => hook.handleTagInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (hook.showTagsSuggestions && hook.filteredTagSuggestions[hook.tagActiveIndex]) {
                          hook.insertTagSuggestion(hook.filteredTagSuggestions[hook.tagActiveIndex]);
                        } else {
                          hook.addTag(hook.tagInput);
                        }
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        hook.setTagActiveIndex((i: number) => Math.min(i + 1, hook.filteredTagSuggestions.length - 1));
                      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        hook.setTagActiveIndex((i: number) => Math.max(i - 1, 0));
                      }
                    }}
                    placeholder={t('teacher.contents.addTag') || 'Escribe y presiona Enter para agregar'}
                  />
                  {hook.showTagsSuggestions && hook.filteredTagSuggestions.length > 0 && (
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
                      {hook.filteredTagSuggestions.map((tag, i) => (
                        <button
                          key={tag}
                          type="button"
                          className={`px-2 py-1 rounded-full text-xs ${i === hook.tagActiveIndex ? 'bg-gray-200' : 'bg-gray-100'}`}
                          onMouseEnter={() => hook.setTagActiveIndex(i)}
                          onClick={() => hook.insertTagSuggestion(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recursos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.resources") || "Recursos"}
                  </label>
                  {hook.resources.map((r, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        className={inputClass}
                        value={r}
                        onChange={(e) => hook.setResource(i, e.target.value)}
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 px-3"
                        onClick={() => hook.removeResource(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    onClick={hook.addResource}
                  >
                    {t("addcontent.form.addResource") || "+ Agregar recurso"}
                  </button>
                </div>

                {/* Pestañas de contenido multimedia */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t("addcontent.form.multimediaContent") || "Contenido Multimedia"}
                  </label>
                  <div className="flex gap-2 mb-4 border-b">
                    <button
                      type="button"
                      onClick={() => hook.setActiveTab('content')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        hook.activeTab === 'content' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t("addcontent.tabs.text") || "Texto"}
                    </button>
                    <button
                      type="button"
                      onClick={() => hook.setActiveTab('slides')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        hook.activeTab === 'slides' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t("addcontent.tabs.slides") || "Diapositivas"} {hook.slides.length > 0 && `(${hook.slides.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => hook.setActiveTab('media')}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        hook.activeTab === 'media' 
                          ? 'border-blue-500 text-blue-600' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {t("addcontent.tabs.media") || "Media"} {hook.mediaFiles.length > 0 && `(${hook.mediaFiles.length})`}
                    </button>
                  </div>

                  {/* Contenido según pestaña activa */}
                  {hook.activeTab === 'content' && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">
                        {t("addcontent.tabs.textDescription") || "El texto descriptivo se edita arriba en el campo 'Descripción'."}
                      </p>
                    </div>
                  )}

                  {hook.activeTab === 'slides' && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <SlideEditor 
                        slides={hook.slides} 
                        onChange={hook.setSlides}
                        availableModelos={hook.availableModelos}
                      />
                    </div>
                  )}

                  {hook.activeTab === 'media' && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <MultiMediaUploader
                        mediaFiles={hook.mediaFiles}
                        onMediaFilesChange={hook.setMediaFiles}
                        bucketName="contenidos"
                      />
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    disabled={hook.saving}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    {t('createLesson.buttons.cancel') || 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    disabled={hook.saving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {hook.saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        {t('createLesson.buttons.updating') || 'Actualizando...'}
                      </span>
                    ) : (
                      t("addcontent.form.update") || "Actualizar"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Modal de crear/editar lección */}
      <CreateLessonModal
        open={hook.showCreateLessonModal}
        onClose={hook.closeCreateLessonModal}
        onCreated={hook.handleLessonCreated}
        onUpdated={hook.handleLessonUpdated}
        parentLeccionId={hook.selectedLeccionIds.length > 0 ? hook.selectedLeccionIds[0] : null}
        leccion={hook.editingLeccion}
      />
    </>
  );
}

