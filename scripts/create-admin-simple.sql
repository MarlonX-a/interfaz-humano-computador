-- Script SQL para crear un usuario administrador
-- Ejecutar este script desde el SQL Editor de Supabase Dashboard
-- O usar: psql con tu conexión a Supabase

-- NOTA: Este script requiere que ejecutes primero el comando para crear el usuario en auth.users
-- usando la API de Supabase o el Dashboard, ya que no podemos crear usuarios directamente en auth.users desde SQL

-- Después de crear el usuario en auth.users, ejecuta este script para actualizar el perfil:

-- 1. Primero, necesitas obtener el ID del usuario que acabas de crear
-- Puedes encontrarlo en: Supabase Dashboard > Authentication > Users

-- 2. Luego ejecuta este UPDATE (reemplaza 'USER_ID_AQUI' con el ID real):
/*
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true,
  updated_at = NOW()
WHERE id = 'USER_ID_AQUI';
*/

-- Alternativa: Si el perfil no existe, créalo:
/*
INSERT INTO profiles (
  id,
  email,
  role,
  first_name,
  last_name,
  display_name,
  terms_accepted,
  terms_accepted_at,
  is_verified,
  created_at,
  updated_at
) VALUES (
  'USER_ID_AQUI',  -- Reemplaza con el ID del usuario de auth.users
  'admin@quimica-uleam.com',
  'admin',
  'Administrador',
  'Sistema',
  'Administrador Sistema',
  true,
  NOW(),
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_verified = true,
  updated_at = NOW();
*/

