# Crear Usuario Administrador

Este documento explica cómo crear un usuario administrador para la aplicación.

## Método 1: Usando el Script Node.js (Recomendado)

### Requisitos previos

1. Tener `VITE_SUPABASE_URL` en tu archivo `.env` o `.env.local`
2. Tener `SUPABASE_SERVICE_ROLE_KEY` en tu archivo `.env` o `.env.local`

   **⚠️ IMPORTANTE:** Necesitas la **Service Role Key**, no la anon key.
   
   Puedes obtenerla desde:
   - Supabase Dashboard > Settings > API > service_role key
   - ⚠️ Esta clave tiene permisos completos, guárdala de forma segura

### Pasos

1. Asegúrate de tener las variables de entorno configuradas:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
   ```

2. Ejecuta el script:
   ```bash
   node scripts/create-admin-user.js
   ```

3. El script te mostrará las credenciales:
   ```
   ✅ Usuario administrador creado exitosamente!
   
   📧 Credenciales de acceso:
      Email: admin@quimica-uleam.com
      Password: Admin123!@#
   ```

4. **IMPORTANTE:** Cambia la contraseña después del primer inicio de sesión.

## Método 2: Desde Supabase Dashboard

### Pasos

1. Ve a **Supabase Dashboard > Authentication > Users**
2. Haz clic en **"Add user"** o **"Invite user"**
3. Completa el formulario:
   - **Email:** `admin@quimica-uleam.com`
   - **Password:** (elige una contraseña segura)
   - Marca **"Auto Confirm User"** para que no necesite confirmar email
4. Haz clic en **"Create user"**
5. Copia el **User ID** del usuario recién creado
6. Ve a **SQL Editor** en Supabase Dashboard
7. Ejecuta este SQL (reemplaza `USER_ID_AQUI` con el ID real):

```sql
UPDATE profiles
SET 
  role = 'admin',
  is_verified = true,
  updated_at = NOW()
WHERE id = 'USER_ID_AQUI';

-- Si el perfil no existe, usa este INSERT en su lugar:
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
  'USER_ID_AQUI',
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
```

## Credenciales por Defecto (Script)

Si usas el script Node.js, las credenciales por defecto son:

- **Email:** `admin@quimica-uleam.com`
- **Password:** `Admin123!@#`

⚠️ **CAMBIA ESTAS CREDENCIALES INMEDIATAMENTE** después del primer inicio de sesión por seguridad.

## Verificar que el Usuario es Admin

1. Inicia sesión con las credenciales
2. Deberías ver opciones adicionales en el sidebar:
   - "Mis contenidos"
   - "Pruebas"
   - "Panel de Desempeño"
3. Puedes verificar en la base de datos:

```sql
SELECT id, email, role, display_name 
FROM profiles 
WHERE email = 'admin@quimica-uleam.com';
```

Deberías ver `role = 'admin'`.

## Solución de Problemas

### Error: "Faltan variables de entorno"
- Asegúrate de tener `.env` o `.env.local` con las variables necesarias
- Verifica que los nombres de las variables sean correctos

### Error: "Usuario ya existe"
- El script detectará si el usuario ya existe y lo actualizará a admin
- Si quieres crear uno nuevo, cambia el email en el script

### El usuario no tiene permisos de admin
- Verifica que el perfil tenga `role = 'admin'` en la tabla `profiles`
- Ejecuta el SQL de actualización manualmente si es necesario

