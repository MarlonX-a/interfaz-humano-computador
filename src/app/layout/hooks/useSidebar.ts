import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { supabase, shouldIgnoreAuthEvent } from "@/shared/lib/supabaseClient";
import { getProfile } from "@/shared/services/profiles";

interface UseSidebarParams {
  open: boolean;
  setSidebarOpen?: (val: boolean) => void;
  textSizeLarge: boolean;
  setTextSizeLarge: (val: boolean) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  visualAlertsEnabled: boolean;
  voiceReadingEnabled: boolean;
  setVisualAlertsEnabled: (val: boolean) => void;
  setVoiceReadingEnabled: (val: boolean) => void;
}

export function useSidebar({
  open,
  setSidebarOpen,
  textSizeLarge,
  setTextSizeLarge,
  highContrast,
  setHighContrast,
  visualAlertsEnabled,
  voiceReadingEnabled,
  setVisualAlertsEnabled,
  setVoiceReadingEnabled,
}: UseSidebarParams) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const initRef = useRef(false);

  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    aprende: false,
    accesibilidad: false,
  });
  const [profile, setProfile] = useState<any | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const toggleMenu = useCallback((menu: string) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  }, []);

  // Auth listener - only runs once on mount
  useEffect(() => {
    const getProfileFromJWT = (): any | null => {
      try {
        let stored = localStorage.getItem('sb-auth-token');
        if (!stored) {
          const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          if (storageKey) {
            stored = localStorage.getItem(storageKey);
          }
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          const user = parsed?.user;
          if (user) {
            return {
              display_name: user.user_metadata?.display_name || user.user_metadata?.name || null,
              role: user.user_metadata?.role || user.app_metadata?.role || 'student',
              role_requested: null
            };
          }
        }
      } catch (e) {
        console.warn('[Sidebar] Error extracting profile from JWT:', e);
      }
      return null;
    };

    const loadProfile = async (userId: string) => {
      if (shouldIgnoreAuthEvent()) {
        console.debug('[Sidebar] Page not ready, using JWT fallback directly');
        const fallbackProfile = getProfileFromJWT();
        setProfile(fallbackProfile);
        return;
      }

      try {
        const profilePromise = getProfile(userId);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('profile_timeout')), 3000)
        );

        const res = await Promise.race([profilePromise, timeoutPromise]);
        if (!res?.error) {
          setProfile(res.data);
        } else {
          const fallbackProfile = getProfileFromJWT();
          setProfile(fallbackProfile);
        }
      } catch (err: any) {
        console.warn("[Sidebar] profile load error/timeout:", err?.message || err);
        const fallbackProfile = getProfileFromJWT();
        setProfile(fallbackProfile);
      }
    };

    const getStoredSession = () => {
      try {
        let stored = localStorage.getItem('sb-auth-token');
        if (!stored) {
          const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          if (storageKey) {
            stored = localStorage.getItem(storageKey);
          }
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.access_token && parsed?.user) {
            return {
              access_token: parsed.access_token,
              refresh_token: parsed.refresh_token,
              user: parsed.user,
            };
          }
        }
      } catch (err) {
        console.warn('[Sidebar] Error reading stored session:', err);
      }
      return null;
    };

    const init = async () => {
      if (initRef.current) return;

      if (profile) {
        const storedSession = getStoredSession();
        if (storedSession && storedSession.user?.id) {
          initRef.current = true;
          return;
        }
      }

      initRef.current = true;

      try {
        const getSessionWithTimeout = (): Promise<{ data: any; error: any }> => {
          return Promise.race([
            supabase.auth.getSession(),
            new Promise<{ data: any; error: any }>((resolve) =>
              setTimeout(() => {
                resolve({ data: { session: null }, error: { message: 'timeout' } });
              }, 3000)
            )
          ]);
        };

        const { data, error } = await getSessionWithTimeout();
        if (data?.session?.user?.id && !error) {
          await loadProfile(data.session.user.id);
        } else {
          const fallbackProfile = getProfileFromJWT();
          setProfile(fallbackProfile || null);
        }
      } catch (err) {
        console.warn("Sidebar init profile error:", err);
        const fallbackProfile = getProfileFromJWT();
        setProfile(fallbackProfile || null);
      }
    };

    init();

    const { data: subscriptionData } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (shouldIgnoreAuthEvent()) {
        console.debug('[Sidebar] Ignoring', event, '- page not ready for auth events');
        return;
      }

      const storedSession = getStoredSession();

      if (storedSession && profile && storedSession.user?.id) {
        if (event === 'SIGNED_OUT') {
          if (storedSession) {
            console.warn('[Sidebar] Ignoring SIGNED_OUT during navigation - valid token still in localStorage');
            return;
          }
          setProfile(null);
          return;
        }
        console.debug('[Sidebar] Ignoring', event, 'during navigation - profile already exists');
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (storedSession) {
          console.warn('[Sidebar] Ignoring SIGNED_OUT - valid token still in localStorage');
          return;
        }
        setProfile(null);
        return;
      }

      if (event === 'SIGNED_IN') {
        if (sess?.user?.id && !profile) {
          await loadProfile(sess.user.id);
        }
        return;
      }

      if (sess?.user?.id && !profile) {
        await loadProfile(sess.user.id);
      }
    });

    return () => {
      try {
        subscriptionData?.subscription?.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // Sidebar open/close effects
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setSidebarOpen && setSidebarOpen(false);
      }
    };

    const updateBodyOverflow = () => {
      try {
        const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : true;
        if (open && isMobile) {
          document.body.style.overflow = "hidden";
        } else {
          document.body.style.overflow = "";
        }
      } catch (e) {}
    };

    if (open) {
      updateBodyOverflow();
      setTimeout(() => {
        try {
          const focusNode = sidebarRef.current?.querySelector("button, a, input, select, textarea") as HTMLElement | null;
          focusNode?.focus();
        } catch (err) {}
      }, 50);
    } else {
      updateBodyOverflow();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateBodyOverflow);

    return () => {
      try {
        document.body.style.overflow = "";
      } catch (e) {}
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateBodyOverflow);
    };
  }, [open, setSidebarOpen]);

  // Accessibility toggle handlers
  const toggleVisualAlerts = useCallback(() => {
    const newVal = !visualAlertsEnabled;
    setVisualAlertsEnabled(newVal);
    try { localStorage.setItem('visualAlertsEnabled', JSON.stringify(newVal)); } catch (e) {}
    try { (window as any).triggerVisualAlert?.(t('accessibility.visualAlertsToggled') || (newVal ? t('accessibility.visualAlertsEnabled') : t('accessibility.visualAlertsDisabled'))); } catch (e) {}
    const toastMsg = newVal ? t('accessibility.visualAlertsEnabled') : t('accessibility.visualAlertsDisabled');
    try { toast.success(toastMsg); } catch (e) {}
  }, [visualAlertsEnabled, setVisualAlertsEnabled, t]);

  const toggleVoiceReading = useCallback(() => {
    const newVal = !voiceReadingEnabled;
    setVoiceReadingEnabled(newVal);
    try { localStorage.setItem('voiceReadingEnabled', JSON.stringify(newVal)); } catch (e) {}
    try { (window as any).speak?.(t('accessibility.voiceReadingToggled') || (newVal ? t('accessibility.voiceReadingEnabled') : t('accessibility.voiceReadingDisabled'))); } catch (e) {}
    const toastMsg2 = newVal ? t('accessibility.voiceReadingEnabled') : t('accessibility.voiceReadingDisabled');
    try { toast.success(toastMsg2); } catch (e) {}
  }, [voiceReadingEnabled, setVoiceReadingEnabled, t]);

  const toggleTextSize = useCallback(() => {
    const v = !textSizeLarge;
    setTextSizeLarge(v);
    try { localStorage.setItem('textSizeLarge', JSON.stringify(v)); } catch (e) {}
    try { (window as any).triggerVisualAlert?.(t('accessibility.textSizeToggled') || (v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled'))); } catch (e) {}
    try { (window as any).speak?.(t('accessibility.textSizeToggled') || (v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled'))); } catch (e) {}
    const toastMsg3 = v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled');
    try { toast.success(toastMsg3); } catch (e) {}
  }, [textSizeLarge, setTextSizeLarge, t]);

  const toggleHighContrast = useCallback(() => {
    const v = !highContrast;
    setHighContrast(v);
    try { localStorage.setItem('highContrast', JSON.stringify(v)); } catch (e) {}
    try { (window as any).triggerVisualAlert?.(t('accessibility.highContrastToggled') || (v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled'))); } catch (e) {}
    try { (window as any).speak?.(t('accessibility.highContrastToggled') || (v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled'))); } catch (e) {}
    const toastMsg4 = v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled');
    try { toast.success(toastMsg4); } catch (e) {}
  }, [highContrast, setHighContrast, t]);

  return {
    t,
    navigate,
    sidebarRef,
    openMenus,
    profile,
    helpOpen, setHelpOpen,
    toggleMenu,
    toggleVisualAlerts,
    toggleVoiceReading,
    toggleTextSize,
    toggleHighContrast,
  };
}
