import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, shouldIgnoreAuthEvent } from "@/shared/lib/supabaseClient";
import { signOut as libSignOut } from "@/shared/lib/auth";
import { getProfile } from "@/shared/services/profiles";
import { searchLecciones } from "@/features/lessons/services/lecciones";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UseNavbarArgs {
  highContrast: boolean;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useNavbar({ highContrast }: UseNavbarArgs) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [language, setLanguage] = useState("es");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestionsListRef = useRef<HTMLUListElement | null>(null);

  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const initRef = useRef(false);

  // ── Derived ──────────────────────────────────────────────

  const isTeacher = profile?.role === "teacher";
  const isAdmin = profile?.role === "admin";
  const displayName = profile?.display_name || session?.user?.email || null;

  // ── Effects ──────────────────────────────────────────────

  /** Debounced search */
  useEffect(() => {
    const id = setTimeout(() => {
      const q = query.trim();
      if (!q) {
        setSuggestions([]);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      searchLecciones(q)
        .then((r) => setSuggestions(r))
        .catch(() => setSuggestions([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  /** Reset activeIndex when suggestions change */
  useEffect(() => {
    setActiveIndex(-1);
  }, [suggestions.length]);

  /** Scroll active suggestion into view */
  useEffect(() => {
    if (activeIndex < 0) return;
    const s = suggestions[activeIndex];
    if (!s) return;
    const el = document.getElementById(`suggestion-${s.id}`);
    if (el) {
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch {
        // ignore
      }
    }
  }, [activeIndex, suggestions]);

  /** Session initialization & auth listener */
  useEffect(() => {
    let mounted = true;

    const getProfileFromJWT = (): any | null => {
      try {
        let stored = localStorage.getItem("sb-auth-token");
        if (!stored) {
          const storageKey = Object.keys(localStorage).find(
            (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
          );
          if (storageKey) stored = localStorage.getItem(storageKey);
        }
        if (stored) {
          const parsed = JSON.parse(stored);
          const user = parsed?.user;
          if (user) {
            return {
              display_name:
                user.user_metadata?.display_name || user.user_metadata?.name || null,
              role:
                user.user_metadata?.role || user.app_metadata?.role || "student",
              role_requested: null,
            };
          }
        }
      } catch {
        // ignore
      }
      return null;
    };

    const loadProfile = async (userId: string) => {
      if (shouldIgnoreAuthEvent()) {
        if (mounted) setProfile(getProfileFromJWT());
        return;
      }

      try {
        const profilePromise = getProfile(userId);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("profile_timeout")), 3000)
        );

        const res = await Promise.race([profilePromise, timeoutPromise]);
        if (!res.error && mounted) {
          setProfile(res.data);
        } else if (mounted) {
          setProfile(getProfileFromJWT());
        }
      } catch {
        if (mounted) setProfile(getProfileFromJWT());
      }
    };

    const getStoredSession = () => {
      try {
        let stored = localStorage.getItem("sb-auth-token");
        if (!stored) {
          const storageKey = Object.keys(localStorage).find(
            (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
          );
          if (storageKey) stored = localStorage.getItem(storageKey);
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
      } catch {
        // ignore
      }
      return null;
    };

    const initSession = async () => {
      if (initRef.current) return;

      const storedSession = getStoredSession();
      if (storedSession && storedSession.user?.id) {
        if (session && session.user?.id === storedSession.user?.id && profile) {
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
              setTimeout(
                () => resolve({ data: { session: null }, error: { message: "timeout" } }),
                3000
              )
            ),
          ]);
        };

        const { data, error } = await getSessionWithTimeout();

        if (mounted) {
          let sessionToUse = data?.session;
          if (!sessionToUse && error?.message === "timeout") {
            sessionToUse = getStoredSession();
          }

          if (sessionToUse) {
            setSession(sessionToUse);
            if (sessionToUse.user?.id) await loadProfile(sessionToUse.user.id);
          } else {
            setSession(null);
            setProfile(null);
          }
        }
      } catch {
        if (mounted) {
          const storedSess = getStoredSession();
          if (storedSess) {
            setSession(storedSess);
            if (storedSess.user?.id) await loadProfile(storedSess.user.id);
          } else {
            setSession(null);
            setProfile(null);
          }
        }
      }
    };

    if (!initRef.current) initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, sess) => {
        if (!mounted) return;
        if (shouldIgnoreAuthEvent()) return;

        const storedSession = getStoredSession();

        if (storedSession && session && session.user?.id) {
          if (event === "SIGNED_OUT") {
            if (storedSession) return;
            setSession(null);
            setProfile(null);
            return;
          }
          return;
        }

        if (event === "SIGNED_OUT") {
          if (storedSession) return;
          setSession(null);
          setProfile(null);
          return;
        }

        if (event === "SIGNED_IN") {
          if (sess && sess.user?.id && !session) {
            setSession(sess);
            await loadProfile(sess.user.id);
          }
          return;
        }

        if (sess && sess.user?.id && !session) {
          setSession(sess);
          await loadProfile(sess.user.id);
        }
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /** ESC closes search overlay */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) setSearchOpen(false);
    };
    if (searchOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  // ── Handlers ─────────────────────────────────────────────

  const toggleLanguage = useCallback(() => {
    const newLang = language === "es" ? "en" : "es";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  }, [language, i18n]);

  const handleSignOut = useCallback(async () => {
    const result = await libSignOut(navigate, t);
    if (result?.success) {
      setProfile(null);
      setSession(null);
    }
  }, [navigate, t]);

  const navigateToSuggestion = useCallback(
    (suggestion: any) => {
      setQuery("");
      setSuggestions([]);
      setSearchOpen(false);
      navigate(`/add-content?lessonId=${suggestion.id}`);
    },
    [navigate]
  );

  // ── Return ───────────────────────────────────────────────

  return {
    // i18n
    language,
    t,
    toggleLanguage,

    // Router
    navigate,
    location,

    // Search
    searchOpen, setSearchOpen,
    query, setQuery,
    suggestions,
    activeIndex, setActiveIndex,
    searchLoading,
    suggestionsListRef,
    navigateToSuggestion,

    // Session
    session,
    profile,
    isTeacher,
    isAdmin,
    displayName,

    // Actions
    handleSignOut,
  };
}
