import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';

export default function TeacherQuestions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    const ensure = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { navigate('/login'); return; }
        const { data: profile } = await getProfile(session.user.id);
        const role = profile?.role || session.user.user_metadata?.role || null;
        if (!['teacher','admin'].includes(role)) { navigate('/login'); return; }
        const { data, error } = await supabase.from('pregunta').select('id,leccion_id,texto,tipo');
        if (!error) setQuestions(data || []);
      } finally { setCheckingAuth(false); }
    };
    ensure();
  }, [navigate]);

  if (checkingAuth) return <div className="text-center p-8">{t('loading') || 'Cargando...'}</div>;

  return (
    <main className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{t('teacher.questions') || 'Questions'}</h1>
        <button onClick={() => navigate('/add-content')} className="px-3 py-1 bg-blue-600 text-white rounded">{t('teacher.newQuestion') || 'New Question'}</button>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {questions.map(q => (
          <div key={q.id} className='bg-white rounded shadow p-4'>
            <div className='text-sm text-gray-700'>{q.texto}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
