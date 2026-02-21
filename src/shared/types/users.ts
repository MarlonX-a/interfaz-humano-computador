// ─────────────────────────────────────────────────────────────
// Tipos para gestión de usuarios
// ─────────────────────────────────────────────────────────────

/** Tabla: profiles */
export interface Profile {
  id: string; // UUID de auth.users
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  role: string; // 'student' | 'teacher' | 'admin'
  role_requested: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  is_verified: boolean;
  thumbnail_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
}

/** Usuario completo con datos de auth.users y profiles */
export interface UserWithProfile {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  // Datos del perfil
  profile: Profile | null;
  // Estado calculado
  is_active: boolean; // basado en email_confirmed_at o metadata
}

/** Filtros para búsqueda de usuarios */
export interface UserFilters {
  search?: string; // búsqueda por email, nombre
  role?: string; // 'student' | 'teacher' | 'admin'
  is_verified?: boolean;
  is_active?: boolean;
  created_from?: string; // fecha ISO
  created_to?: string; // fecha ISO
}

/** Input para crear usuario */
export interface UserCreateInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  role?: string; // 'student' | 'teacher' | 'admin'
  send_verification_email?: boolean;
}

/** Input para actualizar usuario */
export interface UserUpdateInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  role?: string;
  is_verified?: boolean;
  // Para actualizar password (requiere confirmación)
  password?: string;
}
