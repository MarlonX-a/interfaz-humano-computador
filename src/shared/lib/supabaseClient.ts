import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Track visibility state to prevent session loss when switching windows
let recentlyBecameVisible = false;
let visibilityTimeout: ReturnType<typeof setTimeout> | null = null;

// Listen for visibility changes
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page just became visible - set flag to ignore events for a short period
      recentlyBecameVisible = true;
      // Clear flag after 2 seconds to allow normal operation
      if (visibilityTimeout) clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        recentlyBecameVisible = false;
      }, 2000);
    }
  });
}

// Export function to check if we should ignore auth events
export const shouldIgnoreAuthEvent = (): boolean => {
  return document.hidden || recentlyBecameVisible;
};

// Custom storage wrapper that prevents session clearing during visibility changes
// This fixes the issue where switching windows (Alt+Tab) causes session loss
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage errors
    }
  },
  removeItem: (key: string): void => {
    try {
      // CRITICAL FIX: Only allow removal if:
      // 1. Page is visible AND not recently became visible
      // 2. User explicitly signed out
      const isExplicitSignOut = sessionStorage.getItem('explicitSignOut') === 'true';
      if ((document.hidden || recentlyBecameVisible) && !isExplicitSignOut) {
        console.debug('[Storage] Blocked removeItem - page hidden or recently became visible:', key);
        return;
      }
      localStorage.removeItem(key);
      // Clear the flag after use
      if (isExplicitSignOut) {
        sessionStorage.removeItem('explicitSignOut');
      }
    } catch {
      // ignore storage errors
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,    // Keep tokens fresh
    persistSession: true,      // Persist session in localStorage
    detectSessionInUrl: true,  // Detect OAuth sessions in URL
    storage: customStorage,    // Use custom storage to prevent unwanted session clearing
    storageKey: 'sb-auth-token', // Consistent storage key
  }
});
