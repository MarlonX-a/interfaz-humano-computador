import { supabase } from '@/shared/lib/supabaseClient';

export const getProfile = async (userId: string) => {
  return await supabase.from('profiles').select('role, role_requested, display_name').eq('id', userId).single();
};