import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '@/shared/lib/supabaseClient';
import type { UserCreateInput } from '@/shared/types';

interface UseCreateUserParams {
  open: boolean;
  onCreated: () => void;
  onClose: () => void;
}

export function useCreateUser({ open, onCreated, onClose }: UseCreateUserParams) {
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

  const resetForm = useCallback(() => {
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
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleRoleChange = useCallback((newRole: string) => {
    if (newRole === 'admin') {
      setShowRoleWarning(true);
    } else {
      setShowRoleWarning(false);
    }
    setRole(newRole);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

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
          email_redirect_to: undefined,
        },
      });

      if (signUpError) {
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

      const userData: UserCreateInput = {
        email: email.trim(),
        password: password,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        display_name: displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role,
        send_verification_email: sendVerificationEmail,
      };

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
            is_verified: sendVerificationEmail ? false : true,
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
  }, [email, password, confirmPassword, firstName, lastName, displayName, phone, role, sendVerificationEmail, t, onCreated, onClose]);

  return {
    saving,
    showRoleWarning,
    email, setEmail,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    firstName, setFirstName,
    lastName, setLastName,
    displayName, setDisplayName,
    phone, setPhone,
    role,
    sendVerificationEmail, setSendVerificationEmail,
    handleRoleChange,
    handleSubmit,
    t,
  };
}
