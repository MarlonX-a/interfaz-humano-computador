import { supabase } from '../supabaseClient';
import type { UserWithProfile, UserFilters, UserCreateInput, UserUpdateInput, Profile } from '../../types/db';

/**
 * Lista todos los usuarios con sus perfiles
 * Nota: Para obtener información completa de auth.users, puede ser necesario usar Admin API o Edge Functions
 */
export async function listUsers(filters?: UserFilters): Promise<UserWithProfile[]> {
  // Construir la consulta base - sin filtros por defecto para obtener TODOS los usuarios
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  // Aplicar filtros solo si se proporcionan
  if (filters?.role) {
    query = query.eq('role', filters.role);
  }
  if (filters?.is_verified !== undefined) {
    query = query.eq('is_verified', filters.is_verified);
  }
  if (filters?.created_from) {
    query = query.gte('created_at', filters.created_from);
  }
  if (filters?.created_to) {
    query = query.lte('created_at', filters.created_to);
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error('Error fetching users from profiles:', error);
    throw error;
  }

  // Log para depuración
  console.log(`[listUsers] Found ${profiles?.length || 0} profiles in database`);

  // Convertir perfiles a UserWithProfile
  // Nota: No tenemos acceso directo a auth.users desde el cliente
  // Por ahora, usamos solo datos de profiles
  const users: UserWithProfile[] = (profiles || []).map((profile: Profile) => ({
    id: profile.id,
    email: profile.email || '',
    email_confirmed_at: null, // No disponible desde profiles
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_sign_in_at: null, // No disponible desde profiles
    profile: profile,
    is_active: profile.is_verified || false, // Usar is_verified como indicador de activo
  }));

  // Aplicar filtro de búsqueda si existe
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(searchLower) ||
        user.profile?.first_name?.toLowerCase().includes(searchLower) ||
        user.profile?.last_name?.toLowerCase().includes(searchLower) ||
        user.profile?.display_name?.toLowerCase().includes(searchLower)
    );
  }

  // Aplicar filtro de is_active si existe
  if (filters?.is_active !== undefined) {
    return users.filter((user) => user.is_active === filters.is_active);
  }

  return users;
}

/**
 * Obtiene un usuario por su ID
 */
export async function getUser(userId: string): Promise<UserWithProfile | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email || '',
    email_confirmed_at: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_sign_in_at: null,
    profile: profile,
    is_active: profile.is_verified || false,
  };
}

/**
 * Crea un nuevo usuario
 * Nota: Esta función requiere usar Supabase Admin API o Edge Function
 * Por ahora, solo crea el perfil. La creación del usuario en auth.users
 * debe hacerse mediante signUp o Admin API
 */
export async function createUser(userData: UserCreateInput): Promise<UserWithProfile> {
  // Primero crear el usuario en auth (esto requiere Admin API o Edge Function)
  // Por ahora, asumimos que el usuario ya existe en auth.users
  // y solo creamos/actualizamos el perfil

  const profileData = {
    email: userData.email,
    first_name: userData.first_name || null,
    last_name: userData.last_name || null,
    display_name: userData.display_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null,
    phone: userData.phone || null,
    role: userData.role || 'student',
    is_verified: false,
    terms_accepted: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Nota: Para crear el usuario completo, necesitaríamos:
  // 1. Usar Admin API para crear en auth.users
  // 2. Luego crear el perfil
  // Por ahora, esta función solo actualiza el perfil si el usuario ya existe

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;

  return {
    id: profile.id,
    email: profile.email || '',
    email_confirmed_at: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_sign_in_at: null,
    profile: profile,
    is_active: profile.is_verified || false,
  };
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(userId: string, updates: UserUpdateInput): Promise<UserWithProfile> {
  const updateData: Partial<Profile> = {};

  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.first_name !== undefined) updateData.first_name = updates.first_name;
  if (updates.last_name !== undefined) updateData.last_name = updates.last_name;
  if (updates.display_name !== undefined) updateData.display_name = updates.display_name;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.role !== undefined) updateData.role = updates.role;
  if (updates.is_verified !== undefined) updateData.is_verified = updates.is_verified;

  updateData.updated_at = new Date().toISOString();

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Nota: Para actualizar email o password en auth.users, necesitaríamos Admin API
  // Por ahora, solo actualizamos el perfil

  return {
    id: profile.id,
    email: profile.email || '',
    email_confirmed_at: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_sign_in_at: null,
    profile: profile,
    is_active: profile.is_verified || false,
  };
}

/**
 * Elimina un usuario (soft delete o hard delete)
 * Nota: Para eliminar de auth.users, necesitaríamos Admin API o Edge Function
 */
export async function deleteUser(userId: string, hardDelete: boolean = false): Promise<void> {
  if (hardDelete) {
    // Hard delete: eliminar el perfil
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    // Nota: Para eliminar de auth.users, necesitaríamos Admin API
  } else {
    // Soft delete: marcar como inactivo
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
  }
}

/**
 * Actualiza el rol de un usuario
 */
export async function updateUserRole(userId: string, newRole: string): Promise<UserWithProfile> {
  return updateUser(userId, { role: newRole });
}

/**
 * Activa o desactiva un usuario
 */
export async function toggleUserStatus(userId: string, active: boolean): Promise<UserWithProfile> {
  return updateUser(userId, { is_verified: active });
}

