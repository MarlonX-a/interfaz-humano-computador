import { useState } from 'react';
import { X, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { UserFilters } from '../types/db';

interface UserFiltersProps {
  filters: UserFilters;
  onFiltersChange: (filters: UserFilters) => void;
}

export default function UserFiltersComponent({ filters, onFiltersChange }: UserFiltersProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (key: keyof UserFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' || value === null ? undefined : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key as keyof UserFilters] !== undefined
  );

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition"
      >
        <Filter size={18} />
        <span>{t('admin.users.filters.title') || 'Filtros'}</span>
        {hasActiveFilters && (
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
            {Object.keys(filters).filter((k) => filters[k as keyof UserFilters] !== undefined).length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por rol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.filters.role') || 'Rol'}
              </label>
              <select
                value={filters.role || ''}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('admin.users.filters.allRoles') || 'Todos'}</option>
                <option value="student">{t('register.roles.student') || 'Estudiante'}</option>
                <option value="teacher">{t('register.roles.teacher') || 'Profesor'}</option>
                <option value="admin">{t('register.roles.admin') || 'Administrador'}</option>
              </select>
            </div>

            {/* Filtro por estado de verificación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.filters.verificationStatus') || 'Estado de Verificación'}
              </label>
              <select
                value={filters.is_verified !== undefined ? String(filters.is_verified) : ''}
                onChange={(e) =>
                  handleFilterChange('is_verified', e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('admin.users.filters.all') || 'Todos'}</option>
                <option value="true">{t('admin.users.filters.verified') || 'Verificado'}</option>
                <option value="false">{t('admin.users.filters.notVerified') || 'No Verificado'}</option>
              </select>
            </div>

            {/* Filtro por estado activo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.filters.activeStatus') || 'Estado Activo'}
              </label>
              <select
                value={filters.is_active !== undefined ? String(filters.is_active) : ''}
                onChange={(e) =>
                  handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('admin.users.filters.all') || 'Todos'}</option>
                <option value="true">{t('admin.users.filters.active') || 'Activo'}</option>
                <option value="false">{t('admin.users.filters.inactive') || 'Inactivo'}</option>
              </select>
            </div>

            {/* Filtro por fecha desde */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.filters.dateFrom') || 'Fecha Desde'}
              </label>
              <input
                type="date"
                value={filters.created_from || ''}
                onChange={(e) => handleFilterChange('created_from', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por fecha hasta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.filters.dateTo') || 'Fecha Hasta'}
              </label>
              <input
                type="date"
                value={filters.created_to || ''}
                onChange={(e) => handleFilterChange('created_to', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition"
              >
                <X size={16} />
                <span>{t('admin.users.filters.clear') || 'Limpiar Filtros'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

