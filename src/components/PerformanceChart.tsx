import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { AnalyticsData, StudentDetail } from '../lib/data/performance';

interface PerformanceChartProps {
  type: 'trends' | 'distribution' | 'evolution';
  data: any;
  loading?: boolean;
}

export default function PerformanceChart({ type, data, loading }: PerformanceChartProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <p className="text-gray-500 text-center py-8">
          {t('teacher.performance.noData') || 'No hay datos para mostrar'}
        </p>
      </div>
    );
  }

  if (type === 'trends') {
    // Gráfico de tendencias de puntajes por prueba
    const chartData = (data as AnalyticsData['pruebas_mejor_desempeno']).map((p) => ({
      name: p.titulo.length > 20 ? p.titulo.substring(0, 20) + '...' : p.titulo,
      promedio: p.promedio,
      aprobados: p.aprobados,
      intentos: p.intentos,
    }));

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('teacher.performance.charts.trends') || 'Tendencias de Puntajes por Prueba'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="promedio" fill="#3b82f6" name={t('teacher.performance.average') || 'Promedio'} />
            <Bar dataKey="aprobados" fill="#10b981" name={t('teacher.performance.approved') || 'Aprobados'} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'distribution') {
    // Gráfico de distribución de resultados
    const analytics = data as AnalyticsData;
    const chartData = [
      {
        name: t('teacher.performance.approved') || 'Aprobados',
        value: analytics.tasa_aprobacion,
        fill: '#10b981',
      },
      {
        name: t('teacher.performance.failed') || 'Reprobados',
        value: analytics.tasa_reprobacion,
        fill: '#ef4444',
      },
    ];

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('teacher.performance.charts.distribution') || 'Distribución de Resultados'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'evolution') {
    // Gráfico de evolución de puntajes de un estudiante
    const evolution = data as StudentDetail['evolucion_puntajes'];
    const chartData = evolution.map((e) => ({
      fecha: new Date(e.fecha).toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric',
      }),
      puntaje: e.puntaje,
      prueba: e.prueba_titulo.length > 15
        ? e.prueba_titulo.substring(0, 15) + '...'
        : e.prueba_titulo,
    }));

    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('teacher.performance.charts.evolution') || 'Evolución de Puntajes'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="puntaje"
              stroke="#3b82f6"
              strokeWidth={2}
              name={t('teacher.performance.score') || 'Puntaje'}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

