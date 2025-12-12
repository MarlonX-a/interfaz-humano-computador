import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getProfile } from '../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listPruebasByLeccion } from '../lib/data/pruebas';
import { listContenidosByTeacher } from '../lib/data/contenidos';
import type { Leccion, Prueba, ContenidoConLecciones } from '../types/db';
import { BookOpenText, Clock, Target, Play, ArrowLeft, Plus } from 'lucide-react';
import TakePruebaModal from '../components/TakePruebaModal';
import EditPruebaModal from '../components/EditPruebaModal';

export default function LessonDetailPage() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leccion, setLeccion] = useState<Leccion | null>(null);
  const [contenidos, setContenidos] = useState<ContenidoConLecciones[]>([]);
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [loading, setLoading] = useState(false);
  const [takingPruebaId, setTakingPruebaId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingPruebaId, setEditingPruebaId] = useState<number | null>(null);

  useEffect(() => {
    const ensure = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          navigate('/login');
          return;
        }
        const { data: profile } = await getProfile(session.user.id);
        const role = profile?.role || session.user.user_metadata?.role || null;
        if (!['student', 'teacher', 'admin'].includes(role)) {
          navigate('/login');
          return;
        }
        setUserRole(role);
        setUserId(session.user.id);
        if (lessonId) {
          await loadLesson(Number(lessonId));
        }
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('lessons.loadError') || 'Error al cargar lección');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [lessonId, navigate, t]);

  const loadLesson = async (id: number) => {
    setLoading(true);
    try {
      // Cargar lección
      const { data: leccionData, error: leccionError } = await supabase
        .from('leccion')
        .select('*')
        .eq('id', id)
        .single();

      if (leccionError) throw leccionError;
      setLeccion(leccionData);

      // Cargar contenidos asociados a esta lección
      const { data: contenidoLecciones, error: clError } = await supabase
        .from('contenido_leccion')
        .select('contenido_id')
        .eq('leccion_id', id);

      if (clError) throw clError;

      const contenidoIds = (contenidoLecciones || []).map((cl) => cl.contenido_id);
      if (contenidoIds.length > 0) {
        const { data: contenidosData, error: contenidosError } = await supabase
          .from('contenido')
          .select('*')
          .in('id', contenidoIds)
          .order('orden', { ascending: true, nullsFirst: false });

        if (contenidosError) throw contenidosError;

        // Cargar lecciones para cada contenido
        const contenidosConLecciones = await Promise.all(
          (contenidosData || []).map(async (c) => {
            const { data: clData } = await supabase
              .from('contenido_leccion')
              .select('leccion_id, orden')
              .eq('contenido_id', c.id)
              .order('orden', { ascending: true });

            const leccionIds = (clData || []).map((cl) => cl.leccion_id);
            let lecciones: any[] = [];
            if (leccionIds.length > 0) {
              const { data: leccionesData } = await supabase
                .from('leccion')
                .select('id, titulo, descripcion, nivel, thumbnail_url, created_by')
                .in('id', leccionIds);
              lecciones = leccionesData || [];
            }

            return { ...c, lecciones };
          })
        );
        setContenidos(contenidosConLecciones as ContenidoConLecciones[]);
      }

      // Cargar pruebas activas de esta lección
      const pruebasData = await listPruebasByLeccion(id);
      setPruebas(pruebasData.filter((p) => p.activa));
    } catch (error: any) {
      console.error('Error loading lesson:', error);
      toast.error(error?.message || t('lessons.loadError') || 'Error al cargar lección');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading') || 'Cargando...'}</p>
        </div>
      </div>
    );
  }

  if (!leccion) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">{t('lessons.notFound') || 'Lección no encontrada'}</p>
          <button
            onClick={() => navigate('/lessons')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('lessons.back') || 'Volver a lecciones'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/lessons')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          <span>{t('lessons.back') || 'Volver a lecciones'}</span>
        </button>
        <div className="flex items-start gap-4">
          {leccion.thumbnail_url && (
            <img
              src={leccion.thumbnail_url}
              alt={leccion.titulo}
              className="w-32 h-32 object-cover rounded-lg"
            />
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{leccion.titulo}</h1>
            {leccion.descripcion && (
              <p className="text-gray-600 mb-2">{leccion.descripcion}</p>
            )}
            {leccion.nivel && (
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {leccion.nivel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenidos */}
      {contenidos.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            {t('lesson.contents') || 'Contenidos'}
          </h2>
          <div className="space-y-4">
            {contenidos.map((contenido) => (
              <div
                key={contenido.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{contenido.titulo}</h3>
                {contenido.texto_html && (
                  <div
                    className="prose max-w-none mb-4"
                    dangerouslySetInnerHTML={{ __html: contenido.texto_html }}
                  />
                )}
                {contenido.lecciones && contenido.lecciones.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {t('lesson.relatedLessons') || 'Lecciones relacionadas'}:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contenido.lecciones.map((l) => (
                        <span
                          key={l.id}
                          className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {l.titulo}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pruebas */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {t('lesson.pruebas') || 'Pruebas'}
          </h2>
          {(userRole === 'teacher' || userRole === 'admin') && lessonId && (
            <button
              onClick={() => setEditingPruebaId(0)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <Plus size={18} />
              <span>{t('teacher.pruebas.newPrueba') || 'Nueva Prueba'}</span>
            </button>
          )}
        </div>
        {pruebas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pruebas.map((prueba) => (
              <div
                key={prueba.id}
                className="bg-white rounded-lg shadow p-6 border border-gray-200"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{prueba.titulo}</h3>
                {prueba.descripcion && (
                  <p className="text-sm text-gray-600 mb-4">{prueba.descripcion}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  {prueba.tiempo_limite && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      <Clock size={12} />
                      <span>{prueba.tiempo_limite} min</span>
                    </div>
                  )}
                  {prueba.puntaje_minimo && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      <Target size={12} />
                      <span>{prueba.puntaje_minimo}% min</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setTakingPruebaId(prueba.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play size={18} />
                  <span>{t('lesson.takePrueba') || 'Tomar Prueba'}</span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center border border-gray-200">
            <BookOpenText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {t('lesson.noPruebas') || 'Esta lección aún no tiene pruebas'}
            </p>
            {(userRole === 'teacher' || userRole === 'admin') && lessonId && (
              <button
                onClick={() => setEditingPruebaId(0)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={18} />
                <span>{t('teacher.pruebas.createFirst') || 'Crear primera prueba'}</span>
              </button>
            )}
          </div>
        )}
      </section>

      {contenidos.length === 0 && pruebas.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BookOpenText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-4">
            {t('lesson.noContent') || 'Esta lección aún no tiene contenidos ni pruebas'}
          </p>
          {(userRole === 'teacher' || userRole === 'admin') && lessonId && (
            <button
              onClick={() => setEditingPruebaId(0)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>{t('teacher.pruebas.createFirst') || 'Crear primera prueba'}</span>
            </button>
          )}
        </div>
      )}

      {/* Modal de tomar prueba */}
      {takingPruebaId && lessonId && (
        <TakePruebaModal
          open={!!takingPruebaId}
          onClose={() => setTakingPruebaId(null)}
          pruebaId={takingPruebaId}
          leccionId={Number(lessonId)}
        />
      )}

      {/* Modal de editar/crear prueba */}
      {editingPruebaId !== null && userId && lessonId && (
        <EditPruebaModal
          open={editingPruebaId !== null}
          onClose={() => setEditingPruebaId(null)}
          pruebaId={editingPruebaId === 0 ? null : editingPruebaId}
          onUpdated={async () => {
            // Recargar pruebas
            const pruebasData = await listPruebasByLeccion(Number(lessonId));
            setPruebas(pruebasData.filter((p) => p.activa));
            setEditingPruebaId(null);
          }}
          userId={userId}
          defaultLeccionId={Number(lessonId)}
        />
      )}
    </main>
  );
}

