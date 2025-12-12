import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { X, Clock, CheckCircle, XCircle, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { getPruebaCompleta } from "../lib/data/pruebas";
import { createResultadoPrueba } from "../lib/data/resultados";
import { supabase } from "../lib/supabaseClient";
import type { PruebaCompleta } from "../types/db";

interface TakePruebaModalProps {
  open: boolean;
  onClose: () => void;
  pruebaId: number;
  leccionId: number;
}

// Format seconds into H:MM:SS or MM:SS
const formatTime = (seconds: number | null) => {
  if (seconds === null || isNaN(seconds as any)) return "0:00";
  let s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  s = s % 3600;
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
};

export default function TakePruebaModal({
  open,
  onClose,
  pruebaId,
  leccionId,
}: TakePruebaModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [prueba, setPrueba] = useState<PruebaCompleta | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultado, setResultado] = useState<{
    puntaje: number;
    total: number;
    aprobado: boolean;
    tiempoEmpleado: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open && pruebaId) {
      loadPrueba();
    }
  }, [open, pruebaId]);

  useEffect(() => {
    if (open && prueba && prueba.tiempo_limite && startedAt && !submitted) {
      // Iniciar contador
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        const remaining = (prueba.tiempo_limite! * 60) - elapsed;
        
        if (remaining <= 0) {
          handleSubmit(true); // Auto-submit cuando se acaba el tiempo
          return;
        }
        
        setTimeRemaining(remaining);
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [open, prueba, startedAt, submitted]);

  const loadPrueba = async () => {
    setLoading(true);
    try {
      const data = await getPruebaCompleta(pruebaId);
      if (!data.activa) {
        toast.error(t('teacher.pruebas.notActive') || 'Esta prueba no está activa');
        onClose();
        return;
      }
      // Si no tiene preguntas, no podemos mostrar la prueba
      if (!data.preguntas || data.preguntas.length === 0) {
        toast.error(t('teacher.pruebas.noQuestions') || 'Esta prueba no tiene preguntas');
        onClose();
        return;
      }
      setPrueba(data);
      setStartedAt(new Date());
      setRespuestas({});
      setSubmitted(false);
      setResultado(null);
      if (data.tiempo_limite) {
        setTimeRemaining(data.tiempo_limite * 60);
      }
    } catch (error: any) {
      console.error("Error loading prueba:", error);
      toast.error(error?.message || t('teacher.pruebas.loadError') || 'Error al cargar prueba');
      onClose();
    } finally {
      setLoading(false);
    }
  };
  // Keyboard navigation: ArrowLeft -> previous, ArrowRight -> next
  useEffect(() => {
    if (!open || submitted) return;

    const handler = (e: KeyboardEvent) => {
      if (reviewMode) return; // don't interfere while reviewing
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => (prueba ? Math.min(prueba.preguntas.length - 1, i + 1) : i + 1));
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, submitted, reviewMode, prueba]);

  const calculateScore = () => {
    if (!prueba) return { correctas: 0, total: 0, porcentaje: 0 };

    let correctas = 0;
    const total = prueba.preguntas.length;

    prueba.preguntas.forEach((pregunta) => {
      const respuestaSeleccionada = respuestas[pregunta.id];
      if (respuestaSeleccionada) {
        const respuesta = pregunta.respuestas.find((r) => r.id === respuestaSeleccionada);
        if (respuesta?.es_correcta) {
          correctas++;
        }
      }
    });

    const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;
    return { correctas, total, porcentaje };
  };

  const handleAnswerChange = (preguntaId: number, respuestaId: number) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: respuestaId }));
  };

  const allAnswered = () => {
    if (!prueba) return false;
    return prueba.preguntas.every((p) => respuestas[p.id] !== undefined && respuestas[p.id] !== null);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (submitted) return;

    if (!autoSubmit) {
      if (!prueba) return;
      if (!allAnswered()) {
        toast.error(t('teacher.pruebas.mustAnswerAll') || 'Debes responder todas las preguntas antes de enviar');
        return;
      }
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setSubmitted(true);
    const score = calculateScore();
    const tiempoEmpleado = startedAt ? Math.floor((Date.now() - startedAt.getTime()) / 1000) : 0;
    const aprobado = score.porcentaje >= (prueba?.puntaje_minimo || 60);

    setResultado({
      puntaje: score.porcentaje,
      total: score.total,
      aprobado,
      tiempoEmpleado,
    });

    // Guardar resultado
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const usuarioId = (sessionData as any)?.session?.user?.id;

      if (usuarioId) {
        await createResultadoPrueba({
          prueba_id: pruebaId,
          usuario_id: usuarioId,
          puntaje_obtenido: score.porcentaje,
          puntaje_total: score.total,
          aprobado,
          tiempo_empleado: tiempoEmpleado,
          respuestas: respuestas,
          started_at: startedAt?.toISOString() || null,
          completed_at: new Date().toISOString(),
        });

        // Actualizar progreso de la lección
        const { data: progresoData } = await supabase
          .from('progreso')
          .select('id, puntaje')
          .eq('usuario_id', usuarioId)
          .eq('leccion_id', leccionId)
          .maybeSingle();

        if (progresoData) {
          // Actualizar progreso existente
          await supabase
            .from('progreso')
            .update({
              puntaje: Math.max(progresoData.puntaje || 0, score.porcentaje),
              completado: aprobado || progresoData.puntaje >= (prueba?.puntaje_minimo || 60),
            })
            .eq('id', progresoData.id);
        } else {
          // Crear nuevo progreso
          await supabase
            .from('progreso')
            .insert({
              usuario_id: usuarioId,
              leccion_id: leccionId,
              puntaje: score.porcentaje,
              completado: aprobado,
            });
        }
      }
    } catch (error: any) {
      console.error("Error saving resultado:", error);
      toast.error(error?.message || t('teacher.pruebas.saveResultError') || 'Error al guardar resultado');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setPrueba(null);
      setRespuestas({});
      setStartedAt(null);
      setTimeRemaining(null);
      setSubmitted(false);
      setResultado(null);
    }
  }, [open]);

  if (!open) return null;

  const inputClass = "w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="mx-4 w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">
            {submitted ? "📊 " : "📝 "}
            {submitted 
              ? t('teacher.pruebas.results') || 'Resultados de la Prueba'
              : prueba?.titulo || t('teacher.pruebas.takingPrueba') || 'Tomando Prueba'}
          </h3>
          {timeRemaining !== null && !submitted && (
            <div className="flex items-center gap-2 mt-2 text-blue-100">
              <Clock size={16} />
              <span className="font-mono text-lg">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
          <button
            aria-label={t('close') || 'Cerrar'}
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {t('loading') || 'Cargando...'}
            </div>
          ) : submitted && resultado ? (
            /* Resultados */
            <div className="text-center space-y-6">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${resultado.aprobado ? 'bg-green-100' : 'bg-red-100'}`}>
                {resultado.aprobado ? (
                  <CheckCircle size={48} className="text-green-600" />
                ) : (
                  <XCircle size={48} className="text-red-600" />
                )}
              </div>
              
              <div>
                <h4 className={`text-3xl font-bold mb-2 ${resultado.aprobado ? 'text-green-600' : 'text-red-600'}`}>
                  {resultado.aprobado 
                    ? t('teacher.pruebas.approved') || '¡Aprobado!'
                    : t('teacher.pruebas.notApproved') || 'No Aprobado'}
                </h4>
                <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-gray-700">
                  <Trophy size={24} className="text-yellow-500" />
                  <span>{resultado.puntaje}%</span>
                </div>
                <p className="text-gray-600 mt-2">
                  {t('teacher.pruebas.scoreDetails', { 
                    correctas: resultado.puntaje, 
                    total: resultado.total 
                  }) || `${resultado.puntaje} de ${resultado.total} preguntas correctas`}
                </p>
                {prueba?.puntaje_minimo && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('teacher.pruebas.minimumRequired', { min: prueba.puntaje_minimo }) || 
                     `Puntaje mínimo requerido: ${prueba.puntaje_minimo}%`}
                  </p>
                )}
                {resultado.tiempoEmpleado > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('teacher.pruebas.timeSpent', { 
                      minutes: Math.floor(resultado.tiempoEmpleado / 60),
                      seconds: resultado.tiempoEmpleado % 60
                    }) || `Tiempo empleado: ${Math.floor(resultado.tiempoEmpleado / 60)}:${(resultado.tiempoEmpleado % 60).toString().padStart(2, '0')}`}
                  </p>
                )}
              </div>

              {/* Revisión de respuestas */}
              <div className="mt-8 text-left">
                <h5 className="font-semibold text-gray-900 mb-4">
                  {t('teacher.pruebas.review') || 'Revisión de Respuestas'}
                </h5>
                <div className="space-y-4">
                  {prueba?.preguntas.map((pregunta, index) => {
                    const respuestaSeleccionada = respuestas[pregunta.id];
                    const respuesta = pregunta.respuestas.find((r) => r.id === respuestaSeleccionada);
                    const esCorrecta = respuesta?.es_correcta || false;
                    const respuestaCorrecta = pregunta.respuestas.find((r) => r.es_correcta);

                    return (
                      <div
                        key={pregunta.id}
                        className={`border rounded-lg p-4 ${
                          esCorrecta ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          {esCorrecta ? (
                            <CheckCircle size={20} className="text-green-600 mt-0.5" />
                          ) : (
                            <XCircle size={20} className="text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {index + 1}. {pregunta.texto}
                            </p>
                            <div className="mt-2 space-y-1">
                              <p className={`text-sm ${esCorrecta ? 'text-green-700' : 'text-red-700'}`}>
                                {t('teacher.pruebas.yourAnswer') || 'Tu respuesta'}: {respuesta?.texto || t('teacher.pruebas.noAnswer') || 'Sin respuesta'}
                              </p>
                              {!esCorrecta && respuestaCorrecta && (
                                <p className="text-sm text-green-700">
                                  {t('teacher.pruebas.correctAnswer') || 'Respuesta correcta'}: {respuestaCorrecta.texto}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : prueba ? (
            /* Preguntas */
            <>
              {prueba.descripcion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">{prueba.descripcion}</p>
                </div>
              )}

              {/* Indicador de progreso y revisión */}
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{prueba.preguntas.length} {t('teacher.pruebas.questions') || 'preguntas'}</div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{t('teacher.pruebas.progress') || 'Pregunta'} {currentIndex + 1} {t('teacher.pruebas.of') || 'de'} {prueba.preguntas.length}</div>
                  <button onClick={() => setReviewMode(true)} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    {t('teacher.pruebas.review') || 'Revisar'}
                  </button>
                </div>
              </div>

              {/* Mostrar una pregunta a la vez */}
              <div className="space-y-6">
                {(() => {
                  const pregunta = prueba.preguntas && prueba.preguntas[currentIndex] ? prueba.preguntas[currentIndex] : null;
                  if (!pregunta) {
                    return (
                      <div className="text-center py-8 text-gray-600">{t('teacher.pruebas.noQuestionSelected') || 'Pregunta no disponible'}</div>
                    );
                  }
                  return (
                    <div key={pregunta.id} className="border border-gray-300 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{currentIndex + 1}. {pregunta.texto}</h4>
                      <div className="space-y-2">
                        {pregunta.respuestas.map((respuesta) => {
                          const isSelected = respuestas[pregunta.id] === respuesta.id;
                          return (
                            <label
                              key={respuesta.id}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`pregunta-${pregunta.id}`}
                                checked={isSelected}
                                onChange={() => handleAnswerChange(pregunta.id, respuesta.id)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <span className="flex-1 text-gray-900">{respuesta.texto}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div>
                  {currentIndex > 0 && (
                    <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} className="px-4 py-2 bg-gray-200 rounded mr-2">
                      {t('teacher.pruebas.previous') || 'Anterior'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {currentIndex < prueba.preguntas.length - 1 ? (
                    <button
                      onClick={() => {
                        const pregunta = prueba.preguntas[currentIndex];
                        if (respuestas[pregunta.id] === undefined) {
                          toast.error(t('teacher.pruebas.answerCurrent') || 'Responde la pregunta antes de continuar');
                          return;
                        }
                        setCurrentIndex((i) => Math.min(prueba.preguntas.length - 1, i + 1));
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      {t('teacher.pruebas.next') || 'Siguiente'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setReviewMode(true)}
                        disabled={!allAnswered()}
                        className={`px-6 py-3 rounded-lg font-medium ${allAnswered() ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                      >
                        {t('teacher.pruebas.reviewBeforeSubmit') || 'Revisar antes de enviar'}
                      </button>
                      <button
                        onClick={() => handleSubmit(false)}
                        disabled={!allAnswered()}
                        className={`px-6 py-3 rounded-lg font-medium ${allAnswered() ? 'bg-green-600 text-white hover:bg-green-700' : 'hidden'}`}
                      >
                        {t('teacher.pruebas.finish') || 'Finalizar evaluación'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Review panel (small) */}
              {reviewMode && (
                <div className="mt-4 border-t pt-4">
                  <h5 className="font-semibold mb-2">{t('teacher.pruebas.reviewTitle') || 'Revisión de la evaluación'}</h5>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto mb-4">
                    {prueba.preguntas.map((p, idx) => {
                      const answered = respuestas[p.id] !== undefined;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            setCurrentIndex(idx);
                            setReviewMode(false);
                          }}
                          className={`p-2 rounded border text-left text-sm ${answered ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                        >
                          <div className="font-medium">{idx + 1}. {p.texto.slice(0, 60)}</div>
                          <div className="text-xs mt-1">{answered ? (t('teacher.pruebas.answered') || 'Respondida') : (t('teacher.pruebas.unanswered') || 'Sin responder')}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setReviewMode(false)} className="px-4 py-2 bg-gray-200 rounded">{t('teacher.pruebas.cancel') || 'Cancelar'}</button>
                    <button onClick={() => { setReviewMode(false); handleSubmit(false); }} className="px-4 py-2 bg-green-600 text-white rounded">{t('teacher.pruebas.submitConfirm') || 'Enviar ahora'}</button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

