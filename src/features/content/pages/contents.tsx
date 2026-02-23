import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { getContenidosSeguidos, seguirContenido, dejarDeSeguirContenido } from "@/shared/services/seguimiento";

export default function ContentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [contents, setContents] = useState<any[]>([]);
  const [lessonsById, setLessonsById] = useState<Record<number, any>>({});
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set());
  const [togglingFollow, setTogglingFollow] = useState<number | null>(null);

  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type');

  useEffect(() => {
    fetchContents(typeFilter);
    fetchLessons();
    loadUserAndFollows();
    console.debug('[ContentsPage] i18n language:', i18n.language, 'viewLesson:', t('contents.card.viewLesson'), 'typeFilter:', typeFilter);
  }, [typeFilter]);

  const loadUserAndFollows = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      setUserId(session.user.id);
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setUserRole(profile?.role || session.user.user_metadata?.role || null);
      // Load followed content ids
      const ids = await getContenidosSeguidos(session.user.id);
      setFollowedIds(new Set(ids));
    } catch (e) {
      console.error('Error loading user follows', e);
    }
  };

  const toggleFollow = async (contenidoId: number) => {
    if (!userId) {
      toast.error(t('login.required', { defaultValue: 'Necesitas iniciar sesión' }));
      return;
    }
    setTogglingFollow(contenidoId);
    try {
      if (followedIds.has(contenidoId)) {
        await dejarDeSeguirContenido(userId, contenidoId);
        setFollowedIds(prev => { const s = new Set(prev); s.delete(contenidoId); return s; });
        toast.success(t('contents.unfollowed', { defaultValue: 'Dejaste de seguir este contenido' }));
      } else {
        await seguirContenido(userId, contenidoId);
        setFollowedIds(prev => new Set(prev).add(contenidoId));
        toast.success(t('contents.followed', { defaultValue: 'Ahora sigues este contenido' }));
      }
    } catch (e) {
      console.error('Error toggling follow', e);
      toast.error(t('contents.followError', { defaultValue: 'Error al actualizar seguimiento' }));
    } finally {
      setTogglingFollow(null);
    }
  };

  const fetchLessons = async () => {
    const { data, error } = await supabase.from('leccion').select('id,titulo');
    if (error) {
      console.error('Error fetching lessons', error);
      toast.error(t('contents.loadLessonsError') || t('addcontent.loadLessonsError') || 'Error loading lessons');
      return;
    }
    const map: Record<number, any> = {};
    (data || []).forEach((l: any) => { map[l.id] = l; });
    setLessonsById(map);
  }

  const fetchContents = async (typeFilter?: string) => {
    let query: any = supabase.from('contenido').select('id,leccion_id,titulo,texto_html,type,author,difficulty,tags,resources,orden').order('orden', { ascending: true });
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching content:', error);
      toast.error(t('contents.loadRecordsError') || t('addcontent.loadRecordsError') || 'Error loading records');
      return;
    }
    setContents(data || []);
  };

  const getTypeLabel = (typeVal: string) => {
    switch (typeVal) {
      case 'molecule': return t('addcontent.form.typeOptions.molecule');
      case 'atom': return t('addcontent.form.typeOptions.atom');
      case 'experiment': return t('addcontent.form.typeOptions.experiment');
      case 'chemical-reaction': return t('addcontent.form.typeOptions.chemicalReactions');
      case 'periodic-table': return t('addcontent.form.typeOptions.periodicTable');
      case 'article': return t('addcontent.form.typeOptions.article');
      default: return typeVal;
    }
  }

  const getDifficultyLabel = (d: string) => {
    switch ((d || '').toLowerCase()) {
      case 'fácil':
      case 'facil':
      case 'easy':
        return t('addcontent.form.difficultyOptions.easy');
      case 'media':
      case 'medium':
        return t('addcontent.form.difficultyOptions.medium');
      case 'difícil':
      case 'dificil':
      case 'hard':
        return t('addcontent.form.difficultyOptions.hard');
      default:
        return d;
    }
  }

  // Open lesson with authentication check: if not signed in, redirect to login
  const viewLesson = async (lessonId: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        navigate(`/lessons?lessonId=${lessonId}`);
      } else {
        toast.error(t('login.required', { defaultValue: 'Necesitas iniciar sesión para ver la lección' }));
        navigate(`/login?next=${encodeURIComponent(`/lessons?lessonId=${lessonId}`)}`);
      }
    } catch (err) {
      console.error('Error checking session before navigating to lesson', err);
      toast.error(t('login.required', { defaultValue: 'Necesitas iniciar sesión para ver la lección' }));
      navigate(`/login?next=${encodeURIComponent(`/lessons?lessonId=${lessonId}`)}`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('contents.title')}{typeFilter ? ` — ${getTypeLabel(typeFilter)}` : ''}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contents.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 p-6 bg-white rounded-lg shadow">{t('contents.noRecords')}</div>
        ) : (
          contents.map((c) => (
            <article key={c.id} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{c.titulo || c.title || 'Untitled'}</h3>
                <div className="text-sm text-gray-500 mb-2">{getTypeLabel(c.type)} • {lessonsById[c.leccion_id]?.titulo ?? '-'}</div>
                <div className="text-xs text-gray-400 mb-2">{getDifficultyLabel(c.difficulty)}</div>
                <div className="text-sm mb-3">{(c.texto_html || c.description || '').replace(/(<([^>]+)>)/gi, '').slice(0, 160)}{(c.texto_html || c.description || '').length > 160 ? '…' : ''}</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(Array.isArray(c.tags) ? c.tags : (c.tags ? [c.tags] : [])).map((tag: string) => (
                    <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 justify-between">
                {/* Follow button for students */}
                {userId && userRole === 'student' && (
                  <button
                    onClick={() => toggleFollow(c.id)}
                    disabled={togglingFollow === c.id}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
                      followedIds.has(c.id)
                        ? 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } disabled:opacity-50`}
                    title={followedIds.has(c.id)
                      ? t('contents.unfollow', { defaultValue: 'Dejar de seguir' })
                      : t('contents.follow', { defaultValue: 'Seguir' })}
                  >
                    <Heart size={16} className={followedIds.has(c.id) ? 'fill-pink-500' : ''} />
                    {followedIds.has(c.id)
                      ? t('contents.following', { defaultValue: 'Siguiendo' })
                      : t('contents.follow', { defaultValue: 'Seguir' })}
                  </button>
                )}
                <div className="flex items-center gap-2">
                {c.leccion_id ? (
                  <button onClick={() => viewLesson(c.leccion_id)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('lessons.card.viewClass', { defaultValue: i18n.language === 'es' ? 'Ver clase' : 'View class' })}</button>
                ) : (
                  <button onClick={() => navigate(`/add-content?contentId=${c.id}`)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('contents.card.edit', { defaultValue: i18n.language === 'es' ? 'Editar contenido' : 'Edit content' })}</button>
                )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
