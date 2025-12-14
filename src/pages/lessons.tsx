import { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { supabase } from "../lib/supabaseClient";
import { getProfile } from '../lib/data/profiles';
import { getProgresosByUsuario } from '../lib/data/progresos';
import { parseId } from '../lib/parseId';
import type { Leccion, Progreso } from '../types/db';
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function LessonsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  type LessonView = Leccion & { created_at?: string | null };
  const [lessons, setLessons] = useState<LessonView[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [progresos, setProgresos] = useState<Record<number, Progreso | undefined>>({});
  const [lastVisitedId, setLastVisitedId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lid = params.get('lessonId');
    const cid = params.get('contentId');
    const lidNum = parseId(lid);
    const cidNum = parseId(cid);
    setHighlightId(lidNum);
      let progressChannel: unknown | null = null;
    const ensureAuthAndLoad = async () => {
      setCheckingAuth(true);
      try {
            const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { navigate('/login'); return; }
        try {
          const { data: profile } = await getProfile(session.user.id);
          const role = profile?.role || session.user.user_metadata?.role || null;
          const allowed = ['student', 'teacher', 'admin'];
          if (!allowed.includes(role)) { navigate('/login'); return; }
        } catch {
          const role2 = session.user.user_metadata?.role || null;
          const allowed2 = ['student', 'teacher', 'admin'];
          if (!allowed2.includes(role2)) { navigate('/login'); return; }
        }
        // reuse same session value declared above
        await fetchLessons(lidNum ?? null, cidNum ?? null);
        // fetchProgresos returns an object with { channel, lastVisitedId }
        // assign channel for cleanup and navigate to last visited if appropriate
        const resultado = await fetchProgresos(session.user.id);
        if (resultado) {
          progressChannel = resultado.channel ?? null;
          const lv = resultado.lastVisited;
          // lv may be a number or an object { id, fecha }
          let lvId: number | null = null;
          if (lv !== null && lv !== undefined) {
            if (typeof lv === 'number') lvId = lv;
            else if (typeof lv === 'object' && 'id' in lv && typeof (lv as any).id === 'number') lvId = (lv as any).id;
          }
          if (!lid && lvId) {
            // No redirigir automáticamente: solo guardamos el id para resaltar y permitir "Continuar" manual
            // La UI mostrará el último visitado (lastVisitedId) y el usuario podrá hacer click en "Continuar"
          }
        }
      } finally {
        setCheckingAuth(false);
      }
    };
    ensureAuthAndLoad();

    return () => {
      if (progressChannel) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).removeChannel(progressChannel);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const fetchLessons = async (onlyId?: number | null, contentId?: number | null) => {
    try {
      // If contentId provided, fetch lessons associated to that content (preserve order)
      if (contentId != null) {
        const { data: mappings, error: mapErr } = await supabase
          .from('contenido_leccion')
          .select('leccion_id, orden')
          .eq('contenido_id', contentId)
          .order('orden', { ascending: true, nullsFirst: false });
        if (mapErr) throw mapErr;
        const leccionIds = (mappings || []).map((m: any) => m.leccion_id).filter(Boolean);
        if (leccionIds.length === 0) {
          setLessons([]);
          return;
        }
        const { data: lessonsData, error: lessonsErr } = await supabase
          .from('leccion')
          .select('id,titulo,descripcion,nivel,thumbnail_url,created_at')
          .in('id', leccionIds);
        if (lessonsErr) throw lessonsErr;
        // Preserve order according to leccionIds
        const lessonsById = (lessonsData || []).reduce((acc: any, l: any) => { acc[l.id] = l; return acc; }, {} as Record<number, any>);
        const ordered = leccionIds.map((id: number) => lessonsById[id]).filter(Boolean);
        setLessons(ordered);
        return;
      }

      const query = supabase
        .from("leccion")
        .select("id,titulo,descripcion,nivel,thumbnail_url,created_at")
        .order('created_at', { ascending: false });
      const { data, error } = onlyId ? await query.eq('id', onlyId) : await query;
      if (error) {
        console.error("Error fetching lessons", error);
        toast.error(t("lessons.loadError", { defaultValue: "Error loading lessons" }));
        return;
      }
      // If onlyId passed, ensure only the specific lesson is shown
      setLessons((data || []));
    } catch (err) {
      console.error('Error fetching lessons for content:', err);
      toast.error(t('lessons.loadError', { defaultValue: 'Error loading lessons' }));
    }
  };

  const fetchProgresos = async (usuarioId: string) => {
    try {
      const arr = await getProgresosByUsuario(usuarioId);
      const map: Record<number, Progreso | undefined> = {};
      let lastVisited: { id: number; fecha?: string | null } | null = null;
      (arr || []).forEach((p) => {
        map[p.leccion_id as number] = p;
        if (p.fecha_ultimo_acceso) {
          if (!lastVisited || new Date(p.fecha_ultimo_acceso) > new Date(lastVisited.fecha || '')) {
            lastVisited = { id: p.leccion_id as number, fecha: p.fecha_ultimo_acceso };
          }
        }
      });
      setProgresos(map);
      const lastVisitedIdVal = lastVisited ? (lastVisited as { id: number }).id : null;
      setLastVisitedId(lastVisitedIdVal ?? null);
      // subscribe to realtime updates for progreso for this user
      // Create realtime subscription for progreso updates for the user
      // The Supabase realtime channel API types are not represented in our project, so we
      // cast to any for now. eslint rule disabled for explicit any usage on following lines.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const channel: any = (supabase as any)
        .channel(`progreso:usuario_id=eq.${usuarioId}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes', { event: '*', schema: 'public', table: 'progreso', filter: `usuario_id=eq.${usuarioId}` }, (payload: any) => {
          try {
            if (payload?.record) {
              setProgresos((prev) => ({ ...prev, [payload.record.leccion_id]: payload.record }));
            } else if (payload?.old && payload.eventType === 'DELETE') {
              setProgresos((prev) => {
                const copy = { ...prev };
                delete copy[payload.old.leccion_id];
                return copy;
              });
            }
          } catch (error) {
            console.error('Error handling progreso realtime payload', error);
          }
        })
        .subscribe();
      // Cleanup: remove channel on unmount
      return { channel, lastVisited };
    } catch (error) {
      console.error('Error fetching progresos', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {checkingAuth && (<div className="text-center py-8 text-gray-500">{t('loading', { defaultValue: 'Cargando...' })}</div>)}
      {!checkingAuth && (
      <>
      <h1 className="text-2xl font-bold mb-4">{t("lessons.title", { defaultValue: i18n.language === 'es' ? 'Todas las clases' : 'Lessons' })}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 p-6 bg-white rounded-lg shadow">{t("lessons.noRecords", { defaultValue: i18n.language === 'es' ? 'No hay lecciones' : 'No lessons found' })}</div>
        ) : (
          <>
            {lessons.map((l) => {
            const prog = progresos[l.id];
            const progressPercent = Math.max(0, Math.min(100, (prog?.puntaje ?? 0) as number));
            const completed = !!prog?.completado;
                  const status = completed
                    ? t('lessons.status.completed', { defaultValue: 'Completada — revisa recursos y resultados' })
                    : prog
                      ? t('lessons.status.inProgress', { score: prog?.puntaje ?? 0, defaultValue: `En progreso — puntaje actual ${prog?.puntaje ?? 0}%` })
                      : t('lessons.status.notStarted', { defaultValue: 'No iniciada — comienza la lección para avanzar' });
            const isLastVisited = lastVisitedId === l.id;
            return (
            <article key={l.id} className={`bg-white rounded-lg shadow p-4 flex flex-col ${highlightId && highlightId === l.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex-1">
                <div className="h-40 w-full rounded-md overflow-hidden bg-gray-100 mb-3 flex items-center justify-center">
                  {l.thumbnail_url ? (
                    <img src={l.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-sm text-gray-400">{t('lessons.card.noThumbnail', { defaultValue: i18n.language === 'es' ? 'Sin thumbnail' : 'No thumbnail' })}</div>
                  )}
                </div>
                <h3 className="text-lg font-semibold mb-2">{l.titulo || "Untitled"}</h3>
                {l.descripcion && <div className="text-sm text-gray-500 mb-2">{(l.descripcion || '').slice(0, 160)}{(l.descripcion || '').length > 160 ? '…' : ''}</div>}
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {l.nivel && (
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">{l.nivel}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">{l.created_at ? new Date(l.created_at).toLocaleDateString() : ''}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="text-xs font-medium mb-1 flex items-center justify-between">
                  <span className="text-gray-700">{status}</span>
                  <span className="text-gray-500">{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 justify-end">
                <button onClick={() => navigate(`/lesson/${l.id}`)} className={`px-3 py-1 rounded text-white text-sm ${completed ? 'bg-green-600' : 'bg-blue-600'}`}>
                  {isLastVisited ? t('lessons.card.continue', { defaultValue: 'Continuar' }) : t('lessons.card.viewClass', { defaultValue: 'Iniciar' })}
                </button>
              </div>
            </article>
            );
            })}
          </>
        )}
      </div>
      </>
      )}
      </div>
  );
}
