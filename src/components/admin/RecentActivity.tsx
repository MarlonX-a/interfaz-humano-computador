import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, FileText, ClipboardCheck, ArrowRight } from 'lucide-react';
import type { RecentActivity as RecentActivityType } from '../../types/db';

interface RecentActivityProps {
  activity: RecentActivityType;
  loading?: boolean;
}

export default function RecentActivity({ activity, loading }: RecentActivityProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow p-6 border border-gray-200 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-3 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Usuarios recientes */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <Users className="text-blue-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.dashboard.activity.recentUsers') || 'Usuarios Recientes'}
          </h3>
        </div>
        <div className="space-y-3">
          {activity.recent_users.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('admin.dashboard.activity.noUsers') || 'No hay usuarios recientes'}
            </p>
          ) : (
            activity.recent_users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition"
                onClick={() => navigate(`/admin/users`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.display_name || user.email || t('admin.users.table.noEmail') || 'Sin nombre'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(user.created_at)}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-400 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lecciones recientes */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <BookOpen className="text-indigo-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.dashboard.activity.recentLessons') || 'Lecciones Recientes'}
          </h3>
        </div>
        <div className="space-y-3">
          {activity.recent_lessons.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('admin.dashboard.activity.noLessons') || 'No hay lecciones recientes'}
            </p>
          ) : (
            activity.recent_lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition"
                onClick={() => navigate(`/lesson/${lesson.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {lesson.titulo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(lesson.created_at)}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-400 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Contenidos recientes */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="text-yellow-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.dashboard.activity.recentContents') || 'Contenidos Recientes'}
          </h3>
        </div>
        <div className="space-y-3">
          {activity.recent_contents.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('admin.dashboard.activity.noContents') || 'No hay contenidos recientes'}
            </p>
          ) : (
            activity.recent_contents.map((content) => (
              <div
                key={content.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition"
                onClick={() => navigate(`/contenido/${content.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {content.titulo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(content.updated_at || content.created_at)}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-400 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pruebas recientes */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center space-x-2 mb-4">
          <ClipboardCheck className="text-orange-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin.dashboard.activity.recentPruebas') || 'Pruebas Recientes'}
          </h3>
        </div>
        <div className="space-y-3">
          {activity.recent_pruebas.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('admin.dashboard.activity.noPruebas') || 'No hay pruebas recientes'}
            </p>
          ) : (
            activity.recent_pruebas.map((prueba) => (
              <div
                key={prueba.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer transition"
                onClick={() => navigate(`/teacher/pruebas`)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {prueba.titulo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(prueba.created_at)}
                  </p>
                </div>
                <ArrowRight size={16} className="text-gray-400 ml-2" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

