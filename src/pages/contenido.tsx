import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getProfile } from "../lib/data/profiles";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { parseId } from '../lib/parseId';

export default function ContenidoPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const contentId = parseId(params.contentId as string | undefined);
  const [content, setContent] = useState<any | null>(null);
  // content-only page: each content shows the lesson it is linked to
  const [lesson, setLesson] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const ensureLoad = async () => {
      setCheckingAuth(true);
      try {
        // Allow viewing content without authentication
        if (contentId == null) return;
        await fetchContent(contentId);
      } finally {
        setCheckingAuth(false);
      }
    };
    ensureLoad();
  }, [contentId]);

  const fetchContent = async (id: number) => {
    const { data, error } = await supabase
      .from("contenido")
      .select(
        `id, leccion_id, titulo, texto_html, type, author, difficulty, tags, resources`
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching content", error);
      toast.error(t("contents.loadRecordsError") || "Error loading content");
      return;
    }

    setContent(data || null);

    // fetch lesson title for breadcrumb/back-link
    if (data?.leccion_id) {
      const { data: lData, error: lErr } = await supabase
        .from("leccion")
        .select("id, titulo")
        .eq("id", data.leccion_id)
        .single();
      if (!lErr && lData) {
        setLesson(lData);
      }

      // fetch all contents in this lesson
      // No need to fetch other contents — the page should display only the linked lesson
    }
  };

  // Auth-guarded navigation helpers: redirect to login if not signed in
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
  };

  const viewAllLessons = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        navigate('/lessons');
      } else {
        toast.error(t('login.required', { defaultValue: 'Necesitas iniciar sesión para ver las lecciones' }));
        navigate(`/login?next=${encodeURIComponent('/lessons')}`);
      }
    } catch (err) {
      console.error('Error checking session before navigating to lessons', err);
      toast.error(t('login.required', { defaultValue: 'Necesitas iniciar sesión para ver las lecciones' }));
      navigate(`/login?next=${encodeURIComponent('/lessons')}`);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4">
      {checkingAuth && (
        <div className="text-center py-8 text-gray-500">{t('loading') || 'Cargando...'}</div>
      )}
      {!checkingAuth && (
      <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {content?.titulo || t("contents.viewTitle", { defaultValue: i18n.language === 'es' ? 'Contenido' : 'Content' })}
          </h1>
          {lesson && (
            <div className="mt-4">
              <div className="bg-white p-4 rounded-lg shadow flex items-start gap-4">
                <div className="w-28 h-20 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                  {lesson.thumbnail_url ? <img className="w-full h-full object-cover" src={lesson.thumbnail_url} alt={lesson.titulo} /> : (
                    <div className="text-sm text-gray-400">{t('lessons.card.noThumbnail', { defaultValue: i18n.language === 'es' ? 'Sin thumbnail' : 'No thumbnail' })}</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{lesson.titulo}</h3>
                  {lesson.descripcion && <p className="text-sm text-gray-500">{lesson.descripcion}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {content?.leccion_id && (
            <button onClick={() => viewLesson(content.leccion_id)} className="px-3 py-1 rounded bg-gray-200 text-gray-800 text-sm">{t('lessons.title', { defaultValue: i18n.language === 'es' ? 'Todas las clases' : 'Lessons' })}</button>
          )}
          <button onClick={() => viewAllLessons()} className="px-3 py-1 rounded bg-gray-100 text-gray-800 text-sm">{t('lessons.title', { defaultValue: i18n.language === 'es' ? 'Todas las clases' : 'Lessons' })}</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4 text-sm text-gray-600">
          {content?.type && <span className="inline-block mr-2">{content.type}</span>}
          {content?.difficulty && <span className="inline-block px-2 py-0.5 bg-gray-100 rounded ml-1">{content.difficulty}</span>}
        </div>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content?.texto_html || '' }} />
        {Array.isArray(content?.tags) && content.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {content.tags.map((tag: string) => (
              <span key={tag} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{tag}</span>
            ))}
          </div>
        )}

        {content?.resources && Array.isArray(content.resources) && content.resources.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">{t('contents.resources', { defaultValue: i18n.language === 'es' ? 'Recursos' : 'Resources' })}</h3>
            <ul className="list-disc list-inside text-sm">
              {content.resources.map((r: string, idx: number) => (
                <li key={idx}><a target="_blank" rel="noreferrer" href={r} className="text-blue-600 underline">{r}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Showing only the linked lesson for this content — the lesson card above is the single lesson related to the open content */}
      </>
      )}
    </main>
  );
}
