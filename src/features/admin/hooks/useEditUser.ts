import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { updateUser, getUser } from '@/features/admin/services/users';
import type { UserWithProfile, UserUpdateInput } from '@/shared/types';

interface UseEditUserParams {
  open: boolean;
  userId: string | null;
  onUpdated: () => void;
  onClose: () => void;
}

export function useEditUser({ open, userId, onUpdated, onClose }: UseEditUserParams) {
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

  const resetForm = useCallback(() => {
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
  }, []);

  const loadUser = useCallback(async () => {
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
  }, [userId, t]);

  useEffect(() => {
    if (open && userId) {
      loadUser();
    } else {
      resetForm();
    }
  }, [open, userId]);

  const handleRoleChange = useCallback((newRole: string) => {
    if (newRole === 'admin' && originalRole !== 'admin') {
      setShowRoleWarning(true);
    } else {
      setShowRoleWarning(false);
    }
    setRole(newRole);
  }, [originalRole]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

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
  }, [userId, email, firstName, lastName, displayName, phone, role, isVerified, t, onUpdated, onClose]);

  return {
    loading,
    saving,
    user,
    showRoleWarning,
    email, setEmail,
    firstName, setFirstName,
    lastName, setLastName,
    displayName, setDisplayName,
    phone, setPhone,
    role,
    isVerified, setIsVerified,
    handleRoleChange,
    handleSubmit,
    t,
  };
}
