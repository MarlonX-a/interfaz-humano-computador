import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import type { AnalyticsData } from '../lib/data/performance';

interface PerformanceMetricsProps {
  analytics: AnalyticsData;
  loading?: boolean;
}

export default function PerformanceMetrics({ analytics, loading }: PerformanceMetricsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
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
      title: t('teacher.performance.metrics.totalStudents') || 'Total de Estudiantes',
      value: analytics.total_estudiantes,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      title: t('teacher.performance.metrics.averageScore') || 'Promedio de Puntajes',
      value: `${analytics.promedio_puntajes.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-600',
    },
    {
      title: t('teacher.performance.metrics.approvalRate') || 'Tasa de Aprobación',
      value: `${analytics.tasa_aprobacion.toFixed(1)}%`,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    },
    {
      title: t('teacher.performance.metrics.failureRate') || 'Tasa de Reprobación',
      value: `${analytics.tasa_reprobacion.toFixed(1)}%`,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
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

