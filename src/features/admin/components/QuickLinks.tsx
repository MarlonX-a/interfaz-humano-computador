import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, ClipboardCheck, BarChart3, Settings, Plus, Box } from 'lucide-react';

export default function QuickLinks() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const links = [
    {
      title: t('admin.dashboard.quickLinks.users') || 'Gestión de Usuarios',
      description: t('admin.dashboard.quickLinks.usersDesc') || 'Administrar todos los usuarios del sistema',
      icon: Users,
      color: 'bg-blue-500',
      route: '/admin/users',
    },
    {
      title: t('admin.modelos.title') || 'Modelos RA',
      description: t('admin.modelos.subtitle') || 'Administra los modelos de Realidad Aumentada',
      icon: Box,
      color: 'bg-cyan-500',
      route: '/admin/modelos',
    },
    {
      title: t('admin.dashboard.quickLinks.contents') || 'Todos los Contenidos',
      description: t('admin.dashboard.quickLinks.contentsDesc') || 'Ver y gestionar todos los contenidos',
      icon: BookOpen,
      color: 'bg-indigo-500',
      route: '/teacher/contents',
    },
    {
      title: t('admin.dashboard.quickLinks.pruebas') || 'Todas las Pruebas',
      description: t('admin.dashboard.quickLinks.pruebasDesc') || 'Ver y gestionar todas las pruebas',
      icon: ClipboardCheck,
      color: 'bg-orange-500',
      route: '/teacher/pruebas',
    },
    {
      title: t('admin.dashboard.quickLinks.performance') || 'Panel de Desempeño',
      description: t('admin.dashboard.quickLinks.performanceDesc') || 'Ver desempeño de todos los estudiantes',
      icon: BarChart3,
      color: 'bg-green-500',
      route: '/teacher/performance',
    },
    {
      title: t('admin.dashboard.quickLinks.addContent') || 'Añadir Contenido',
      description: t('admin.dashboard.quickLinks.addContentDesc') || 'Crear nuevo contenido o lección',
      icon: Plus,
      color: 'bg-purple-500',
      route: '/add-content',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {t('admin.dashboard.quickLinks.title') || 'Enlaces Rápidos'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link, index) => {
          const Icon = link.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(link.route)}
              className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition text-left"
            >
              <div className={`${link.color} p-3 rounded-lg`}>
                <Icon size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {link.title}
                </h4>
                <p className="text-xs text-gray-500">
                  {link.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

