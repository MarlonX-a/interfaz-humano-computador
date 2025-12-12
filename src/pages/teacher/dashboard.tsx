import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const ensure = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) { navigate('/login'); return; }
        const { data: profile } = await getProfile(session.user.id);
        const role = profile?.role || session.user.user_metadata?.role || null;
        if (!['teacher','admin','student'].includes(role)) { navigate('/login'); return; }
      } finally { setCheckingAuth(false); }
    };
    ensure();
  }, [navigate]);

  if (checkingAuth) return <div className="text-center p-8">{t('loading') || 'Cargando...'}</div>;

  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{t('teacher.dashboardTitle') || 'Teacher Dashboard'}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4"> <h3 className="font-semibold">{t('teacher.lessons') || 'Lessons CRUD'}</h3></div>
        <div className="bg-white rounded-lg shadow p-4"> <h3 className="font-semibold">{t('teacher.contents') || 'Contents CRUD'}</h3></div>
        <div className="bg-white rounded-lg shadow p-4"> <h3 className="font-semibold">{t('teacher.questions') || 'Questions & Answers CRUD'}</h3></div>
        <div className="bg-white rounded-lg shadow p-4"> <h3 className="font-semibold">{t('teacher.performance') || 'Student Performance Panel'}</h3></div>
      </div>
    </main>
  );
}
