import { Menu, Atom, Search, X } from "lucide-react";
import { searchLecciones } from "../lib/data/lecciones";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { signOut as libSignOut } from "../lib/auth";
import { getProfile } from "../lib/data/profiles";
// toast not needed here; signOut helper shows messages

export default function Navbar({ toggleSidebar, sidebarOpen, highContrast }: { toggleSidebar: () => void; sidebarOpen?: boolean; highContrast: boolean }) {
  const { i18n, t } = useTranslation();
  const [language, setLanguage] = useState("es");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const suggestionsListRef = useRef<HTMLUListElement | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  // Profile loading indicator if needed (not used currently)
  const initRef = useRef(false);

  const toggleLanguage = () => {
    const newLang = language === "es" ? "en" : "es";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  };

  useEffect(() => {
    // Debounced search
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
        .catch((e) => {
          console.warn("search error", e);
          setSuggestions([]);
        })
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    // reset activeIndex when suggestions change
    setActiveIndex(-1);
  }, [suggestions.length]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const s = suggestions[activeIndex];
    if (!s) return;
    const el = document.getElementById(`suggestion-${s.id}`);
    if (el) {
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (err) {
        // ignore
      }
    }
  }, [activeIndex, suggestions]);

  useEffect(() => {
    let mounted = true;

    // Helper to extract profile from JWT token (fallback)
    const getProfileFromJWT = (): any | null => {
      try {
        const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (storageKey) {
          const stored = localStorage.getItem(storageKey);
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
        }
      } catch (e) {
        console.warn('Error extracting profile from JWT:', e);
      }
      return null;
    };

    // Helper to load profile with timeout
    const loadProfile = async (userId: string) => {
      try {
        // Add timeout to getProfile
        const profilePromise = getProfile(userId);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('profile_timeout')), 3000)
        );
        
        const res = await Promise.race([profilePromise, timeoutPromise]);
        if (!res.error && mounted) {
          setProfile(res.data);
        } else if (mounted) {
          // Fallback to JWT
          const fallbackProfile = getProfileFromJWT();
          setProfile(fallbackProfile);
        }
      } catch (err: any) {
        console.warn("profile load error/timeout:", err?.message || err);
        // Fallback to JWT
        if (mounted) {
          const fallbackProfile = getProfileFromJWT();
          setProfile(fallbackProfile);
        }
      }
    };

    // Read session directly from localStorage
    const getStoredSession = () => {
      try {
        const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (storageKey) {
          const stored = localStorage.getItem(storageKey);
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
        }
      } catch (err) {
        console.warn('Error reading stored session:', err);
      }
      return null;
    };

    // Initialize session: try getSession() with timeout, fallback to localStorage
    const initSession = async () => {
      // Prevent re-initialization if already initialized
      if (initRef.current) {
        return;
      }

      // Check if we already have a valid session in localStorage before initializing
      const storedSession = getStoredSession();
      if (storedSession && storedSession.user?.id) {
        // If we already have a session in state with the same user, don't re-initialize
        // This prevents re-initialization when navigating between pages
        if (session && session.user?.id === storedSession.user?.id && profile) {
          initRef.current = true;
          return;
        }
      }

      initRef.current = true;

      try {
        // Try getSession() with timeout first
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
        
        if (mounted) {
          let sessionToUse = data?.session;
          
          // If getSession failed or timed out, use localStorage fallback
          if (!sessionToUse && error?.message === 'timeout') {
            sessionToUse = getStoredSession();
          }
          
          if (sessionToUse) {
            setSession(sessionToUse);
            if (sessionToUse.user?.id) {
              await loadProfile(sessionToUse.user.id);
            }
          } else {
            setSession(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Error in initSession:', err);
        // Fallback to localStorage
        if (mounted) {
          const storedSession = getStoredSession();
          if (storedSession) {
            setSession(storedSession);
            if (storedSession.user?.id) {
              await loadProfile(storedSession.user.id);
            }
          } else {
            setSession(null);
            setProfile(null);
          }
        }
      }
    };

    // Start initialization only if not already initialized
    if (!initRef.current) {
      initSession();
    }

    // Subscribe to auth changes for future updates (login, logout, token refresh)
    // ULTRA DEFENSIVE: Only react to explicit SIGNED_IN or SIGNED_OUT, ignore all other events
    // This prevents session loss when changing windows (Alt+Tab) triggers Supabase events
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!mounted) return;
      
      // Check if we have a valid session in localStorage
      const storedSession = getStoredSession();
      
      if (event === 'SIGNED_OUT') {
        // SUPER DEFENSIVE: Before clearing, check if there's still a valid token in localStorage
        // If there is, the user didn't actually sign out - Supabase just failed to refresh
        if (storedSession) {
          console.warn('[Navbar] Ignoring SIGNED_OUT - valid token still in localStorage');
          return; // Keep current state, don't clear
        }
        // No token in localStorage = real sign out
        setSession(null);
        setProfile(null);
        return;
      }
      
      // Only react to SIGNED_IN event explicitly
      // Ignore all other events (TOKEN_REFRESHED, INITIAL_SESSION, etc.) if we already have a session
      if (event === 'SIGNED_IN') {
        // Only update if we receive a valid session
        if (sess && sess.user?.id) {
          setSession(sess);
          await loadProfile(sess.user.id);
        }
        return;
      }
      
      // For all other events (TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED, etc.)
      // ULTRA DEFENSIVE: Ignore completely if we already have a valid session in localStorage
      // This prevents session loss when changing windows triggers these events
      if (storedSession && session) {
        // We already have a valid session, ignore this event completely
        console.debug('[Navbar] Ignoring', event, '- session already exists');
        return;
      }
      
      // Only update if we don't have a session and receive a valid one
      if (sess && sess.user?.id && !session) {
        setSession(sess);
        await loadProfile(sess.user.id);
      }
      // If sess is null but event is NOT SIGNED_OUT, keep current state
    });

    // Cleanup
    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) setSearchOpen(false);
    };
    if (searchOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const handleSignOut = async () => {
    const result = await libSignOut(navigate, t);
    if (result?.success) {
      setProfile(null);
      setSession(null);
    }
  };

  const isTeacher = profile?.role === "teacher";
  const isAdmin = profile?.role === "admin";
  const displayName = profile?.display_name || session?.user?.email || null;

  return (
    <header className={`fixed top-0 left-0 w-full border-b shadow-sm z-50 transition-colors duration-300 ${highContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white border-gray-200 text-blue-700"}`}>
      <nav className="flex flex-wrap items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleSidebar}
            aria-controls="main-sidebar"
            aria-expanded={!!sidebarOpen}
            className={`p-2 rounded-md transition ${highContrast ? "text-yellow-300 hover:bg-yellow-900" : "text-blue-700 hover:bg-gray-100"}`}
            aria-label={sidebarOpen ? (t("sidebarClose") || "Close sidebar") : (t("sidebarOpen") || "Open sidebar")}
            title={sidebarOpen ? (t("sidebarClose") || "Close sidebar") : (t("sidebarOpen") || "Open sidebar")}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <a href="#" className="flex items-center space-x-1" aria-label="Quimica Uleam home">
            <Atom size={22} />
            <span className="sr-only">Quimica Uleam</span>
          </a>
          <span
            className={`text-lg sm:text-xl font-semibold transition cursor-pointer ${highContrast ? "text-yellow-300" : "text-blue-700"}`}
            onClick={() => navigate('/')}
          >
            Química Uleam
          </span>
          {/* Current page indicator */}
          <div className="hidden sm:block ml-3 text-sm text-gray-500">
            {location.pathname === '/' && (t('nav.home') || 'Inicio')}
            {location.pathname === '/login' && (t('nav.login') || 'Iniciar sesión')}
            {location.pathname === '/register' && (t('nav.register') || 'Registro')}
            {location.pathname === '/add-content' && (t('nav.addContent') || 'Añadir contenido')}
            {location.pathname === '/reset-password' && (t('nav.resetPassword') || 'Recuperar contraseña')}
          </div>
        </div>

        <div className="w-full mt-2 sm:mt-0 sm:w-auto sm:flex-1 sm:flex sm:justify-center">
          {/* Search is shown as inline input on `sm+` and as an icon opening a fullscreen overlay on xs */}
          <div className="w-full hidden sm:block relative sm:ml-8 md:ml-12 lg:ml-16">
            <input
              type="text"
              placeholder={language === "es" ? "Buscar..." : "Search..."}
              aria-label={language === "es" ? "Buscar" : "Search"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (suggestions.length === 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIndex((i) => {
                    if (i < 0) return 0;
                    return Math.min(i + 1, suggestions.length - 1);
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIndex((i) => {
                    if (i <= 0) return suggestions.length - 1; // wrap to last
                    return i - 1;
                  });
                } else if (e.key === "Enter") {
                  if (activeIndex >= 0 && suggestions[activeIndex]) {
                    const s = suggestions[activeIndex];
                    setQuery("");
                    setSuggestions([]);
                    navigate(`/add-content?lessonId=${s.id}`);
                  }
                }
              }}
              aria-controls="search-suggestions"
              aria-activedescendant={activeIndex >= 0 ? `suggestion-${suggestions[activeIndex]?.id}` : undefined}
              className={`w-full sm:max-w-md px-4 py-2 text-sm border rounded-full focus:outline-none transition ${highContrast ? "bg-black border-yellow-300 text-yellow-300" : "bg-white border-gray-300 text-gray-900"} ${sidebarOpen ? "lg:ml-0" : ""}`}
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">...</div>
            )}
            {suggestions.length > 0 && (
              <ul id="search-suggestions" ref={suggestionsListRef} role="listbox" className="absolute left-0 right-0 mt-2 bg-white border rounded shadow z-20 max-h-72 overflow-auto">
                {suggestions.map((s, idx) => (
                  <li
                    id={`suggestion-${s.id}`}
                    key={s.id}
                    role="option"
                    aria-selected={activeIndex === idx}
                    className={`p-2 cursor-pointer ${activeIndex === idx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                    onClick={() => {
                      setQuery("");
                      setSuggestions([]);
                      navigate(`/add-content?lessonId=${s.id}`);
                    }}
                  >
                    <div className="font-medium">{s.titulo}</div>
                    <div className="text-xs text-gray-500">{s.nivel}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="sm:hidden flex items-center w-full justify-center">
            <button aria-label="Open search" onClick={() => setSearchOpen(true)} className={`p-2 rounded ${highContrast ? "text-yellow-300" : "text-blue-700"}`}>
              <Search size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* On very small screens, hide large text buttons and show compact icons to conserve space */}
          <div className="hidden sm:flex items-center space-x-4 mr-2">
            <a href="#" className={`text-sm ${location.pathname === '/' ? 'font-semibold underline' : ''}`} onClick={() => navigate('/')}>{t('nav.home') || 'Inicio'}</a>
            {/* Show Add content only for teachers */}
            {isTeacher && (
              <a href="#" className={`text-sm ${location.pathname === '/add-content' ? 'font-semibold underline' : ''}`} onClick={() => navigate('/add-content')}>{t('addContent') || 'Añadir contenido'}</a>
            )}
          </div>
          <button onClick={toggleLanguage} className={`flex items-center space-x-1 px-3 py-1 border rounded-md transition ${highContrast ? "border-yellow-300 text-yellow-300 hover:bg-yellow-900" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}>
            🌐 <span className="text-sm font-medium">{language.toUpperCase()}</span>
          </button>

          {/* Conditional: if logged in show name/role, else login button */}
          {session && profile ? (
            <>
              {/* Display role label */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isAdmin ? "bg-indigo-100 text-indigo-800" : isTeacher ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {isAdmin ? t("register.roles.admin") || "Admin" : isTeacher ? t("register.roles.teacher") || "Teacher" : t("register.roles.student") || "Student"}
              </span>

              {/* Display name */}
              <button
                className={`hidden sm:inline-block px-3 py-1 rounded-md text-sm font-medium ${highContrast ? "text-yellow-300" : "text-gray-700"}`}
                onClick={() => navigate('/profile-setup')}
                title={displayName || session.user.email}
              >
                {displayName || session.user.email}
              </button>

              {/* Only teachers see 'Add Content' */}
              {isTeacher && (
                <button
                  className={`hidden sm:inline-flex px-4 py-1.5 text-sm font-medium rounded-md ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
                  onClick={() => navigate('/add-content')}
                >
                  {t("addContent") || "Ingresar contenido"}
                </button>
              )}

              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                onClick={handleSignOut}
                title={t("login.signOut")}
              >
                {/* keep the button text for visibility on small screens */}
                <span className="hidden sm:inline">{t("login.signOut") || "Cerrar sesión"}</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </>
          ) : (
            <button
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${highContrast ? "bg-yellow-300 text-black hover:bg-yellow-400" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              onClick={() => navigate('/login')}
            >
              <span className="hidden sm:inline">{t("login.signIn") || "Iniciar Sesión"}</span>
              <span className="sm:hidden">🔑</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start pt-16 px-4 sm:hidden">
          <div className={`absolute inset-0 bg-black/40`} onClick={() => setSearchOpen(false)} />
          <div className={`${highContrast ? "bg-black text-yellow-300" : "bg-white text-gray-900"} z-50 w-full rounded-lg p-4 shadow-lg`}> 
            <div className="flex items-center">
              <input autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={language === "es" ? "Buscar..." : "Search..."} className={`w-full px-4 py-2 rounded border ${highContrast ? "border-yellow-300 bg-black text-yellow-300" : "border-gray-300 bg-white text-gray-900"}`} aria-label={language === "es" ? "Buscar" : "Search"} aria-controls="search-suggestions-mobile" aria-activedescendant={activeIndex >= 0 ? `suggestion-${suggestions[activeIndex]?.id}` : undefined} onKeyDown={(e) => {
                if (suggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter') {
                  if (activeIndex >= 0 && suggestions[activeIndex]) {
                    const s = suggestions[activeIndex];
                    setSearchOpen(false);
                    setQuery('');
                    setSuggestions([]);
                    navigate(`/add-content?lessonId=${s.id}`);
                  }
                }
              }} />
              <button className="ml-2 p-2 rounded" aria-label="Close search" onClick={() => setSearchOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-3">
              <ul role="listbox" id="search-suggestions-mobile" className="space-y-2">
                {suggestions.map((s, idx) => (
                  <li key={s.id}>
                    <button
                      className={`w-full text-left p-2 rounded ${activeIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      onClick={() => { setSearchOpen(false); setQuery(''); setSuggestions([]); navigate(`/add-content?lessonId=${s.id}`); }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveIndex((i) => {
                            if (i < 0) return 0;
                            return Math.min(i + 1, suggestions.length - 1);
                          });
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveIndex((i) => {
                            if (i <= 0) return suggestions.length - 1;
                            return i - 1;
                          });
                        } else if (e.key === 'Enter') {
                          // the button click will run
                        }
                      }}
                      aria-selected={activeIndex === idx}
                      id={`suggestion-${s.id}`}
                    >
                      <div className="font-medium">{s.titulo}</div>
                      <div className="text-xs text-gray-500">{s.nivel}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}