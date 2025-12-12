import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function TeacherLessons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lessons, setLessons] = useState<any[]>([]);

  useEffect(() => {
    const ensure = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { navigate('/login'); return; }
        const { data: profile } = await getProfile(session.user.id);
        const role = profile?.role || session.user.user_metadata?.role || null;
        if (!['teacher','admin'].includes(role)) { navigate('/login'); return; }
        // fetch all lessons for CRUD list
        const { data, error } = await supabase.from('leccion').select('id,titulo,descripcion,nivel,thumbnail_url,created_at').order('created_at', { ascending: false });
        if (error) { console.error(error); toast.error(t('teacher.errors.loadLessons') || 'Error loading'); }
        setLessons(data || []);
      } finally { setCheckingAuth(false); }
    };
    ensure();
  }, [navigate]);

  if (checkingAuth) return <div className="text-center p-8">{t('loading') || 'Cargando...'}</div>;

  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('teacher.lessons') || 'Lessons'}</h1>
        <button onClick={() => navigate('/add-content')} className="px-3 py-1 bg-blue-600 text-white rounded">{t('teacher.newLesson') || 'New Lesson'}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((l) => (
          <div key={l.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold">{l.titulo}</h3>
            <p className="text-sm text-gray-500">{l.descripcion}</p>
            <div className="flex justify-end mt-2 gap-2">
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => navigate(`/add-content?lessonId=${l.id}`)}>{t('teacher.edit') || 'Edit'}</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
