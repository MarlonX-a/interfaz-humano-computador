import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Client with autoRefreshToken disabled to prevent automatic token refresh on visibility change
// This prevents Supabase from trying to refresh tokens when switching windows, which was causing
// session loss. Token refresh can be done manually when needed.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,  // Disable automatic token refresh
    persistSession: true,      // Still persist session in localStorage
    detectSessionInUrl: true   // Still detect OAuth sessions in URL
  }
});
