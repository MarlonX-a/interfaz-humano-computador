import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  getDashboardStats,
  getRecentActivity,
  getSystemTrends,
  getPerformanceOverview,
} from '../../lib/data/adminDashboard';
import type {
  DashboardStats,
  RecentActivity,
  SystemTrends,
  PerformanceOverview,
} from '../../types/db';
import DashboardKPIs from '../../components/admin/DashboardKPIs';
import DashboardCharts from '../../components/admin/DashboardCharts';
import RecentActivityComponent from '../../components/admin/RecentActivity';
import QuickLinks from '../../components/admin/QuickLinks';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [trends, setTrends] = useState<SystemTrends | null>(null);
  const [performance, setPerformance] = useState<PerformanceOverview | null>(null);

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
        if (role !== 'admin') {
          navigate('/login');
          return;
        }
        await loadDashboardData();
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('admin.dashboard.errors.loadError') || 'Error al cargar dashboard');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [navigate, t]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, activityData, trendsData, performanceData] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(),
        getSystemTrends(),
        getPerformanceOverview(),
      ]);

      setStats(statsData);
      setActivity(activityData);
      setTrends(trendsData);
      setPerformance(performanceData);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error(error?.message || t('admin.dashboard.errors.loadError') || 'Error al cargar datos del dashboard');
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

  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('admin.dashboard.title') || 'Dashboard General'}
        </h1>
        <p className="text-gray-600">
          {currentDate}
        </p>
      </div>

      {/* KPIs */}
      <DashboardKPIs stats={stats || {
        total_users: 0,
        total_admins: 0,
        total_teachers: 0,
        total_students: 0,
        total_lessons: 0,
        total_contents: 0,
        total_pruebas: 0,
        total_resultados: 0,
        total_progreso: 0,
        approval_rate: 0,
        monthly_activity: 0,
      }} loading={loading} />

      {/* Enlaces Rápidos */}
      <QuickLinks />

      {/* Actividad Reciente */}
      {activity && (
        <RecentActivityComponent
          activity={activity}
          loading={loading}
        />
      )}

      {/* Gráficos */}
      {trends && (
        <DashboardCharts
          trends={trends}
          loading={loading}
        />
      )}
    </main>
  );
}

