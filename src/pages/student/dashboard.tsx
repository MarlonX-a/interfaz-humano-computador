import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { getProgresosByUsuario } from '../../lib/data/progresos';
import type { Progreso, ProgresoConLeccion, Leccion } from '../../types/db';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [progresos, setProgresos] = useState<ProgresoConLeccion[]>([]);
  const [totalLessons, setTotalLessons] = useState<number | null>(null);

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
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
