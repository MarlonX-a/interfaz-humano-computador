import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createUser } from '../lib/data/users';
import { supabase } from '../lib/supabaseClient';
import type { UserCreateInput } from '../types/db';

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showRoleWarning, setShowRoleWarning] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('student');
  const [sendVerificationEmail, setSendVerificationEmail] = useState(true);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setDisplayName('');
    setPhone('');
    setRole('student');
    setSendVerificationEmail(true);
    setShowRoleWarning(false);
  };

  const handleRoleChange = (newRole: string) => {
    if (newRole === 'admin') {
      setShowRoleWarning(true);
    } else {
      setShowRoleWarning(false);
    }
    setRole(newRole);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!email.trim()) {
      toast.error(t('admin.users.errors.emailRequired') || 'El email es requerido');
      return;
    }

    if (!password.trim()) {
      toast.error(t('admin.users.errors.passwordRequired') || 'La contraseña es requerida');
      return;
    }

    if (password.length < 6) {
      toast.error(t('admin.users.errors.passwordMinLength') || 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('admin.users.errors.passwordMismatch') || 'Las contraseñas no coinciden');
      return;
    }

    setSaving(true);
    try {
      // Primero crear el usuario en auth.users usando signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            displayName: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim(),
            role: role,
          },
          email_redirect_to: undefined, // No redirigir, el admin crea el usuario
        },
      });

      if (signUpError) {
        // Si el usuario ya existe, intentar actualizar el perfil
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already exists')) {
          toast.error(t('admin.users.errors.userExists') || 'El usuario ya existe');
          setSaving(false);
          return;
        }
        throw signUpError;
      }

      if (!signUpData?.user?.id) {
        throw new Error('No se pudo crear el usuario');
      }

      const userId = signUpData.user.id;

      // Crear/actualizar el perfil
      const userData: UserCreateInput = {
        email: email.trim(),
        password: password, // No se guarda, solo para referencia
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        display_name: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role,
        send_verification_email: sendVerificationEmail,
      };

      // Actualizar el perfil con el ID del usuario creado
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: userData.email,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            display_name: userData.display_name || null,
            phone: userData.phone || null,
            role: userData.role,
            is_verified: sendVerificationEmail ? false : true, // Si no se envía email, verificar directamente
            terms_accepted: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (profileError) {
        throw profileError;
      }

      toast.success(t('admin.users.success.created') || 'Usuario creado exitosamente');
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error?.message || t('admin.users.errors.createError') || 'Error al crear usuario');
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
            {t('admin.users.create.title') || 'Crear Nuevo Usuario'}
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
          {/* Advertencia de rol admin */}
          {showRoleWarning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  {t('admin.users.warnings.adminRole') ||
                    'Advertencia: Estás creando un usuario con rol de Administrador. Esto otorgará permisos completos al usuario.'}
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
          </div>

          {/* Contraseñas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.form.password') || 'Contraseña'} *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('admin.users.form.passwordMinLength') || 'Mínimo 6 caracteres'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.users.form.confirmPassword') || 'Confirmar Contraseña'} *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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

          {/* Enviar email de verificación */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="sendVerificationEmail"
              checked={sendVerificationEmail}
              onChange={(e) => setSendVerificationEmail(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="sendVerificationEmail" className="text-sm font-medium text-gray-700">
              {t('admin.users.form.sendVerificationEmail') || 'Enviar email de verificación'}
            </label>
          </div>

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
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? t('admin.users.creating') || 'Creando...'
                : t('admin.users.create.button') || 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

