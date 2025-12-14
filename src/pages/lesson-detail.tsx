import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getProfile } from '../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listPruebasByLeccion } from '../lib/data/pruebas';
import { getProgresoByUsuarioAndLeccion, upsertProgresoLastAccess } from '../lib/data/progresos';
import { listModelosByLeccion } from '../lib/data/modelos';
import { listSeccionesCompletasByLeccion } from '../lib/data/leccionSecciones';
import { marcarSeccionCompletada, getEstadisticasProgresoLeccion } from '../lib/data/progresoSecciones';
import { getModeloPrincipalByContenido } from '../lib/data/contenidoModelos';
import { getSiguienteLeccion } from '../lib/data/lecciones';
import { parseId } from '../lib/parseId';
import type { Leccion, Prueba, ContenidoConLecciones, Progreso, ModeloRA, Contenido, ContenidoLeccion, LeccionSeccionCompleta } from '../types/db';
import { BookOpenText, Clock, Target, Play, ArrowLeft, Plus, Lock, CheckCircle, FileText, Box, ClipboardList, ArrowRight, Flag } from 'lucide-react';
import TakePruebaModal from '../components/TakePruebaModal';
import EditPruebaModal from '../components/EditPruebaModal';
import ModelViewerModal from '../components/ModelViewerModal';

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
  const [takingSeccionId, setTakingSeccionId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingPruebaId, setEditingPruebaId] = useState<number | null>(null);
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [modelos, setModelos] = useState<ModeloRA[]>([]);
  const contentRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const sectionRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [selectedModel, setSelectedModel] = useState<ModeloRA | null>(null);
  const lessonNum = parseId(lessonId);
  
  // Nuevo: secciones estructuradas
  const [secciones, setSecciones] = useState<LeccionSeccionCompleta[]>([]);
  const [estadisticas, setEstadisticas] = useState<{
    totalSecciones: number;
    seccionesCompletadas: number;
    porcentajeCompletado: number;
    tiempoTotalDedicado: number;
  } | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [seccionModeloCache, setSeccionModeloCache] = useState<Map<number, ModeloRA | null>>(new Map());
  
  // Estado para siguiente lección
  const [siguienteLeccion, setSiguienteLeccion] = useState<Leccion | null>(null);

  const loadLesson = useCallback(async (id: number) => {
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

      // Cargar contenidos asociados a esta lección (legacy)
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
          (contenidosData || []).map(async (c: Contenido) => {
            const { data: clData } = await supabase
              .from('contenido_leccion')
              .select('leccion_id, orden')
              .eq('contenido_id', c.id)
              .order('orden', { ascending: true });

            const leccionIds = (clData as ContenidoLeccion[] | null || []).map((cl) => cl.leccion_id);
            let lecciones: Leccion[] = [];
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
    } catch (error) {
      console.error('Error loading lesson:', error);
      toast.error(t('lessons.loadError', { defaultValue: 'Error al cargar lección' }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Cargar secciones estructuradas
  const loadSecciones = useCallback(async (leccionId: number, uid: string) => {
    try {
      const seccionesData = await listSeccionesCompletasByLeccion(leccionId, uid);
      setSecciones(seccionesData);

      // Cargar modelo principal para cada sección de contenido
      const modeloCache = new Map<number, ModeloRA | null>();
      for (const seccion of seccionesData) {
        if (seccion.tipo === 'contenido' && seccion.contenido_id) {
          const modelo = await getModeloPrincipalByContenido(seccion.contenido_id);
          modeloCache.set(seccion.id, modelo);
        }
      }
      setSeccionModeloCache(modeloCache);

      // Cargar estadísticas
      const stats = await getEstadisticasProgresoLeccion(uid, leccionId);
      setEstadisticas(stats);

      // Encontrar la primera sección no completada
      const primeraNoCompletada = seccionesData.findIndex(
        (s) => !s.progreso?.completado && !s.bloqueada
      );
      setCurrentSectionIndex(primeraNoCompletada >= 0 ? primeraNoCompletada : 0);
    } catch (error) {
      console.error('Error loading secciones:', error);
    }
  }, []);

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
          const id = parseId(lessonId);
          if (id === null) {
            toast.error(t('lessons.invalidId', { defaultValue: 'ID de lección inválido' }));
            setCheckingAuth(false);
            return;
          }
          await loadLesson(id);
          
          // Cargar secciones estructuradas
          await loadSecciones(id, session.user.id);
          
          // Cargar siguiente lección
          try {
            const siguiente = await getSiguienteLeccion(id);
            setSiguienteLeccion(siguiente);
          } catch {
            // ignore
          }
          
          // cargar progreso y modelos después de cargar la lección
          try {
            const { data: { session: sess } } = await supabase.auth.getSession();
            if (sess?.user?.id) {
              const p = await getProgresoByUsuarioAndLeccion(sess.user.id, id);
              setProgreso(p);
              // upsert ultimo acceso inmediato (safe helper)
              try {
                await upsertProgresoLastAccess(sess.user.id, id, { fecha_ultimo_acceso: new Date().toISOString() });
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
          try {
            const mods = await listModelosByLeccion(id);
            setModelos(mods || []);
          } catch {
            // ignore
          }
        }
      } catch (error) {
        console.error('Error in ensure:', error);
        toast.error(t('lessons.loadError', { defaultValue: 'Error al cargar lección' }));
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [lessonId, navigate, t, loadLesson, loadSecciones]);

  // Autosave last access cada 30s
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (!userId || !leccion) return;
    timer = setInterval(async () => {
      try {
        await upsertProgresoLastAccess(userId, leccion.id, { fecha_ultimo_acceso: new Date().toISOString() });
      } catch {
        // ignore
      }
    }, 30000);
    return () => { if (timer) clearInterval(timer); };
  }, [userId, leccion]);

  const marcarCompletada = async () => {
    if (!userId || !leccion) return;
    try {
      await upsertProgresoLastAccess(userId, leccion.id, { completado: true, fecha_ultimo_acceso: new Date().toISOString() });
      setProgreso((prev) => ({ ...(prev as Progreso), completado: true }));
      toast.success(t('lessons.markedCompleted', { defaultValue: 'Lección marcada como completada' }));
    } catch (e) {
      console.error('Error marking completed', e);
      toast.error(String(e) || 'Error al marcar completada');
    }
  };

  const openEvaluation = () => {
    if (pruebas && pruebas.length > 0) {
      setTakingPruebaId(pruebas[0].id);
    } else {
      toast(t('lesson.noPruebas', { defaultValue: 'No hay pruebas disponibles para esta lección' }));
    }
  };

  // Marcar sección como completada
  const handleMarcarSeccionCompletada = async (seccionId: number) => {
    if (!userId) return;
    try {
      await marcarSeccionCompletada(userId, seccionId);
      // Recargar secciones
      if (lessonNum) {
        await loadSecciones(lessonNum, userId);
      }
      toast.success(t('lesson.sectionCompleted', { defaultValue: 'Sección completada' }));
    } catch (error) {
      console.error('Error marking section completed:', error);
      toast.error(t('lesson.sectionCompleteError', { defaultValue: 'Error al marcar sección' }));
    }
  };

  // Scroll a una sección específica
  const scrollToSection = (index: number) => {
    const seccion = secciones[index];
    if (seccion) {
      const el = sectionRefs.current.get(seccion.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrentSectionIndex(index);
      }
    }
  };

  // Renderizar icono según tipo de sección
  const getSectionIcon = (tipo: string, bloqueada?: boolean, completada?: boolean) => {
    if (bloqueada) return <Lock size={20} className="text-gray-400" />;
    if (completada) return <CheckCircle size={20} className="text-green-500" />;
    switch (tipo) {
      case 'contenido':
        return <FileText size={20} className="text-blue-500" />;
      case 'prueba':
        return <ClipboardList size={20} className="text-orange-500" />;
      case 'modelo':
        return <Box size={20} className="text-purple-500" />;
      default:
        return <FileText size={20} className="text-gray-500" />;
    }
  };

  const goNext = () => {
    // Navegar al primer contenido o abrir evaluación
    if (contenidos.length > 0) {
      const first = contenidos[0];
      const el = contentRefs.current.get(first.id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    openEvaluation();
  };

  

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading', { defaultValue: 'Cargando...' })}</p>
        </div>
      </div>
    );
  }

  if (!leccion) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">{t('lessons.notFound', { defaultValue: 'Lección no encontrada' })}</p>
          <button
            onClick={() => navigate('/lessons')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('lessons.back', { defaultValue: 'Volver a lecciones' })}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      {loading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => {
            // If this lesson belongs to a content, navigate back to lessons filtered to that content
            if (contenidos && contenidos.length > 0 && leccion) {
              const contentId = contenidos[0].id;
              navigate(`/lessons?contentId=${contentId}&lessonId=${leccion.id}`);
              return;
            }
            navigate('/lessons');
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          <span>{t('lessons.back', { defaultValue: 'Volver a lecciones' })}</span>
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
            <div className="flex items-center gap-3 flex-wrap">
              {leccion.nivel && (
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {leccion.nivel}
                </span>
              )}
              {estadisticas && (
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  {estadisticas.porcentajeCompletado}% {t('lesson.completed', { defaultValue: 'completado' })}
                </span>
              )}
              {progreso?.completado && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-1">
                  <CheckCircle size={14} />
                  {t('lessons.completed', { defaultValue: 'Completada' })}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => scrollToSection(currentSectionIndex)}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('lesson.continue', { defaultValue: 'Continuar lección' })}
              </button>
              <button
                onClick={marcarCompletada}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {t('lessons.markComplete', { defaultValue: 'Marcar como completada' })}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slides de la lección (si existen) */}
      {leccion.slides && Array.isArray(leccion.slides) && leccion.slides.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            📊 {t('lesson.presentationSlides', { defaultValue: 'Presentación de la lección' })}
          </h2>
          <div className="space-y-6">
            {(leccion.slides as Array<{ title: string; content_html: string; image_url?: string; pdf_page_url?: string }>).map((slide, slideIndex) => (
              <div key={slideIndex} className="border-l-4 border-purple-500 pl-4 py-2">
                <h4 className="font-medium text-gray-800 mb-2">{slide.title}</h4>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: slide.content_html }} />
                {slide.image_url && (
                  <img src={slide.image_url} alt={slide.title} className="mt-4 rounded-lg max-w-full h-auto" />
                )}
                {slide.pdf_page_url && (
                  <div className="mt-4">
                    <iframe src={slide.pdf_page_url} title={slide.title} className="w-full h-[500px] rounded-lg border" />
                    <a href={slide.pdf_page_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                      Abrir PDF en nueva pestaña
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media files de la lección (si existen) */}
      {leccion.media_files && Array.isArray(leccion.media_files) && leccion.media_files.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🎬 {t('lesson.lessonMedia', { defaultValue: 'Material multimedia' })}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(leccion.media_files as Array<{ url: string; type: string; name?: string }>).map((media, mediaIndex) => (
              <div key={mediaIndex} className="border rounded-lg p-4 bg-gray-50">
                {media.name && <p className="text-sm font-medium text-gray-700 mb-2">{media.name}</p>}
                {media.type === 'video' && <video src={media.url} controls className="w-full rounded-lg" />}
                {media.type === 'audio' && <audio src={media.url} controls className="w-full" />}
                {media.type === 'pdf' && (
                  <div>
                    <iframe src={media.url} className="w-full h-[400px] rounded-lg border" title={media.name || 'PDF'} />
                    <a href={media.url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                      Abrir PDF
                    </a>
                  </div>
                )}
                {media.type === 'image' && <img src={media.url} alt={media.name || 'Imagen'} className="w-full rounded-lg" />}
                {media.type === 'embed' && <iframe src={media.url} className="w-full h-[300px] rounded-lg border" title={media.name || 'Embed'} allowFullScreen />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de progreso de secciones */}
      {secciones.length > 0 && (
        <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('lesson.progress', { defaultValue: 'Progreso de la lección' })}
            </span>
            <span className="text-sm text-gray-500">
              {estadisticas?.seccionesCompletadas ?? 0} / {estadisticas?.totalSecciones ?? secciones.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${estadisticas?.porcentajeCompletado ?? 0}%` }}
            />
          </div>
          {/* Mini navegación de secciones */}
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {secciones.map((seccion, index) => (
              <button
                key={seccion.id}
                onClick={() => !seccion.bloqueada && scrollToSection(index)}
                disabled={seccion.bloqueada}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                  seccion.bloqueada
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : seccion.progreso?.completado
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : index === currentSectionIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getSectionIcon(seccion.tipo, seccion.bloqueada, seccion.progreso?.completado)}
                <span>{seccion.titulo_seccion || `${seccion.tipo} ${index + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Secciones en scroll vertical */}
      {secciones.length > 0 ? (
        <div className="space-y-8">
          {secciones.map((seccion, index) => (
            <div
              key={seccion.id}
              ref={(el) => { sectionRefs.current.set(seccion.id, el); }}
              className={`bg-white rounded-lg shadow-lg border-2 transition-all ${
                seccion.bloqueada
                  ? 'border-gray-200 opacity-60'
                  : seccion.progreso?.completado
                  ? 'border-green-300'
                  : index === currentSectionIndex
                  ? 'border-blue-500'
                  : 'border-gray-200'
              }`}
            >
              {/* Header de sección */}
              <div className={`p-4 border-b flex items-center justify-between ${
                seccion.bloqueada ? 'bg-gray-50' : 'bg-gradient-to-r from-gray-50 to-white'
              }`}>
                <div className="flex items-center gap-3">
                  {getSectionIcon(seccion.tipo, seccion.bloqueada, seccion.progreso?.completado)}
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {seccion.titulo_seccion || (
                        seccion.tipo === 'contenido' ? seccion.contenido?.titulo :
                        seccion.tipo === 'prueba' ? seccion.prueba?.titulo :
                        seccion.modelo?.nombre_modelo
                      )}
                    </h3>
                    {seccion.descripcion_seccion && (
                      <p className="text-sm text-gray-500">{seccion.descripcion_seccion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {seccion.es_obligatorio && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {t('lesson.required', { defaultValue: 'Obligatorio' })}
                    </span>
                  )}
                  {seccion.bloqueada && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full flex items-center gap-1">
                      <Lock size={12} />
                      {t('lesson.locked', { defaultValue: 'Bloqueado' })}
                    </span>
                  )}
                </div>
              </div>

              {/* Contenido de la sección */}
              {!seccion.bloqueada && (
                <div className="p-6">
                  {/* Sección de tipo Contenido */}
                  {seccion.tipo === 'contenido' && seccion.contenido && (
                    <div>
                      {/* Renderizar slides si existen */}
                      {seccion.contenido.slides && Array.isArray(seccion.contenido.slides) && seccion.contenido.slides.length > 0 ? (
                        <div className="space-y-6">
                          {(seccion.contenido.slides as Array<{ title: string; content_html: string; image_url?: string; pdf_page_url?: string }>).map((slide, slideIndex) => (
                            <div key={slideIndex} className="border-l-4 border-blue-500 pl-4 py-2">
                              <h4 className="font-medium text-gray-800 mb-2">{slide.title}</h4>
                              <div
                                className="prose max-w-none"
                                dangerouslySetInnerHTML={{ __html: slide.content_html }}
                              />
                              {slide.image_url && (
                                <img
                                  src={slide.image_url}
                                  alt={slide.title}
                                  className="mt-4 rounded-lg max-w-full h-auto"
                                />
                              )}
                              {slide.pdf_page_url && (
                                <div className="mt-4">
                                  <iframe
                                    src={slide.pdf_page_url}
                                    title={slide.title}
                                    className="w-full h-[500px] rounded-lg border"
                                  />
                                  <a 
                                    href={slide.pdf_page_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                                  >
                                    Abrir PDF en nueva pestaña
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Renderizar texto_html normal */
                        seccion.contenido.texto_html && (
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: seccion.contenido.texto_html }}
                          />
                        )
                      )}
                      
                      {/* Renderizar media si existe */}
                      {seccion.contenido.media_url && seccion.contenido.media_type && (
                        <div className="mt-6">
                          {seccion.contenido.media_type === 'video' && (
                            <video
                              src={seccion.contenido.media_url}
                              controls
                              className="w-full rounded-lg"
                            />
                          )}
                          {seccion.contenido.media_type === 'audio' && (
                            <audio
                              src={seccion.contenido.media_url}
                              controls
                              className="w-full"
                            />
                          )}
                          {seccion.contenido.media_type === 'pdf' && (
                            <iframe
                              src={seccion.contenido.media_url}
                              className="w-full h-[600px] rounded-lg border"
                              title="PDF Viewer"
                            />
                          )}
                          {seccion.contenido.media_type === 'embed' && (
                            <iframe
                              src={seccion.contenido.media_url}
                              className="w-full h-[400px] rounded-lg border"
                              title="Embedded Content"
                              allowFullScreen
                            />
                          )}
                          {seccion.contenido.media_type === 'image' && (
                            <img
                              src={seccion.contenido.media_url}
                              alt={seccion.contenido.titulo}
                              className="w-full rounded-lg"
                            />
                          )}
                        </div>
                      )}

                      {/* Renderizar múltiples archivos media si existen */}
                      {seccion.contenido.media_files && Array.isArray(seccion.contenido.media_files) && seccion.contenido.media_files.length > 0 && (
                        <div className="mt-6 space-y-4">
                          <h4 className="font-medium text-gray-700">{t('lesson.mediaFiles', { defaultValue: 'Archivos multimedia' })}</h4>
                          {(seccion.contenido.media_files as Array<{ url: string; type: string; name?: string }>).map((media, mediaIndex) => (
                            <div key={mediaIndex} className="border rounded-lg p-4 bg-gray-50">
                              {media.name && (
                                <p className="text-sm font-medium text-gray-700 mb-2">{media.name}</p>
                              )}
                              {media.type === 'video' && (
                                <video src={media.url} controls className="w-full rounded-lg" />
                              )}
                              {media.type === 'audio' && (
                                <audio src={media.url} controls className="w-full" />
                              )}
                              {media.type === 'pdf' && (
                                <div>
                                  <iframe src={media.url} className="w-full h-[500px] rounded-lg border" title={media.name || 'PDF'} />
                                  <a href={media.url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-sm text-blue-600 hover:underline">
                                    Abrir PDF en nueva pestaña
                                  </a>
                                </div>
                              )}
                              {media.type === 'image' && (
                                <img src={media.url} alt={media.name || 'Imagen'} className="w-full rounded-lg" />
                              )}
                              {media.type === 'embed' && (
                                <iframe src={media.url} className="w-full h-[400px] rounded-lg border" title={media.name || 'Embed'} allowFullScreen />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Modelo RA asociado al contenido */}
                      {seccionModeloCache.get(seccion.id) && (
                        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Box size={20} className="text-purple-600" />
                              <span className="font-medium text-purple-900">
                                {t('lesson.associatedModel', { defaultValue: 'Modelo 3D asociado' })}:
                              </span>
                              <span className="text-purple-700">
                                {seccionModeloCache.get(seccion.id)?.nombre_modelo}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedModel(seccionModeloCache.get(seccion.id)!)}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                            >
                              {t('lesson.viewModel', { defaultValue: 'Ver modelo' })}
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Botón marcar como completada */}
                      {!seccion.progreso?.completado && (
                        <div className="mt-6 flex justify-end">
                          <button
                            onClick={() => handleMarcarSeccionCompletada(seccion.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <CheckCircle size={18} />
                            {t('lesson.markSectionComplete', { defaultValue: 'Marcar como completada' })}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sección de tipo Prueba */}
                  {seccion.tipo === 'prueba' && seccion.prueba && (
                    <div className="text-center py-6">
                      <ClipboardList size={48} className="mx-auto text-orange-500 mb-4" />
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {seccion.prueba.titulo}
                      </h4>
                      {seccion.prueba.descripcion && (
                        <p className="text-gray-600 mb-4">{seccion.prueba.descripcion}</p>
                      )}
                      <div className="flex justify-center gap-4 mb-6">
                        {seccion.prueba.tiempo_limite && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                            <Clock size={14} />
                            <span>{seccion.prueba.tiempo_limite} min</span>
                          </div>
                        )}
                        {seccion.prueba.puntaje_minimo && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full">
                            <Target size={14} />
                            <span>{seccion.prueba.puntaje_minimo}% min</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setTakingPruebaId(seccion.prueba!.id);
                          setTakingSeccionId(seccion.id);
                        }}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 mx-auto"
                      >
                        <Play size={20} />
                        {t('lesson.takePrueba', { defaultValue: 'Tomar Prueba' })}
                      </button>
                    </div>
                  )}

                  {/* Sección de tipo Modelo */}
                  {seccion.tipo === 'modelo' && seccion.modelo && (
                    <div className="text-center py-6">
                      <Box size={48} className="mx-auto text-purple-500 mb-4" />
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">
                        {seccion.modelo.nombre_modelo}
                      </h4>
                      {seccion.modelo.descripcion && (
                        <p className="text-gray-600 mb-4">{seccion.modelo.descripcion}</p>
                      )}
                      {/(\.glb|\.gltf)$/i.test(seccion.modelo.archivo_url) ? (
                        <button
                          onClick={() => setSelectedModel(seccion.modelo!)}
                          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
                        >
                          <Box size={20} />
                          {t('lesson.openModel', { defaultValue: 'Abrir modelo 3D' })}
                        </button>
                      ) : (
                        <a
                          href={seccion.modelo.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          <Box size={20} />
                          {t('lesson.openModel', { defaultValue: 'Abrir modelo' })}
                        </a>
                      )}
                      
                      {/* Botón marcar como completada */}
                      {!seccion.progreso?.completado && (
                        <div className="mt-6">
                          <button
                            onClick={() => handleMarcarSeccionCompletada(seccion.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 mx-auto"
                          >
                            <CheckCircle size={18} />
                            {t('lesson.markSectionComplete', { defaultValue: 'Marcar como completada' })}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Fallback a vista legacy si no hay secciones estructuradas */
        <>
          {/* Contenidos legacy */}
          {contenidos.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                {t('lesson.contents', { defaultValue: 'Contenidos' })}
              </h2>
              <div className="space-y-4">
                {contenidos.map((contenido) => (
                  <div
                    key={contenido.id}
                    ref={(el) => { contentRefs.current.set(contenido.id, el); }}
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
                          {t('lesson.relatedLessons', { defaultValue: 'Lecciones relacionadas' })}:
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
        </>
      )}

      {/* Botón de navegación: Continuar a siguiente lección o Finalizar */}
      {/* Se muestra si progreso está completado O si todas las secciones están completadas */}
      {(progreso?.completado || (estadisticas && estadisticas.porcentajeCompletado >= 100)) && (
        <div className="mt-8 mb-6 flex justify-center">
          {siguienteLeccion ? (
            <button
              onClick={() => navigate(`/lessons/${siguienteLeccion.id}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-lg font-medium shadow-lg transition-all hover:shadow-xl"
            >
              {t('lesson.continueNext', { defaultValue: 'Continuar con la siguiente lección' })}
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/contents')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-lg font-medium shadow-lg transition-all hover:shadow-xl"
            >
              <Flag size={20} />
              {t('lesson.finish', { defaultValue: 'Finalizar lección' })}
            </button>
          )}
        </div>
      )}

      {/* Modal visor de modelo */}
      {selectedModel && (
        <ModelViewerModal
          open={!!selectedModel}
          onClose={() => setSelectedModel(null)}
          url={selectedModel.archivo_url}
          title={selectedModel.nombre_modelo}
        />
      )}

      {/* Modal de tomar prueba */}
      {takingPruebaId && lessonNum != null && (
        <TakePruebaModal
          open={!!takingPruebaId}
          onClose={async () => {
            setTakingPruebaId(null);
            setTakingSeccionId(null);
            // Recargar secciones después de tomar prueba
            if (userId && lessonNum) {
              await loadSecciones(lessonNum, userId);
            }
          }}
          pruebaId={takingPruebaId}
          leccionId={lessonNum}
          seccionId={takingSeccionId ?? undefined}
        />
      )}

      {/* Modal de editar/crear prueba */}
      {editingPruebaId !== null && userId && lessonId && (
        <EditPruebaModal
          open={editingPruebaId !== null}
          onClose={() => setEditingPruebaId(null)}
          pruebaId={editingPruebaId === 0 ? null : editingPruebaId}
          onUpdated={async () => {
            // Recargar pruebas y secciones
            if (lessonNum == null) return;
            const pruebasData = await listPruebasByLeccion(lessonNum);
            setPruebas(pruebasData.filter((p) => p.activa));
            if (userId) {
              await loadSecciones(lessonNum, userId);
            }
            setEditingPruebaId(null);
          }}
          userId={userId}
          defaultLeccionId={lessonNum ?? undefined}
        />
      )}
    </main>
  );
}
