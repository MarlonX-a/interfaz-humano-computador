import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUser, getUser } from '../lib/data/users';
import type { UserWithProfile, UserUpdateInput } from '../types/db';

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
  onUpdated: () => void;
}

export default function EditUserModal({ open, onClose, userId, onUpdated }: EditUserModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const [originalRole, setOriginalRole] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('student');
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (open && userId) {
      loadUser();
    } else {
      resetForm();
    }
  }, [open, userId]);

  const loadUser = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const userData = await getUser(userId);
      if (userData) {
        setUser(userData);
        setEmail(userData.email);
        setFirstName(userData.profile?.first_name || '');
        setLastName(userData.profile?.last_name || '');
        setDisplayName(userData.profile?.display_name || '');
        setPhone(userData.profile?.phone || '');
        setRole(userData.profile?.role || 'student');
        setIsVerified(userData.profile?.is_verified || false);
        setOriginalRole(userData.profile?.role || 'student');
      }
    } catch (error: any) {
      console.error('Error loading user:', error);
      toast.error(error?.message || t('admin.users.errors.loadError') || 'Error al cargar usuario');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setDisplayName('');
    setPhone('');
    setRole('student');
    setIsVerified(false);
    setUser(null);
    setShowRoleWarning(false);
    setOriginalRole(null);
  };

  const handleRoleChange = (newRole: string) => {
    if (newRole === 'admin' && originalRole !== 'admin') {
      setShowRoleWarning(true);
    } else {
      setShowRoleWarning(false);
    }
    setRole(newRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    // Validación
    if (!email.trim()) {
      toast.error(t('admin.users.errors.emailRequired') || 'El email es requerido');
      return;
    }

    setSaving(true);
    try {
      const updates: UserUpdateInput = {
        email: email.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        display_name: displayName.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role,
        is_verified: isVerified,
      };

      await updateUser(userId, updates);
      toast.success(t('admin.users.success.updated') || 'Usuario actualizado exitosamente');
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error?.message || t('admin.users.errors.updateError') || 'Error al actualizar usuario');
    } finally {
      setSaving(false);
    }
  };

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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">{t('admin.users.loading') || 'Cargando usuario...'}</p>
            </div>
          ) : (
            <>
              {/* Advertencia de cambio de rol */}
              {showRoleWarning && (
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.users.form.lastName') || 'Apellido'}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
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
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.users.form.role') || 'Rol'} *
                </label>
                <select
                  value={role}
                  onChange={(e) => handleRoleChange(e.target.value)}
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
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
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
              disabled={loading || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? t('admin.users.saving') || 'Guardando...'
                : t('admin.users.save') || 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

