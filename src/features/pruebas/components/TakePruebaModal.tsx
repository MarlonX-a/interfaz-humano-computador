import React from "react";
import { useTranslation } from 'react-i18next';
import { X, Clock, CheckCircle, XCircle, Trophy } from "lucide-react";
import toast from "react-hot-toast";
import { useTakePrueba, formatTime } from "@/features/pruebas/hooks/useTakePrueba";

interface TakePruebaModalProps {
  open: boolean;
  onClose: () => void;
  pruebaId: number;
  leccionId: number;
  seccionId?: number;
}

export default function TakePruebaModal({
  open,
  onClose,
  pruebaId,
  leccionId,
  seccionId,
}: TakePruebaModalProps) {
  const { t } = useTranslation();
  const hook = useTakePrueba({ open, pruebaId, leccionId, seccionId, onClose });

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
            {hook.submitted ? "📊 " : "📝 "}
            {hook.submitted 
              ? t('teacher.pruebas.results') || 'Resultados de la Prueba'
              : hook.prueba?.titulo || t('teacher.pruebas.takingPrueba') || 'Tomando Prueba'}
          </h3>
          {hook.timeRemaining !== null && !hook.submitted && (
            <div className="flex items-center gap-2 mt-2 text-blue-100">
              <Clock size={16} />
              <span className="font-mono text-lg">
                {formatTime(hook.timeRemaining)}
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
          {hook.loading ? (
            <div className="text-center py-8 text-gray-500">
              {t('loading') || 'Cargando...'}
            </div>
          ) : hook.submitted && hook.resultado ? (
            /* Resultados */
            <div className="text-center space-y-6">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${hook.resultado.aprobado ? 'bg-green-100' : 'bg-red-100'}`}>
                {hook.resultado.aprobado ? (
                  <CheckCircle size={48} className="text-green-600" />
                ) : (
                  <XCircle size={48} className="text-red-600" />
                )}
              </div>
              
              <div>
                <h4 className={`text-3xl font-bold mb-2 ${hook.resultado.aprobado ? 'text-green-600' : 'text-red-600'}`}>
                  {hook.resultado.aprobado 
                    ? t('teacher.pruebas.approved') || '¡Aprobado!'
                    : t('teacher.pruebas.notApproved') || 'No Aprobado'}
                </h4>
                <div className="flex items-center justify-center gap-2 text-2xl font-semibold text-gray-700">
                  <Trophy size={24} className="text-yellow-500" />
                  <span>{hook.resultado.puntaje}%</span>
                </div>
                <p className="text-gray-600 mt-2">
                  {t('teacher.pruebas.scoreDetails', { 
                    correctas: hook.resultado.puntaje, 
                    total: hook.resultado.total 
                  }) || `${hook.resultado.puntaje} de ${hook.resultado.total} preguntas correctas`}
                </p>
                {hook.prueba?.puntaje_minimo && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('teacher.pruebas.minimumRequired', { min: hook.prueba.puntaje_minimo }) || 
                     `Puntaje mínimo requerido: ${hook.prueba.puntaje_minimo}%`}
                  </p>
                )}
                {hook.resultado.tiempoEmpleado > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('teacher.pruebas.timeSpent', { 
                      minutes: Math.floor(hook.resultado.tiempoEmpleado / 60),
                      seconds: hook.resultado.tiempoEmpleado % 60
                    }) || `Tiempo empleado: ${Math.floor(hook.resultado.tiempoEmpleado / 60)}:${(hook.resultado.tiempoEmpleado % 60).toString().padStart(2, '0')}`}
                  </p>
                )}
              </div>

              {/* Revisión de respuestas */}
              <div className="mt-8 text-left">
                <h5 className="font-semibold text-gray-900 mb-4">
                  {t('teacher.pruebas.review') || 'Revisión de Respuestas'}
                </h5>
                <div className="space-y-4">
                  {hook.prueba?.preguntas.map((pregunta, index) => {
                    const respuestaSeleccionada = hook.respuestas[pregunta.id];
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
          ) : hook.prueba ? (
            /* Preguntas */
            <>
              {hook.prueba.descripcion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">{hook.prueba.descripcion}</p>
                </div>
              )}

              {/* Indicador de progreso y revisión */}
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">{hook.prueba.preguntas.length} {t('teacher.pruebas.questions') || 'preguntas'}</div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{t('teacher.pruebas.progress') || 'Pregunta'} {hook.currentIndex + 1} {t('teacher.pruebas.of') || 'de'} {hook.prueba.preguntas.length}</div>
                  <button onClick={() => hook.setReviewMode(true)} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    {t('teacher.pruebas.review') || 'Revisar'}
                  </button>
                </div>
              </div>

              {/* Mostrar una pregunta a la vez */}
              <div className="space-y-6">
                {(() => {
                  const pregunta = hook.prueba.preguntas && hook.prueba.preguntas[hook.currentIndex] ? hook.prueba.preguntas[hook.currentIndex] : null;
                  if (!pregunta) {
                    return (
                      <div className="text-center py-8 text-gray-600">{t('teacher.pruebas.noQuestionSelected') || 'Pregunta no disponible'}</div>
                    );
                  }
                  return (
                    <div key={pregunta.id} className="border border-gray-300 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">{hook.currentIndex + 1}. {pregunta.texto}</h4>
                      <div className="space-y-2">
                        {pregunta.respuestas.map((respuesta) => {
                          const isSelected = hook.respuestas[pregunta.id] === respuesta.id;
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
                                onChange={() => hook.handleAnswerChange(pregunta.id, respuesta.id)}
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
                  {hook.currentIndex > 0 && (
                    <button onClick={() => hook.setCurrentIndex((i) => Math.max(0, i - 1))} className="px-4 py-2 bg-gray-200 rounded mr-2">
                      {t('teacher.pruebas.previous') || 'Anterior'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hook.currentIndex < hook.prueba.preguntas.length - 1 ? (
                    <button
                      onClick={() => {
                        const pregunta = hook.prueba!.preguntas[hook.currentIndex];
                        if (hook.respuestas[pregunta.id] === undefined) {
                          toast.error(t('teacher.pruebas.answerCurrent') || 'Responde la pregunta antes de continuar');
                          return;
                        }
                        hook.setCurrentIndex((i) => Math.min(hook.prueba!.preguntas.length - 1, i + 1));
                      }}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      {t('teacher.pruebas.next') || 'Siguiente'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => hook.setReviewMode(true)}
                        disabled={!hook.allAnswered()}
                        className={`px-6 py-3 rounded-lg font-medium ${hook.allAnswered() ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}`}
                      >
                        {t('teacher.pruebas.reviewBeforeSubmit') || 'Revisar antes de enviar'}
                      </button>
                      <button
                        onClick={() => hook.handleSubmit(false)}
                        disabled={!hook.allAnswered()}
                        className={`px-6 py-3 rounded-lg font-medium ${hook.allAnswered() ? 'bg-green-600 text-white hover:bg-green-700' : 'hidden'}`}
                      >
                        {t('teacher.pruebas.finish') || 'Finalizar evaluación'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Review panel (small) */}
              {hook.reviewMode && (
                <div className="mt-4 border-t pt-4">
                  <h5 className="font-semibold mb-2">{t('teacher.pruebas.reviewTitle') || 'Revisión de la evaluación'}</h5>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto mb-4">
                    {hook.prueba.preguntas.map((p, idx) => {
                      const answered = hook.respuestas[p.id] !== undefined;
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            hook.setCurrentIndex(idx);
                            hook.setReviewMode(false);
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
                    <button onClick={() => hook.setReviewMode(false)} className="px-4 py-2 bg-gray-200 rounded">{t('teacher.pruebas.cancel') || 'Cancelar'}</button>
                    <button onClick={() => { hook.setReviewMode(false); hook.handleSubmit(false); }} className="px-4 py-2 bg-green-600 text-white rounded">{t('teacher.pruebas.submitConfirm') || 'Enviar ahora'}</button>
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

