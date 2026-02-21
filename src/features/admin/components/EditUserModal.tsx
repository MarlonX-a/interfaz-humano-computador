import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { useEditUser } from '@/features/admin/hooks/useEditUser';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onUpdated: () => void;
}

export default function EditUserModal({ open, onClose, userId, onUpdated }: EditUserModalProps) {
  const { t } = useTranslation();
  const hook = useEditUser({ open, userId, onUpdated, onClose });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('admin.users.edit.title') || 'Editar Usuario'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label={t('close') || 'Cerrar'}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={hook.handleSubmit} className="p-6 space-y-6">
          {hook.loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">{t('admin.users.loading') || 'Cargando usuario...'}</p>
            </div>
          ) : (
            <>
              {/* Advertencia de cambio de rol */}
              {hook.showRoleWarning && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                  <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                      {t('admin.users.warnings.roleChange') ||
                        'Advertencia: Estás cambiando el rol a Administrador. Esto otorgará permisos completos al usuario.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.form.email') || 'Email'} *
                </label>
                <input
                  type="email"
                  value={hook.email}
                  onChange={(e) => hook.setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('admin.users.form.emailNote') ||
                    'Nota: Cambiar el email puede requerir verificación adicional'}
                </p>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.users.form.firstName') || 'Nombre'}
                  </label>
                  <input
                    type="text"
                    value={hook.firstName}
                    onChange={(e) => hook.setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.users.form.lastName') || 'Apellido'}
                  </label>
                  <input
                    type="text"
                    value={hook.lastName}
                    onChange={(e) => hook.setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Nombre para mostrar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.form.displayName') || 'Nombre para Mostrar'}
                </label>
                <input
                  type="text"
                  value={hook.displayName}
                  onChange={(e) => hook.setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.form.phone') || 'Teléfono'}
                </label>
                <input
                  type="tel"
                  value={hook.phone}
                  onChange={(e) => hook.setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.form.role') || 'Rol'} *
                </label>
                <select
                  value={hook.role}
                  onChange={(e) => hook.handleRoleChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="student">{t('register.roles.student') || 'Estudiante'}</option>
                  <option value="teacher">{t('register.roles.teacher') || 'Profesor'}</option>
                  <option value="admin">{t('register.roles.admin') || 'Administrador'}</option>
                </select>
              </div>

              {/* Estado de verificación */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={hook.isVerified}
                  onChange={(e) => hook.setIsVerified(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isVerified" className="text-sm font-medium text-gray-700">
                  {t('admin.users.form.isVerified') || 'Usuario Verificado'}
                </label>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition"
            >
              {t('cancel') || 'Cancelar'}
            </button>
            <button
              type="submit"
              disabled={hook.loading || hook.saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hook.saving
                ? t('admin.users.saving') || 'Guardando...'
                : t('admin.users.save') || 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

