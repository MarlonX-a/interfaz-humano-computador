import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SystemTrends } from '../../types/db';

interface DashboardChartsProps {
  trends: SystemTrends;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function DashboardCharts({ trends, loading }: DashboardChartsProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Preparar datos para gráfico de distribución de roles
  const roleData = trends.role_distribution.map((r) => ({
    name: t(`register.roles.${r.role}`) || r.role,
    value: r.count,
  }));

  return (
    <div className="space-y-6 mb-6">
      {/* Primera fila: Crecimiento de usuarios y Actividad de pruebas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento de usuarios por mes */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.userGrowth') || 'Crecimiento de Usuarios'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.user_growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                name={t('admin.dashboard.charts.newUsers') || 'Nuevos Usuarios'}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Actividad de pruebas por mes */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.pruebaActivity') || 'Actividad de Pruebas'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends.prueba_activity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8b5cf6" name={t('admin.dashboard.charts.totalAttempts') || 'Total Intentos'} />
              <Bar dataKey="aprobados" fill="#10b981" name={t('admin.dashboard.charts.approved') || 'Aprobados'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segunda fila: Completación de lecciones y Distribución de roles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completación de lecciones por mes */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.lessonCompletion') || 'Completación de Lecciones'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends.lesson_completion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#10b981" name={t('admin.dashboard.charts.completed') || 'Completadas'} />
              <Bar dataKey="in_progress" fill="#f59e0b" name={t('admin.dashboard.charts.inProgress') || 'En Progreso'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución de roles */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.roleDistribution') || 'Distribución de Roles'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tercera fila: Top lecciones y Top pruebas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 lecciones más completadas */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.topLessons') || 'Top 5 Lecciones Más Completadas'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={trends.top_lessons}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="titulo" type="category" width={90} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completadas" fill="#3b82f6" name={t('admin.dashboard.charts.completions') || 'Completaciones'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 pruebas con mejor desempeño */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('admin.dashboard.charts.topPruebas') || 'Top 5 Pruebas con Mejor Desempeño'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={trends.top_pruebas}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="titulo" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="promedio" fill="#10b981" name={t('admin.dashboard.charts.average') || 'Promedio (%)'} />
              <Bar dataKey="intentos" fill="#8b5cf6" name={t('admin.dashboard.charts.attempts') || 'Intentos'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

