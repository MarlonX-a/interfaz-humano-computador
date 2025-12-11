import { useState, type FC, useRef } from "react";
import {
  Settings,
  BookOpenText,
  PersonStanding,
  FlaskConical,
  ChevronRight,
  ChevronDown,
  Atom,
  FlaskRound,
  Eye,
  Volume2,
  Type,
  Contrast,
  Plus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import HelpModal from "./HelpModal";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { supabase, shouldIgnoreAuthEvent } from "../lib/supabaseClient";
import { getProfile } from "../lib/data/profiles";

interface SidebarProps {
  open: boolean;
  textSizeLarge: boolean;
  setTextSizeLarge: (val: boolean) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  setSidebarOpen?: (val: boolean) => void; // opcional para overlay click
  visualAlertsEnabled?: boolean;
  voiceReadingEnabled?: boolean;
  setVisualAlertsEnabled?: (val: boolean) => void;
  setVoiceReadingEnabled?: (val: boolean) => void;
}

const Sidebar: FC<SidebarProps> = ({
  open,
  textSizeLarge,
  setTextSizeLarge,
  highContrast,
  setHighContrast,
  setSidebarOpen,
  visualAlertsEnabled = false,
  voiceReadingEnabled = false,
  setVisualAlertsEnabled = () => {},
  setVoiceReadingEnabled = () => {},
}) => {
  const { t } = useTranslation();
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    aprende: false,
    accesibilidad: false,
  });
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  // Session state not used directly here; profile is used to render certain links
  const [profile, setProfile] = useState<any | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const initRef = useRef(false);

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Auth listener - only runs once on mount
  useEffect(() => {
    // Helper to extract profile from JWT token (fallback)
    const getProfileFromJWT = (): any | null => {
      try {
        // First try the consistent key we use
        let stored = localStorage.getItem('sb-auth-token');
        // Fallback to legacy pattern if not found
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

    // Helper to load profile with timeout
    const loadProfile = async (userId: string) => {
      // If page is not visible or recently became visible, skip Supabase call and use JWT directly
      // This prevents timeouts when changing windows (Alt+Tab)
      if (shouldIgnoreAuthEvent()) {
        console.debug('[Sidebar] Page not ready, using JWT fallback directly');
        const fallbackProfile = getProfileFromJWT();
        setProfile(fallbackProfile);
        return;
      }

      try {
        // Add timeout to getProfile
        const profilePromise = getProfile(userId);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('profile_timeout')), 3000)
        );
        
        const res = await Promise.race([profilePromise, timeoutPromise]);
        if (!res?.error) {
          setProfile(res.data);
        } else {
          // Fallback to JWT
          const fallbackProfile = getProfileFromJWT();
          setProfile(fallbackProfile);
        }
      } catch (err: any) {
        console.warn("[Sidebar] profile load error/timeout:", err?.message || err);
        // Fallback to JWT
        const fallbackProfile = getProfileFromJWT();
        setProfile(fallbackProfile);
      }
    };

    // Helper to read session from localStorage using consistent storage key
    const getStoredSession = () => {
      try {
        // First try the consistent key we use
        let stored = localStorage.getItem('sb-auth-token');
        // Fallback to legacy pattern if not found
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
      // Prevent re-initialization if already initialized
      if (initRef.current) {
        return;
      }

      // Check if we already have a valid profile before initializing
      // This prevents re-initialization when navigating between pages
      if (profile) {
        const storedSession = getStoredSession();
        if (storedSession && storedSession.user?.id) {
          // Profile already exists, don't re-initialize
          initRef.current = true;
          return;
        }
      }

      initRef.current = true;

      try {
        // Add timeout to getSession
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
          // Fallback to JWT if no session from Supabase
          const fallbackProfile = getProfileFromJWT();
          if (fallbackProfile) {
            setProfile(fallbackProfile);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn("Sidebar init profile error:", err);
        // Fallback to JWT on error
        const fallbackProfile = getProfileFromJWT();
        if (fallbackProfile) {
          setProfile(fallbackProfile);
        } else {
          setProfile(null);
        }
      }
    };

    init();

    // ULTRA DEFENSIVE: Only react to explicit SIGNED_IN or SIGNED_OUT, ignore all other events
    // This prevents profile loss when changing windows (Alt+Tab) triggers Supabase events
    const { data: subscriptionData } = supabase.auth.onAuthStateChange(async (event, sess) => {
      // DEFENSIVE: Ignore ALL events when page is hidden or recently became visible
      // This prevents Supabase from closing the session when changing windows (Alt+Tab)
      if (shouldIgnoreAuthEvent()) {
        console.debug('[Sidebar] Ignoring', event, '- page not ready for auth events');
        return;
      }

      // Check if we have a valid session in localStorage
      const storedSession = getStoredSession();
      
      // ULTRA DEFENSIVE: If we already have a valid profile and session in localStorage,
      // ignore ALL events except SIGNED_OUT (and only react to SIGNED_OUT if token is really gone)
      // This prevents profile loss during navigation when Supabase sends spurious events
      if (storedSession && profile && storedSession.user?.id) {
        // We have a valid profile, only react to SIGNED_OUT if token is really gone
        if (event === 'SIGNED_OUT') {
          // Double-check: if token still exists, ignore this event
          if (storedSession) {
            console.warn('[Sidebar] Ignoring SIGNED_OUT during navigation - valid token still in localStorage');
            return; // Keep current state, don't clear
          }
          // Token is really gone, this is a real sign out
          setProfile(null);
          return;
        }
        // For all other events (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, etc.),
        // ignore completely since we already have a valid profile
        console.debug('[Sidebar] Ignoring', event, 'during navigation - profile already exists');
        return;
      }
      
      // We don't have a profile yet, handle events normally
      if (event === 'SIGNED_OUT') {
        // SUPER DEFENSIVE: Before clearing, check if there's still a valid token in localStorage
        // If there is, the user didn't actually sign out - Supabase just failed to refresh
        if (storedSession) {
          console.warn('[Sidebar] Ignoring SIGNED_OUT - valid token still in localStorage');
          return; // Keep current state, don't clear
        }
        // No token in localStorage = real sign out
        setProfile(null);
        return;
      }
      
      // Only react to SIGNED_IN event if we don't have a profile
      if (event === 'SIGNED_IN') {
        // Only update if we receive a valid session and we don't have a profile already
        if (sess?.user?.id && !profile) {
          await loadProfile(sess.user.id);
        }
        return;
      }
      
      // For all other events (TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED, etc.)
      // Only update if we don't have a profile and receive a valid session
      if (sess?.user?.id && !profile) {
        await loadProfile(sess.user.id);
      }
      // If sess is null but event is NOT SIGNED_OUT, keep current profile
    });

    return () => {
      try {
        subscriptionData?.subscription?.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []); // Empty dependency array - only run once on mount

  // Sidebar open/close effects - separate from auth
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
      // Prevent background scroll on mobile/when overlay is open
      updateBodyOverflow();

      // focus the first focusable element inside the sidebar
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
      // Cleanup
      try {
        document.body.style.overflow = "";
      } catch (e) {}
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateBodyOverflow);
    };
  }, [open, setSidebarOpen]);

  return (
    <>
      {/* Overlay semi-transparente (móvil + opcional PC) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          role="presentation"
          onClick={() => setSidebarOpen && setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="main-sidebar"
        className={`fixed top-[64px] left-0 w-64 transform transition-transform duration-300 ease-in-out z-40 
        ${open ? "translate-x-0" : "-translate-x-full"}
        ${highContrast ? "bg-black text-yellow-300" : "bg-blue-900 text-white"}
        h-[calc(100vh-64px)] overflow-y-auto shadow-lg`}
        aria-label={t("sidebarLabel")}
        aria-hidden={!open}
        role="dialog"
        aria-modal={open}
        ref={sidebarRef}
      >
        <nav className={`flex flex-col p-4 space-y-2 ${textSizeLarge ? "text-lg" : "text-sm"}`}>
                    {/* moved help button to bottom */}

          {/* Cerrar en móvil */}
          <div className="lg:hidden flex justify-end mb-4">
            <button aria-label={t("close")} aria-controls="main-sidebar" onClick={() => setSidebarOpen && setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Aprende */}
          <button
            onClick={() => toggleMenu("aprende")}
            className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition"
          >
            <div className="flex items-center space-x-2">
              <BookOpenText size={18} /> <span>{t("learn")}</span>
            </div>
            {openMenus.aprende ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openMenus.aprende && (
            <div className="ml-6 mt-1 flex flex-col space-y-1">
              <button onClick={() => navigate('/molecules')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <Atom size={16} /> <span>{t("molecules")}</span>
              </button>
              <button onClick={() => navigate('/atoms')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <FlaskRound size={16} /> <span>{t("atoms")}</span>
              </button>
              <button onClick={() => navigate('/periodic-table')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <FlaskConical size={16} /> <span>{t("periodicTable")}</span>
              </button>
              <button onClick={() => navigate('/lessons')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <BookOpenText size={16} /> <span>{t("lessons.title")}</span>
              </button>
              <button onClick={() => navigate('/chemical-reactions')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <FlaskConical size={16} /> <span>{t("chemicalReactions")}</span>
              </button>
              
              <button onClick={() => navigate('/articles')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
                <BookOpenText size={16} /> <span>{t("article")}</span>
              </button>
            </div>
          )}
          
          {/* Contenido General (top-level item placed between Aprende and Experimentos) */}
          <button onClick={() => navigate('/contents')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
            <BookOpenText size={18} /> <span>{t('contents.title')}</span>
          </button>
          {/* Experimentos */}
          <button onClick={() => navigate('/experiments')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
            <FlaskConical size={16} /> <span>{t("experiments")}</span>
          </button>

          {/* Accesibilidad */}
          <button
            onClick={() => toggleMenu("accesibilidad")}
            className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition"
          >
            <div className="flex items-center space-x-2">
              <PersonStanding size={16} /> <span>{t("accessibility")}</span>
            </div>
            {openMenus.accesibilidad ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {openMenus.accesibilidad && (
            <div className="ml-6 mt-1 flex flex-col space-y-1">
                <button aria-label={t('visualAlerts')} title={t('visualAlerts')} aria-pressed={visualAlertsEnabled} onClick={() => {
                  const newVal = !visualAlertsEnabled;
                  setVisualAlertsEnabled(newVal);
                  try { localStorage.setItem('visualAlertsEnabled', JSON.stringify(newVal)); } catch(e) {}
                  // show a quick visual alert (if global trigger is available)
                  try { (window as any).triggerVisualAlert?.(t('accessibility.visualAlertsToggled') || (newVal ? t('accessibility.visualAlertsEnabled') : t('accessibility.visualAlertsDisabled')) ); } catch(e) {}
                  const toastMsg = newVal ? t('accessibility.visualAlertsEnabled') : t('accessibility.visualAlertsDisabled');
                  try { toast.success(toastMsg); } catch (e) {}
                }} className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition text-left">
                  <div className="flex items-center space-x-2"><Eye size={16} /> <span>{t("visualAlerts")}</span></div>
                  <div className={`w-2 h-2 rounded-full ${visualAlertsEnabled ? 'bg-emerald-400' : 'bg-gray-500'}`} aria-hidden />
                </button>

                  <button aria-label={t('voiceReading')} title={t('voiceReading')} aria-pressed={voiceReadingEnabled} onClick={() => {
                  const newVal = !voiceReadingEnabled;
                  setVoiceReadingEnabled(newVal);
                  try { localStorage.setItem('voiceReadingEnabled', JSON.stringify(newVal)); } catch(e) {}
                  // speak a short notification if enabled
                  try { (window as any).speak?.(t('accessibility.voiceReadingToggled') || (newVal ? t('accessibility.voiceReadingEnabled') : t('accessibility.voiceReadingDisabled')) ); } catch(e) {}
                    const toastMsg2 = newVal ? t('accessibility.voiceReadingEnabled') : t('accessibility.voiceReadingDisabled');
                    try { toast.success(toastMsg2); } catch (e) {}
                }} className="flex items-center justify-between w-full p-2 rounded hover:bg-blue-800 transition text-left">
                <div className="flex items-center space-x-2"><Volume2 size={16} /> <span>{t("voiceReading")}</span></div>
                <div className={`w-2 h-2 rounded-full ${voiceReadingEnabled ? 'bg-emerald-400' : 'bg-gray-500'}`} aria-hidden />
              </button>

              <button
                onClick={() => {
                  const v = !textSizeLarge;
                  setTextSizeLarge(v);
                  try { localStorage.setItem('textSizeLarge', JSON.stringify(v)); } catch (e) {}
                  // visual alert or speech when toggled
                  try { (window as any).triggerVisualAlert?.(t('accessibility.textSizeToggled') || (v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled')) ); } catch(e) {}
                  try { (window as any).speak?.(t('accessibility.textSizeToggled') || (v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled')) ); } catch(e) {}
                  const toastMsg3 = v ? t('accessibility.textSizeEnabled') : t('accessibility.textSizeDisabled');
                  try { toast.success(toastMsg3); } catch (e) {}
                }}
                aria-pressed={textSizeLarge}
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
              >
                <Type size={16} /> <span>{t("textSize")}</span>
                <div className={`w-2 h-2 rounded-full ${textSizeLarge ? 'bg-emerald-400' : 'bg-gray-500'}`} aria-hidden />
              </button>

              <button
                onClick={() => {
                  const v = !highContrast;
                  setHighContrast(v);
                  try { localStorage.setItem('highContrast', JSON.stringify(v)); } catch (e) {}
                  try { (window as any).triggerVisualAlert?.(t('accessibility.highContrastToggled') || (v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled')) ); } catch(e) {}
                  try { (window as any).speak?.(t('accessibility.highContrastToggled') || (v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled')) ); } catch(e) {}
                  const toastMsg4 = v ? t('accessibility.highContrastEnabled') : t('accessibility.highContrastDisabled');
                  try { toast.success(toastMsg4); } catch (e) {}
                }}
                aria-pressed={highContrast}
                className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
              >
                <Contrast size={16} /> <span>{t("highContrast")}</span>
                <div className={`w-2 h-2 rounded-full ${highContrast ? 'bg-emerald-400' : 'bg-gray-500'}`} aria-hidden />
              </button>
            </div>
          )}

          {/* Configuración */}
          <button onClick={() => navigate('/settings')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left">
            <Settings size={18} /> <span>{t("settings")}</span>
          </button>

          {/* Historial */}
          <a onClick={() => navigate('/history')} className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition cursor-pointer">
            <BookOpenText size={18} /> <span>{t('history.title')}</span>
          </a>

          {/* Añadir contenido - visible solo para teachers */}
          {profile && (profile.role === "teacher" || profile.role === "admin") && (
            <button
              onClick={() => navigate("/add-content")}
              className="flex items-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-left"
            >
              <Plus size={16} /> <span>{t("addContent")}</span>
            </button>
          )}
        </nav>

        <div className="mt-auto p-4 border-t pt-3">
          <button
            onClick={() => setHelpOpen(true)}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded hover:bg-blue-800 transition text-sm"
            aria-label={t("help")}
          >
            <span>❔</span>
            <span>{t("help")}</span>
          </button>
        </div>
      </aside>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
};

export default Sidebar;
