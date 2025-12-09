import { supabase } from './supabaseClient';
import { toast } from 'react-hot-toast';

export async function signOut(navigate?: (to: string, opts?: any) => void, t?: (k: string) => string) {
  try {
    console.debug('[Auth] signOut: starting');
    const res = await supabase.auth.signOut();
    console.debug('[Auth] signOut response', res);
    if (res?.error) {
      console.warn('[Auth] signOut error', res.error);
      // still proceed with fallback cleanup
    }

    // Wait briefly for session to clear (with timeout to prevent hanging)
    let sessionCleared = false;
    for (let i = 0; i < 6; i++) {
      try {
        const getSessionWithTimeout = (): Promise<{ data: any; error: any }> => {
          return Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: any; error: any }>((resolve) => 
              setTimeout(() => {
                resolve({ data: { session: null }, error: { message: 'timeout' } });
              }, 1000)
            )
          ]);
        };
        
        const { data } = await getSessionWithTimeout();
        if (!data?.session) {
          sessionCleared = true;
          break;
        }
      } catch (err) {
        // If getSession fails, assume session is cleared
        sessionCleared = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    if (!sessionCleared) {
      console.warn('[Auth] fallback: session did not clear after signOut');
      // fallback: clear local storage keys that might keep the UI logged in and navigate to login
      try {
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('sessionActive');
        Object.keys(localStorage).forEach((k) => {
          const key = k.toLowerCase();
          if (key.includes('supabase') || key.includes('sb-') || key.includes('sb:') || key.includes('sb-token') || key.includes('supabase.auth')) {
            localStorage.removeItem(k);
          }
        });
      } catch (err) {
        console.warn('[Auth] cleanup failed', err);
      }
      if (t) toast.error(t('login.signoutError') || 'No se pudo cerrar sesión completamente.');
      if (navigate) navigate('/login', { state: { justSignedOut: true } });
      setTimeout(() => window.location.reload(), 500);
      return { success: false };
    }

    // normal clean up
    try {
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('sessionActive');
      Object.keys(localStorage).forEach((k) => {
        const key = k.toLowerCase();
        if (key.includes('supabase') || key.includes('sb-') || key.includes('sb:') || key.includes('sb-token') || key.includes('supabase.auth')) {
          localStorage.removeItem(k);
        }
      });
      Object.keys(sessionStorage).forEach((k) => {
        const key = k.toLowerCase();
        if (key.includes('supabase') || key.includes('sb-') || key.includes('sb:') || key.includes('sb-token') || key.includes('supabase.auth')) {
          sessionStorage.removeItem(k);
        }
      });
    } catch (err) {
      // ignore
    }

    if (t) toast.success(t('login.signoutSuccess') || 'Sesión cerrada');
    if (navigate) navigate('/login', { state: { justSignedOut: true } });
    return { success: true };
  } catch (err: any) {
    console.error('[Auth] signOut unexpected error', err);
    if (t) toast.error(err?.message || t('login.signoutError') || 'Error cerrando sesión');
    return { success: false, error: err };
  }
}

export function initAuthListener(onChange?: (event: string, session: any) => void) {
  const sub = supabase.auth.onAuthStateChange((event, session) => {
    try {
      if (onChange) onChange(event, session);
      // Update a small session flag for other consumers to read synchronously if needed
      try {
        if (event === 'SIGNED_IN') {
          sessionStorage.setItem('sessionActive', '1');
        } else if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('sessionActive');
        }
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore
    }
  });
  return sub;
}

export default { signOut, initAuthListener };
