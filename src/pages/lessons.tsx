import { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function LessonsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [lessons, setLessons] = useState<any[]>([]);
  const [highlightId, setHighlightId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lid = params.get('lessonId');
    setHighlightId(lid ? Number(lid) : null);
    fetchLessons(lid ? Number(lid) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const fetchLessons = async (onlyId?: number | null) => {
    const query = supabase
      .from("leccion")
      .select("id,titulo,descripcion,nivel,thumbnail_url,created_at")
      .order('created_at', { ascending: false });
    const { data, error } = onlyId ? await query.eq('id', onlyId) : await query;
    if (error) {
      console.error("Error fetching lessons", error);
      toast.error(t("lessons.loadError") || "Error loading lessons");
      return;
    }
    // If onlyId passed, ensure only the specific lesson is shown
    setLessons((data || []));
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t("lessons.title", { defaultValue: i18n.language === 'es' ? 'Todas las clases' : 'Lessons' })}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 p-6 bg-white rounded-lg shadow">{t("lessons.noRecords", { defaultValue: i18n.language === 'es' ? 'No hay lecciones' : 'No lessons found' })}</div>
        ) : (
          lessons.map((l) => (
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
                  <div className="text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 justify-end">
                <button onClick={() => navigate(`/lessons`)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('lessons.card.viewClass', { defaultValue: i18n.language === 'es' ? 'Ver clase' : 'View class' })}</button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
