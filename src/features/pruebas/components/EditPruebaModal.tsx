import React, { useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, Clock, Target } from "lucide-react";
import { useEditPrueba } from "@/features/pruebas/hooks/useEditPrueba";

interface EditPruebaModalProps {
  open: boolean;
  onClose: () => void;
  pruebaId: number | null;
  onUpdated: () => void;
  userId: string;
  defaultLeccionId?: number | null;
}

export default function EditPruebaModal({
  open,
  onClose,
  pruebaId,
  onUpdated,
  userId,
  defaultLeccionId,
}: EditPruebaModalProps) {
  const { t } = useTranslation();
  const hook = useEditPrueba({ open, pruebaId, userId, defaultLeccionId, onClose, onUpdated });

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
        } catch (e) {}
      }, 50);
    }
  }, [open]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-4xl max-h-[90vh] rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">
            {pruebaId ? "✏️ " : "➕ "}
            {pruebaId ? t('teacher.pruebas.editPrueba') || 'Editar Prueba' : t('teacher.pruebas.newPrueba') || 'Nueva Prueba'}
          </h3>
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
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.titulo') || 'Título'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={hook.titulo}
                    onChange={(e) => hook.setTitulo(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.descripcion') || 'Descripción'}
                  </label>
                  <textarea
                    className={inputClass}
                    value={hook.descripcion}
                    onChange={(e) => hook.setDescripcion(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.leccion') || 'Lección'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={hook.leccion_id ?? ""}
                    onChange={(e) => hook.setLeccionId(e.target.value ? Number(e.target.value) : null)}
                    required
                    disabled={!!defaultLeccionId && !pruebaId} // Deshabilitar si viene pre-seleccionada desde modal de lección
                  >
                    <option value="">{t('teacher.pruebas.selectLeccion') || 'Selecciona una lección'}</option>
                    {hook.lecciones.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.titulo}
                      </option>
                    ))}
                  </select>
                  {defaultLeccionId && !pruebaId && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('teacher.pruebas.leccionPreselected') || 'Lección pre-seleccionada desde la edición de lección'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.orden') || 'Orden'}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={hook.orden}
                    onChange={(e) => hook.setOrden(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock size={16} className="inline mr-1" />
                    {t('teacher.pruebas.tiempoLimite') || 'Tiempo límite (minutos)'}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={hook.tiempo_limite ?? ""}
                    onChange={(e) => hook.setTiempoLimite(e.target.value ? Number(e.target.value) : null)}
                    min="1"
                    placeholder={t('teacher.pruebas.tiempoLimitePlaceholder') || 'Opcional'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Target size={16} className="inline mr-1" />
                    {t('teacher.pruebas.puntajeMinimo') || 'Puntaje mínimo (%)'}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={hook.puntaje_minimo}
                    onChange={(e) => hook.setPuntajeMinimo(Number(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={hook.activa}
                      onChange={(e) => hook.setActiva(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {t('teacher.pruebas.activa') || 'Prueba activa'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Preguntas */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t('teacher.pruebas.preguntas') || 'Preguntas'}
                  </h4>
                  <button
                    type="button"
                    onClick={hook.addPregunta}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Plus size={16} />
                    {t('teacher.pruebas.addPregunta') || 'Agregar Pregunta'}
                  </button>
                </div>

                {hook.preguntas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    {t('teacher.pruebas.noPreguntas') || 'No hay preguntas. Agrega al menos una.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hook.preguntas.map((pregunta, preguntaIndex) => (
                      <div key={preguntaIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            {t('teacher.pruebas.pregunta') || 'Pregunta'} {preguntaIndex + 1}
                          </h5>
                          <button
                            type="button"
                            onClick={() => hook.removePregunta(preguntaIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('teacher.pruebas.preguntaTexto') || 'Texto de la pregunta'} <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            className={inputClass}
                            value={pregunta.texto}
                            onChange={(e) => hook.updatePreguntaField(preguntaIndex, "texto", e.target.value)}
                            rows={2}
                            required
                          />
                        </div>

                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('teacher.pruebas.tipoPregunta') || 'Tipo'}
                          </label>
                          <select
                            className={inputClass}
                            value={pregunta.tipo}
                            onChange={(e) => hook.updatePreguntaField(preguntaIndex, "tipo", e.target.value)}
                          >
                            <option value="opcion_multiple">{t('teacher.pruebas.opcionMultiple') || 'Opción múltiple'}</option>
                            <option value="verdadero_falso">{t('teacher.pruebas.verdaderoFalso') || 'Verdadero/Falso'}</option>
                          </select>
                        </div>

                        {/* Respuestas */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {t('teacher.pruebas.respuestas') || 'Respuestas'} <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => hook.addRespuesta(preguntaIndex)}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Plus size={14} />
                              {t('teacher.pruebas.addRespuesta') || 'Agregar'}
                            </button>
                          </div>

                          <div className="space-y-2">
                            {pregunta.respuestas.map((respuesta, respuestaIndex) => (
                              <div key={respuestaIndex} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={respuesta.es_correcta}
                                  onChange={(e) =>
                                    hook.updateRespuestaField(preguntaIndex, respuestaIndex, "es_correcta", e.target.checked)
                                  }
                                  className="w-4 h-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  className="flex-1 border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 text-black"
                                  value={respuesta.texto}
                                  onChange={(e) =>
                                    hook.updateRespuestaField(preguntaIndex, respuestaIndex, "texto", e.target.value)
                                  }
                                  placeholder={t('teacher.pruebas.respuestaPlaceholder') || 'Texto de la respuesta'}
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => hook.removeRespuesta(preguntaIndex, respuestaIndex)}
                                  className="text-red-600 hover:text-red-800"
                                  disabled={pregunta.respuestas.length <= 2}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                >
                  {t('createLesson.buttons.cancel') || 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={hook.saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {hook.saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('teacher.pruebas.saving') || 'Guardando...'}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {t('teacher.pruebas.save') || 'Guardar'}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

