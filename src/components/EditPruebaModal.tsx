import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, Clock, Target } from "lucide-react";
import toast from "react-hot-toast";
import { getPruebaCompleta, createPrueba, updatePrueba } from "../lib/data/pruebas";
import { createPregunta, updatePregunta, deletePregunta } from "../lib/data/preguntas";
import { createRespuesta, updateRespuesta, deleteRespuesta, createRespuestas } from "../lib/data/respuestas";
import { supabase } from "../lib/supabaseClient";
import type { PruebaCompleta, PruebaInsert, PruebaUpdate, PreguntaInsert, RespuestaInsert, Leccion } from "../types/db";
import { listLecciones } from "../lib/data/lecciones";

interface EditPruebaModalProps {
  open: boolean;
  onClose: () => void;
  pruebaId: number | null;
  onUpdated: () => void;
  userId: string;
  defaultLeccionId?: number | null; // Para pre-seleccionar lección cuando se crea desde el modal de lección
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prueba, setPrueba] = useState<PruebaCompleta | null>(null);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [leccion_id, setLeccionId] = useState<number | null>(null);
  const [tiempo_limite, setTiempoLimite] = useState<number | null>(null);
  const [puntaje_minimo, setPuntajeMinimo] = useState<number>(60);
  const [activa, setActiva] = useState(true);
  const [orden, setOrden] = useState<number>(0);

  // Preguntas state
  const [preguntas, setPreguntas] = useState<Array<{
    id?: number;
    texto: string;
    tipo: string;
    orden: number;
    respuestas: Array<{
      id?: number;
      texto: string;
      es_correcta: boolean;
      orden: number;
    }>;
  }>>([]);

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && pruebaId) {
      loadPrueba();
    } else if (open && !pruebaId) {
      // Nueva prueba
      resetForm();
      // Si hay defaultLeccionId, establecerlo
      if (defaultLeccionId) {
        setLeccionId(defaultLeccionId);
      }
    }
    if (open) {
      loadLecciones();
    }
  }, [open, pruebaId, defaultLeccionId]);

  const loadPrueba = async () => {
    if (!pruebaId) return;
    setLoading(true);
    try {
      const data = await getPruebaCompleta(pruebaId);
      setPrueba(data);
      setTitulo(data.titulo || "");
      setDescripcion(data.descripcion || "");
      setLeccionId(data.leccion_id);
      setTiempoLimite(data.tiempo_limite);
      setPuntajeMinimo(data.puntaje_minimo || 60);
      setActiva(data.activa ?? true);
      setOrden(data.orden || 0);
      
      // Cargar preguntas
      setPreguntas(
        data.preguntas.map((p) => ({
          id: p.id,
          texto: p.texto,
          tipo: p.tipo || "opcion_multiple",
          orden: p.orden || 0,
          respuestas: p.respuestas.map((r) => ({
            id: r.id,
            texto: r.texto,
            es_correcta: r.es_correcta || false,
            orden: r.orden || 0,
          })),
        }))
      );
    } catch (error: any) {
      console.error("Error loading prueba:", error);
      toast.error(error?.message || t('teacher.pruebas.loadError') || 'Error al cargar prueba');
    } finally {
      setLoading(false);
    }
  };

  const loadLecciones = async () => {
    try {
      const data = await listLecciones();
      const teacherLecciones = data.filter((l) => l.created_by === userId);
      setLecciones(teacherLecciones);
    } catch (error: any) {
      console.error("Error loading lecciones:", error);
    }
  };

  const resetForm = () => {
    setTitulo("");
    setDescripcion("");
    setLeccionId(null);
    setTiempoLimite(null);
    setPuntajeMinimo(60);
    setActiva(true);
    setOrden(0);
    setPreguntas([]);
    setPrueba(null);
  };

  const addPregunta = () => {
    setPreguntas((prev) => [
      ...prev,
      {
        texto: "",
        tipo: "opcion_multiple",
        orden: prev.length,
        respuestas: [
          { texto: "", es_correcta: false, orden: 0 },
          { texto: "", es_correcta: false, orden: 1 },
        ],
      },
    ]);
  };

  const removePregunta = (index: number) => {
    const pregunta = preguntas[index];
    if (pregunta.id) {
      // Eliminar de BD
      deletePregunta(pregunta.id).catch(console.error);
    }
    setPreguntas((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i })));
  };

  const updatePreguntaField = (index: number, field: string, value: any) => {
    setPreguntas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addRespuesta = (preguntaIndex: number) => {
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i === preguntaIndex
          ? {
              ...p,
              respuestas: [
                ...p.respuestas,
                { texto: "", es_correcta: false, orden: p.respuestas.length },
              ],
            }
          : p
      )
    );
  };

  const removeRespuesta = (preguntaIndex: number, respuestaIndex: number) => {
    const respuesta = preguntas[preguntaIndex].respuestas[respuestaIndex];
    if (respuesta.id) {
      deleteRespuesta(respuesta.id).catch(console.error);
    }
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i === preguntaIndex
          ? {
              ...p,
              respuestas: p.respuestas.filter((_, ri) => ri !== respuestaIndex).map((r, ri) => ({ ...r, orden: ri })),
            }
          : p
      )
    );
  };

  const updateRespuestaField = (
    preguntaIndex: number,
    respuestaIndex: number,
    field: string,
    value: any
  ) => {
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i === preguntaIndex
          ? {
              ...p,
              respuestas: p.respuestas.map((r, ri) =>
                ri === respuestaIndex ? { ...r, [field]: value } : r
              ),
            }
          : p
      )
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error(t("teacher.pruebas.validation.titleRequired") || "El título es requerido");
      return;
    }

    if (!leccion_id) {
      toast.error(t("teacher.pruebas.validation.leccionRequired") || "Selecciona una lección");
      return;
    }

    if (preguntas.length === 0) {
      toast.error(t("teacher.pruebas.validation.preguntasRequired") || "Agrega al menos una pregunta");
      return;
    }

    // Validar que cada pregunta tenga al menos 2 respuestas y al menos una correcta
    for (let i = 0; i < preguntas.length; i++) {
      const p = preguntas[i];
      if (!p.texto.trim()) {
        toast.error(t("teacher.pruebas.validation.preguntaTextRequired", { num: i + 1 }) || `La pregunta ${i + 1} debe tener texto`);
        return;
      }
      if (p.respuestas.length < 2) {
        toast.error(t("teacher.pruebas.validation.minRespuestas", { num: i + 1 }) || `La pregunta ${i + 1} debe tener al menos 2 respuestas`);
        return;
      }
      if (!p.respuestas.some((r) => r.es_correcta)) {
        toast.error(t("teacher.pruebas.validation.correctaRequired", { num: i + 1 }) || `La pregunta ${i + 1} debe tener al menos una respuesta correcta`);
        return;
      }
      for (let j = 0; j < p.respuestas.length; j++) {
        if (!p.respuestas[j].texto.trim()) {
          toast.error(t("teacher.pruebas.validation.respuestaTextRequired", { num: i + 1, resp: j + 1 }) || `La respuesta ${j + 1} de la pregunta ${i + 1} debe tener texto`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      let currentPruebaId: number;

      if (pruebaId && pruebaId !== 0) {
        // Actualizar prueba existente
        const payload: PruebaUpdate = {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          leccion_id,
          tiempo_limite: tiempo_limite || null,
          puntaje_minimo,
          activa,
          orden,
        };
        const updated = await updatePrueba(pruebaId, payload);
        currentPruebaId = updated.id;
      } else {
        // Crear nueva prueba
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = (sessionData as any)?.session?.user?.id;
        const payload: PruebaInsert = {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          leccion_id: leccion_id!,
          tiempo_limite: tiempo_limite || null,
          puntaje_minimo,
          activa,
          orden,
          created_by: userId || null,
        };
        const created = await createPrueba(payload);
        currentPruebaId = created.id;
      }

      // Guardar/actualizar preguntas y respuestas
      for (let i = 0; i < preguntas.length; i++) {
        const pregunta = preguntas[i];
        let preguntaId: number;

        if (pregunta.id) {
          // Actualizar pregunta existente
          const updated = await updatePregunta(pregunta.id, {
            texto: pregunta.texto.trim(),
            tipo: pregunta.tipo,
            prueba_id: currentPruebaId,
            orden: i,
          });
          preguntaId = updated.id;

          // Eliminar respuestas que ya no existen
          const existingRespuestas = prueba?.preguntas.find((p) => p.id === pregunta.id)?.respuestas || [];
          const currentRespuestaIds = pregunta.respuestas.filter((r) => r.id).map((r) => r.id!);
          const respuestasToDelete = existingRespuestas.filter((r) => !currentRespuestaIds.includes(r.id));
          for (const r of respuestasToDelete) {
            await deleteRespuesta(r.id);
          }
        } else {
          // Crear nueva pregunta
          const created = await createPregunta({
            texto: pregunta.texto.trim(),
            tipo: pregunta.tipo,
            prueba_id: currentPruebaId,
            leccion_id: null, // Ya no se usa
            orden: i,
          });
          preguntaId = created.id;
        }

        // Guardar respuestas
        const respuestasToCreate: RespuestaInsert[] = [];
        for (let j = 0; j < pregunta.respuestas.length; j++) {
          const respuesta = pregunta.respuestas[j];
          if (respuesta.id) {
            // Actualizar respuesta existente
            await updateRespuesta(respuesta.id, {
              texto: respuesta.texto.trim(),
              es_correcta: respuesta.es_correcta,
              orden: j,
            });
          } else {
            // Crear nueva respuesta
            respuestasToCreate.push({
              pregunta_id: preguntaId,
              texto: respuesta.texto.trim(),
              es_correcta: respuesta.es_correcta,
              orden: j,
            });
          }
        }
        if (respuestasToCreate.length > 0) {
          await createRespuestas(respuestasToCreate);
        }
      }

      toast.success(t('teacher.pruebas.saveSuccess') || 'Prueba guardada correctamente');
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error saving prueba:", error);
      toast.error(error?.message || t('teacher.pruebas.saveError') || 'Error al guardar prueba');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

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
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
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
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.descripcion') || 'Descripción'}
                  </label>
                  <textarea
                    className={inputClass}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('teacher.pruebas.leccion') || 'Lección'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={inputClass}
                    value={leccion_id ?? ""}
                    onChange={(e) => setLeccionId(e.target.value ? Number(e.target.value) : null)}
                    required
                    disabled={!!defaultLeccionId && !pruebaId} // Deshabilitar si viene pre-seleccionada desde modal de lección
                  >
                    <option value="">{t('teacher.pruebas.selectLeccion') || 'Selecciona una lección'}</option>
                    {lecciones.map((l) => (
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
                    value={orden}
                    onChange={(e) => setOrden(Number(e.target.value))}
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
                    value={tiempo_limite ?? ""}
                    onChange={(e) => setTiempoLimite(e.target.value ? Number(e.target.value) : null)}
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
                    value={puntaje_minimo}
                    onChange={(e) => setPuntajeMinimo(Number(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={activa}
                      onChange={(e) => setActiva(e.target.checked)}
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
                    onClick={addPregunta}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <Plus size={16} />
                    {t('teacher.pruebas.addPregunta') || 'Agregar Pregunta'}
                  </button>
                </div>

                {preguntas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                    {t('teacher.pruebas.noPreguntas') || 'No hay preguntas. Agrega al menos una.'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {preguntas.map((pregunta, preguntaIndex) => (
                      <div key={preguntaIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-gray-900">
                            {t('teacher.pruebas.pregunta') || 'Pregunta'} {preguntaIndex + 1}
                          </h5>
                          <button
                            type="button"
                            onClick={() => removePregunta(preguntaIndex)}
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
                            onChange={(e) => updatePreguntaField(preguntaIndex, "texto", e.target.value)}
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
                            onChange={(e) => updatePreguntaField(preguntaIndex, "tipo", e.target.value)}
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
                              onClick={() => addRespuesta(preguntaIndex)}
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
                                    updateRespuestaField(preguntaIndex, respuestaIndex, "es_correcta", e.target.checked)
                                  }
                                  className="w-4 h-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  className="flex-1 border border-gray-300 px-3 py-2 rounded focus:ring-2 focus:ring-blue-500 text-black"
                                  value={respuesta.texto}
                                  onChange={(e) =>
                                    updateRespuestaField(preguntaIndex, respuestaIndex, "texto", e.target.value)
                                  }
                                  placeholder={t('teacher.pruebas.respuestaPlaceholder') || 'Texto de la respuesta'}
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRespuesta(preguntaIndex, respuestaIndex)}
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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
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

