import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Mail, Calendar, CheckCircle, XCircle, Clock, BookOpen, Award } from 'lucide-react';
import type { StudentDetail } from '@/features/performance/services/performance';
import PerformanceChart from './PerformanceChart';

interface StudentPerformanceDetailProps {
  student: StudentDetail | null;
  open: boolean;
  onClose: () => void;
  loading?: boolean;
}

export default function StudentPerformanceDetail({
  student,
  open,
  onClose,
  loading,
}: StudentPerformanceDetailProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {loading
              ? t('teacher.performance.loading') || 'Cargando...'
              : student
              ? `${t('teacher.performance.studentPerformance') || 'Desempeño'}: ${student.display_name || student.email || student.usuario_id}`
              : t('teacher.performance.studentPerformance') || 'Desempeño del Estudiante'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label={t('close') || 'Cerrar'}
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">{t('loading') || 'Cargando...'}</p>
            </div>
          ) : !student ? (
            <div className="text-center py-12">
              <p className="text-gray-600">
                {t('teacher.performance.noData') || 'No hay datos disponibles'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Información General */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('teacher.performance.generalInfo') || 'Información General'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('teacher.performance.email') || 'Email'}
                      </p>
                      <p className="text-sm font-medium text-gray-900">{student.email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('teacher.performance.lastActivity') || 'Última Actividad'}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {student.pruebas.length > 0
                          ? formatDate(
                              student.pruebas
                                .map((p) => p.ultimo_intento)
                                .filter(Boolean)
                                .sort()
                                .reverse()[0] || null
                            )
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contenidos que sigue */}
              {student.contenidos_seguidos_nombres && student.contenidos_seguidos_nombres.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('teacher.performance.followedContents') || 'Contenidos que sigue'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {student.contenidos_seguidos_nombres.map((nombre, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        <BookOpen size={14} />
                        {nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial de Pruebas */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('teacher.performance.testHistory') || 'Historial de Pruebas'}
                </h3>
                {student.pruebas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('teacher.performance.noTests') || 'No hay pruebas registradas'}
                  </p>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.test') || 'Prueba'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.attempts') || 'Intentos'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.bestScore') || 'Mejor Puntaje'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.average') || 'Promedio'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.status') || 'Estado'}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            {t('teacher.performance.lastAttempt') || 'Último Intento'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {student.pruebas.map((prueba) => (
                          <tr key={prueba.prueba_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {prueba.titulo}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{prueba.intentos}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`font-medium ${
                                  (prueba.mejor_puntaje ?? 0) >= 70
                                    ? 'text-green-600'
                                    : (prueba.mejor_puntaje ?? 0) >= 50
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                                }`}
                              >
                                {(prueba.mejor_puntaje ?? 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {(prueba.promedio ?? 0).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {prueba.aprobado ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle size={16} />
                                  {t('teacher.performance.approved') || 'Aprobado'}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle size={16} />
                                  {t('teacher.performance.failed') || 'Reprobado'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {formatDate(prueba.ultimo_intento)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Progreso en Lecciones */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('teacher.performance.lessonProgress') || 'Progreso en Lecciones'}
                </h3>
                {student.lecciones.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('teacher.performance.noLessons') || 'No hay lecciones registradas'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.lecciones.map((leccion) => (
                      <div
                        key={leccion.leccion_id}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{leccion.titulo}</h4>
                          {leccion.completada ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle size={16} />
                              {t('teacher.performance.completed') || 'Completada'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-500 text-sm">
                              <Clock size={16} />
                              {t('teacher.performance.inProgress') || 'En Progreso'}
                            </span>
                          )}
                        </div>
                        {leccion.puntaje !== null && (
                          <p className="text-sm text-gray-600">
                            {t('teacher.performance.score') || 'Puntaje'}: {leccion.puntaje}%
                          </p>
                        )}
                        {leccion.ultimo_acceso && (
                          <p className="text-xs text-gray-500 mt-1">
                            {t('teacher.performance.lastAccess') || 'Último acceso'}:{' '}
                            {formatDate(leccion.ultimo_acceso)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gráfico de Evolución */}
              {student.evolucion_puntajes.length > 0 && (
                <div>
                  <PerformanceChart type="evolution" data={student.evolucion_puntajes} />
                </div>
              )}

              {/* Progreso en Contenidos */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('teacher.performance.contentProgress') || 'Progreso en Contenidos'}
                </h3>
                {(!student.contenidos || student.contenidos.length === 0) ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('teacher.performance.noContents') || 'No hay contenidos registrados'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {student.contenidos.map((contenido) => {
                      const pct = contenido.lecciones_total > 0
                        ? Math.round((contenido.lecciones_completadas / contenido.lecciones_total) * 100)
                        : 0;
                      return (
                        <div
                          key={contenido.contenido_id}
                          className="bg-white rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <BookOpen size={18} className="text-blue-500 flex-shrink-0" />
                              <h4 className="font-medium text-gray-900">{contenido.titulo}</h4>
                            </div>
                            {contenido.completado ? (
                              contenido.aprobado ? (
                                <span className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                                  <Award size={16} />
                                  {t('teacher.performance.approved') || 'Aprobado'}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600 text-sm font-semibold">
                                  <XCircle size={16} />
                                  {t('teacher.performance.failed') || 'Reprobado'}
                                </span>
                              )
                            ) : (
                              <span className="flex items-center gap-1 text-gray-500 text-sm">
                                <Clock size={16} />
                                {t('teacher.performance.inProgress') || 'En Progreso'}
                              </span>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{contenido.lecciones_completadas}/{contenido.lecciones_total} {t('teacher.performance.lessonsLabel') || 'lecciones'}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  contenido.completado
                                    ? contenido.aprobado ? 'bg-green-500' : 'bg-red-500'
                                    : 'bg-blue-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>

                          {contenido.completado && (
                            <p className="text-sm text-gray-600 mt-2">
                              {t('teacher.performance.averageScore') || 'Promedio'}:{' '}
                              <span className={`font-semibold ${contenido.promedio_puntaje >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                {contenido.promedio_puntaje}%
                              </span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

