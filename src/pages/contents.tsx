import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ContentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [contents, setContents] = useState<any[]>([]);
  const [lessonsById, setLessonsById] = useState<Record<number, any>>({});

  useEffect(() => {
    fetchContents();
    fetchLessons();
    console.debug('[ContentsPage] i18n language:', i18n.language, 'viewLesson:', t('contents.card.viewLesson'));
  }, []);

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

  const fetchContents = async () => {
    const { data, error } = await supabase.from('contenido').select('id,leccion_id,titulo,texto_html,type,author,difficulty,tags,resources,orden').order('orden', { ascending: true });
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

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{t('contents.title')}</h1>
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
              <div className="mt-4 flex items-center gap-2 justify-end">
                {c.leccion_id ? (
                  <button onClick={() => navigate(`/lessons?lessonId=${c.leccion_id}`)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('lessons.card.viewClass', { defaultValue: i18n.language === 'es' ? 'Ver clase' : 'View class' })}</button>
                ) : (
                  <button onClick={() => navigate(`/add-content?contentId=${c.id}`)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">{t('contents.card.edit', { defaultValue: i18n.language === 'es' ? 'Editar contenido' : 'Edit content' })}</button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
