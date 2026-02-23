import { useEffect, useState } from 'react';
import { supabase } from '@/shared/lib/supabaseClient';
import { getProfile } from '@/shared/services/profiles';
import { getProgresosByUsuario, getContentProgressForUser } from '@/shared/services/progresos';
import type { ContentProgress } from '@/shared/services/progresos';
import type { Progreso, ProgresoConLeccion, Leccion } from '@/shared/types';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, BookOpen, Award } from 'lucide-react';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [progresos, setProgresos] = useState<ProgresoConLeccion[]>([]);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);
  const [contentProgress, setContentProgress] = useState<ContentProgress[]>([]);

  useEffect(() => {
    let channel: any = null;
    const ensure = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { navigate('/login'); return; }
        const profRes = await getProfile(session.user.id);
        setProfile(profRes.data || null);

        const arr = await getProgresosByUsuario(session.user.id);
        setProgresos(arr || []);

        // total lessons count
        const { data: lessonsData } = await supabase.from('leccion').select('id', { count: 'exact' });
        setTotalLessons((lessonsData || []).length);

        // content-level progress
        const cp = await getContentProgressForUser(session.user.id);
        setContentProgress(cp || []);

        // subscribe to realtime updates for progreso for this user
        channel = (supabase as any).channel(`progreso:usuario_id=eq.${session.user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'progreso', filter: `usuario_id=eq.${session.user.id}` }, (payload: any) => {
            try {
              if (payload?.record) {
                setProgresos((prev) => {
                  const copy = [...prev.filter(p => p.leccion_id !== payload.record.leccion_id)];
                  // try to fetch leccion data if not in payload
                  const rec = payload.record as Progreso & { leccion?: Leccion };
                  if (rec.leccion) {
                    copy.push(rec as ProgresoConLeccion);
                  } else {
                    // fetch leccion quick
                    (async () => {
                      try {
                        const { data: ldata } = await supabase.from('leccion').select('id,titulo,nivel,thumbnail_url,descripcion').eq('id', payload.record.leccion_id).single();
                        copy.push({ ...(payload.record as Progreso), leccion: ldata } as ProgresoConLeccion);
                        setProgresos(copy);
                      } catch (e) {
                        // ignore
                      }
                    })();
                  }
                  return copy;
                });
              } else if (payload?.old && payload.eventType === 'DELETE') {
                setProgresos((prev) => prev.filter(p => p.leccion_id !== payload.old.leccion_id));
              }
            } catch (e) {
              console.error('Realtime progreso handler', e);
            }
          })
          .subscribe();
      } catch (err) {
        console.error('Error loading dashboard', err);
        toast.error(t('dashboard.loadError') || 'Error al cargar dashboard');
      } finally {
        setLoading(false);
      }
    };
    ensure();

    return () => {
      try { if (channel) (supabase as any).removeChannel(channel); } catch (e) {}
    };
  }, [navigate, t]);

  const completedCount = progresos.filter(p => !!p.completado).length;
  const pendingCount = (totalLessons ?? 0) - completedCount;
  const totalScore = progresos.reduce((acc, p) => acc + (p.puntaje ?? 0), 0);
  const avgScore = progresos.length > 0 ? Math.round(totalScore / progresos.length) : 0;
  const percentCompleted = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

  const lastVisited = progresos.reduce((best: ProgresoConLeccion | null, curr) => {
    if (!curr.fecha_ultimo_acceso) return best;
    if (!best) return curr;
    return new Date(curr.fecha_ultimo_acceso) > new Date(best.fecha_ultimo_acceso || '') ? curr : best;
  }, null as ProgresoConLeccion | null);

  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('student.dashboard.title', { defaultValue: 'Mi Dashboard' })}</h1>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">{t('loading', { defaultValue: 'Cargando...' })}</div>
      ) : (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-2 bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{profile?.display_name || profile?.first_name || 'Estudiante'}</h2>
                <p className="text-sm text-gray-500">{t('student.dashboard.level', { defaultValue: 'Nivel actual' })}: {profile?.level || 'N/A'}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">{t('student.dashboard.totalScore', { defaultValue: 'Puntaje total' })}</div>
                <div className="text-2xl font-bold">{avgScore}%</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('student.dashboard.completedLessons', { defaultValue: 'Lecciones completadas' })}</div>
                <div className="text-xl font-semibold">{completedCount}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('student.dashboard.pendingLessons', { defaultValue: 'Lecciones pendientes' })}</div>
                <div className="text-xl font-semibold">{Math.max(0, pendingCount)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <div className="text-sm text-gray-600">{t('student.dashboard.courseCompletion', { defaultValue: 'Progreso del curso' })}</div>
                <div className="text-xl font-semibold">{percentCompleted}%</div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">{t('student.dashboard.history', { defaultValue: 'Historial' })}</h3>
              {lastVisited ? (
                <div className="bg-white border p-4 rounded">
                  <div className="text-sm text-gray-500">{t('student.dashboard.lastLesson', { defaultValue: 'Última lección vista' })}</div>
                  <div className="font-medium">{lastVisited.leccion?.titulo || '—'}</div>
                  <div className="text-sm text-gray-500 mt-1">{t('student.dashboard.lastAccess', { defaultValue: 'Último acceso' })}: {new Date(lastVisited.fecha_ultimo_acceso || '').toLocaleString()}</div>
                  <div className="text-sm text-gray-500 mt-1">{t('student.dashboard.lastScore', { defaultValue: 'Último puntaje' })}: {lastVisited.puntaje ?? '—'}</div>
                  <div className="mt-3">
                    <button onClick={() => navigate(`/lesson/${lastVisited.leccion?.id}`)} className="px-3 py-2 bg-blue-600 text-white rounded">
                      {t('student.dashboard.continue', { defaultValue: 'Continuar aprendiendo' })}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">{t('student.dashboard.noHistory', { defaultValue: 'Aún no has iniciado ninguna lección' })}</div>
              )}
            </div>
          </div>

          <aside className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-semibold mb-4">{t('student.dashboard.quickStats', { defaultValue: 'Resumen rápido' })}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{t('student.dashboard.totalLessons', { defaultValue: 'Total lecciones' })}</div>
                <div className="font-medium">{totalLessons ?? '-'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{t('student.dashboard.averageScore', { defaultValue: 'Promedio de puntaje' })}</div>
                <div className="font-medium">{avgScore}%</div>
              </div>
              {contentProgress.length > 0 && (
                <>
                  <hr className="my-2" />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">{t('student.dashboard.totalContents', { defaultValue: 'Total contenidos' })}</div>
                    <div className="font-medium">{contentProgress.length}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">{t('student.dashboard.contentsCompleted', { defaultValue: 'Contenidos completados' })}</div>
                    <div className="font-medium">{contentProgress.filter(c => c.completado).length}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">{t('student.dashboard.contentsApproved', { defaultValue: 'Contenidos aprobados' })}</div>
                    <div className="font-medium text-green-600">{contentProgress.filter(c => c.aprobado).length}</div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>

        {/* Content Progress Section */}
        {contentProgress.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">{t('student.dashboard.contentProgress', { defaultValue: 'Progreso de Contenidos' })}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contentProgress.map((cp) => {
                const pct = cp.lecciones_total > 0 ? Math.round((cp.lecciones_completadas / cp.lecciones_total) * 100) : 0;
                return (
                  <div key={cp.contenido_id} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen size={18} className="text-blue-500 flex-shrink-0" />
                        <h4 className="font-medium text-gray-900 line-clamp-2">{cp.titulo}</h4>
                      </div>
                      {cp.completado && (
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                          cp.aprobado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {cp.aprobado ? <Award size={14} /> : <XCircle size={14} />}
                          {cp.aprobado
                            ? t('student.dashboard.approved', { defaultValue: 'Aprobado' })
                            : t('student.dashboard.failed', { defaultValue: 'Reprobado' })}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{cp.lecciones_completadas}/{cp.lecciones_total} {t('student.dashboard.lessonsLabel', { defaultValue: 'lecciones' })}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cp.completado
                              ? cp.aprobado ? 'bg-green-500' : 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Score */}
                    {cp.completado && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('student.dashboard.averageScoreLabel', { defaultValue: 'Puntaje promedio' })}</span>
                        <span className={`font-semibold ${cp.promedio_puntaje >= 70 ? 'text-green-600' : cp.promedio_puntaje >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {cp.promedio_puntaje}%
                        </span>
                      </div>
                    )}

                    {!cp.completado && (
                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        {t('student.dashboard.inProgress', { defaultValue: 'En progreso' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white rounded-lg shadow p-6 text-center">
            <BookOpen size={40} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {t('student.dashboard.noFollowedContent', { defaultValue: 'No sigues ningún contenido aún' })}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('student.dashboard.noFollowedContentDesc', { defaultValue: 'Explora los contenidos disponibles y sigue los que te interesen para ver tu progreso aquí.' })}
            </p>
            <button
              onClick={() => navigate('/contents')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('student.dashboard.browseContents', { defaultValue: 'Explorar contenidos' })}
            </button>
          </div>
        )}
        </>
      )}
    </main>
  );
}
