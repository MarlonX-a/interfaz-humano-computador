/**
 * Script para crear un usuario administrador
 * Ejecutar con: node scripts/create-admin-user.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  console.log('\n📝 Nota: Para crear un usuario admin, necesitas:');
  console.log('   1. VITE_SUPABASE_URL en tu archivo .env');
  console.log('   2. SUPABASE_SERVICE_ROLE_KEY en tu archivo .env (clave de servicio, no la anon key)');
  console.log('\n   Puedes obtener la Service Role Key desde:');
  console.log('   Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

// Crear cliente con service role key para tener permisos completos
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Credenciales del administrador
// ⚠️ CAMBIA ESTAS CREDENCIALES POR SEGURIDAD después del primer login
const adminEmail = 'admin@quimica-uleam.com';
const adminPassword = 'Admin123!@#'; // ⚠️ Cambia esta contraseña después del primer login
const adminFirstName = 'Administrador';
const adminLastName = 'Sistema';

async function createAdminUser() {
  try {
    console.log('🔄 Creando usuario administrador...\n');

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        firstName: adminFirstName,
        lastName: adminLastName,
        displayName: `${adminFirstName} ${adminLastName}`,
        role: 'admin'
      }
    });

    if (authError) {
      // Si el usuario ya existe, intentar actualizar
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        console.log('⚠️  El usuario ya existe. Obteniendo información...\n');
        
        // Buscar usuario existente
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === adminEmail);
        if (!existingUser) {
          throw new Error('Usuario existe pero no se pudo encontrar');
        }

        // Actualizar perfil a admin
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', existingUser.id);

        if (profileError) throw profileError;

        console.log('✅ Usuario actualizado a administrador\n');
        console.log('📧 Credenciales:');
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}\n`);
        console.log('⚠️  NOTA: Si no recuerdas la contraseña, puedes resetearla desde Supabase Dashboard');
        return;
      }
      throw authError;
    }

    if (!authData?.user) {
      throw new Error('No se pudo crear el usuario');
    }

    const userId = authData.user.id;

    // 2. Actualizar perfil con rol de admin
    // El trigger debería crear el perfil automáticamente, pero lo actualizamos por si acaso
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: adminEmail,
        role: 'admin',
        first_name: adminFirstName,
        last_name: adminLastName,
        display_name: `${adminFirstName} ${adminLastName}`,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.warn('⚠️  Advertencia al actualizar perfil:', profileError.message);
      console.log('   El perfil puede haberse creado automáticamente por el trigger\n');
    }

    console.log('✅ Usuario administrador creado exitosamente!\n');
    console.log('📧 Credenciales de acceso:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}\n`);
    console.log('🔐 IMPORTANTE: Guarda estas credenciales en un lugar seguro');
    console.log('   Y cambia la contraseña después del primer inicio de sesión\n');

  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error.message);
    console.error('\nDetalles:', error);
    process.exit(1);
  }
}

createAdminUser();

