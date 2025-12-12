import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, BookOpen, FileText, ClipboardCheck, TrendingUp, CheckCircle, Activity, GraduationCap } from 'lucide-react';
import type { DashboardStats } from '../../types/db';

interface DashboardKPIsProps {
  stats: DashboardStats;
  loading?: boolean;
}

export default function DashboardKPIs({ stats, loading }: DashboardKPIsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: t('admin.dashboard.kpis.totalUsers') || 'Total Usuarios',
      value: stats.total_users,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: t('admin.dashboard.kpis.totalTeachers') || 'Total Profesores',
      value: stats.total_teachers,
      icon: GraduationCap,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
    {
      title: t('admin.dashboard.kpis.totalStudents') || 'Total Estudiantes',
      value: stats.total_students,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      title: t('admin.dashboard.kpis.totalLessons') || 'Total Lecciones',
      value: stats.total_lessons,
      icon: BookOpen,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
    },
    {
      title: t('admin.dashboard.kpis.totalContents') || 'Total Contenidos',
      value: stats.total_contents,
      icon: FileText,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
    },
    {
      title: t('admin.dashboard.kpis.totalPruebas') || 'Total Pruebas',
      value: stats.total_pruebas,
      icon: ClipboardCheck,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
    },
    {
      title: t('admin.dashboard.kpis.approvalRate') || 'Tasa de Aprobación',
      value: `${stats.approval_rate.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    },
    {
      title: t('admin.dashboard.kpis.monthlyActivity') || 'Actividad del Mes',
      value: stats.monthly_activity,
      icon: Activity,
      color: 'bg-pink-500',
      textColor: 'text-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{metric.title}</p>
              <div className={`${metric.color} p-2 rounded-lg`}>
                <Icon size={20} className="text-white" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${metric.textColor}`}>
              {metric.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

