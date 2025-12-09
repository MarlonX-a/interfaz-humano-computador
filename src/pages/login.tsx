import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
// types from react are not necessary here

type Props = {
  textSizeLarge: boolean;
  highContrast: boolean;
};


export default function Login({ highContrast = false, textSizeLarge: _textSizeLarge = false }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState<boolean>(() => localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState("");
  const [failedAttempts, setFailedAttempts] = useState<number>(() => Number(localStorage.getItem('loginFailedAttempts') ?? 0));
  const [blockedUntil, setBlockedUntil] = useState<number>(() => Number(localStorage.getItem('loginBlockedUntil') ?? 0));
  const [blockedTimer, setBlockedTimer] = useState<number>(0);
  const isBlocked = Boolean(blockedUntil && blockedUntil > Date.now());
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const mapAuthError = (raw: any): string => {
    // Map Supabase errors to friendly messages for UI
    try {
      const message = raw?.message || raw?.error || String(raw);
      if (!message) return t('login.errors.invalid') || 'Credenciales inválidas';
      const m = message.toLowerCase();
      if (m.includes('invalid login') || m.includes('invalid-login') || m.includes('invalid email')) return t('login.errors.invalid') || 'Credenciales inválidas';
      if (m.includes('network') || m.includes('timeout')) return t('login.errors.connection') || 'Error de conexión';
      if (m.includes('confirmed') || m.includes('not confirmed')) return t('login.errors.unconfirmed') || 'Cuenta no confirmada';
      return t('login.errors.invalid') || 'Credenciales inválidas';
    } catch (e) {
      return t('login.errors.invalid') || 'Credenciales inválidas';
    }
  };
  
  // Redirect if session exists — avoid staying on /login when already authenticated
  useEffect(() => {
    const checkSession = async () => {
      try {
        // If we arrived after signing out, avoid immediate redirect
        if ((location.state as any)?.justSignedOut) return;
        
        // Check localStorage directly for session
        const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (storageKey) {
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.access_token && parsed?.user) {
              // Session exists, redirect to home
              navigate('/');
            }
          }
        }
      } catch (err) {
        // ignore
      }
    };
    checkSession();
  }, [navigate, location]);

  // use the SDK directly (no debug timeout helper)

  useEffect(() => {
    let interval: any;
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
    }
    // If there is a blockedUntil in the future, initialize the timer
    const bUntil = Number(localStorage.getItem('loginBlockedUntil') ?? 0);
    if (bUntil && bUntil > Date.now()) setBlockedUntil(bUntil);
    // set up interval to update timer if blocked (at mount) and initialize blockedTimer
    if (bUntil && bUntil > Date.now()) {
      setBlockedTimer(Math.max(0, Math.ceil((bUntil - Date.now())/1000)));
      interval = setInterval(() => {
        const nextUntil = Number(localStorage.getItem('loginBlockedUntil') ?? 0);
        const secs = Math.max(0, Math.ceil((nextUntil - Date.now())/1000));
        setBlockedTimer(secs);
        if (nextUntil <= Date.now()) {
          clearInterval(interval);
          localStorage.removeItem('loginFailedAttempts');
          localStorage.removeItem('loginBlockedUntil');
          setFailedAttempts(0);
          setBlockedUntil(0);
          setBlockedTimer(0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, []);

  // Live update the UI countdown when blockedUntil changes at runtime
  useEffect(() => {
    if (!blockedUntil || blockedUntil <= Date.now()) {
      setBlockedTimer(0);
      return;
    }
    setBlockedTimer(Math.max(0, Math.ceil((blockedUntil - Date.now())/1000)));
    const interval = setInterval(() => {
      const nextUntil = Number(localStorage.getItem('loginBlockedUntil') ?? blockedUntil);
      const secs = Math.max(0, Math.ceil((nextUntil - Date.now())/1000));
      setBlockedTimer(secs);
      if (nextUntil <= Date.now()) {
        clearInterval(interval);
        localStorage.removeItem('loginFailedAttempts');
        localStorage.removeItem('loginBlockedUntil');
        setFailedAttempts(0);
        setBlockedUntil(0);
        setBlockedTimer(0);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [blockedUntil]);

  const handleLogin = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('login.errors.allFields'));
      return;
    }
    if (blockedUntil && blockedUntil > Date.now()) {
      const secs = Math.ceil((blockedUntil - Date.now()) / 1000);
      setError(t('login.errors.blockedTimer', { count: secs }) || `Demasiados intentos. Inténtalo de nuevo en ${secs} segundos.`);
      toast.error(t('login.errors.blockedTimer', { count: secs }) || `Demasiados intentos. Inténtalo de nuevo en ${secs} segundos.`);
      return;
    }
    // (Remember-me feature removed) preserving prior behavior: no migration between storages
    setLoading(true);
    // DEV LOG: show current storage and state to help debug why 'remember me' isn't persisting
    try {
      const sessionKeys = [] as string[];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) sessionKeys.push(k);
      }
      const localKeys = [] as string[];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) localKeys.push(k);
      }
      console.debug('[Login] session storage keys', sessionKeys, 'local storage keys', localKeys);
    } catch (e) {
      console.debug('[Login] debug logging error', e);
    }
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      const signInError = res.error;
      // sign-in response processed
      if (signInError) {
        // increment failed attempts and potentially block
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        localStorage.setItem('loginFailedAttempts', String(next));
        // throttle: block after X attempts
        const MAX_FAILED = 5;
        const LOCK_SECONDS = 30;
        if (next >= MAX_FAILED) {
          const until = Date.now() + LOCK_SECONDS * 1000;
          setBlockedUntil(until);
          setBlockedTimer(LOCK_SECONDS);
          localStorage.setItem('loginBlockedUntil', String(until));
          setError(t('login.errors.blocked') || `Demasiados intentos. Intenta nuevamente en ${LOCK_SECONDS} segundos.`);
          toast.error(t('login.errors.blocked') || `Demasiados intentos. Intenta nuevamente en ${LOCK_SECONDS} segundos.`);
        } else {
          const friendly = mapAuthError(signInError);
          setError(friendly);
          toast.error(friendly);
        }
        setLoading(false);
        return;
      }
      // show immediate session
      await supabase.auth.getSession();

      // Save remember me preference (visual only, not functional yet)
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      // Reset failed attempts on success
      setFailedAttempts(0);
      localStorage.removeItem('loginFailedAttempts');
      localStorage.removeItem('loginBlockedUntil');
      setBlockedUntil(0);
      // redirect to home after successful login
      navigate('/');
    } catch (err: any) {
      // log the error and show toast
      console.error("signIn error:", err);
      toast.error(err?.message || "Error connecting to Supabase");
      setLoading(false);
      return;
    }
    finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    });
    if (error) {
          const friendly = mapAuthError(error);
          toast.error(friendly);
      return;
    }
    toast.success('Hemos enviado un correo para restablecer la contraseña.');
  };

  return (
    <div
      className={`flex items-center justify-center min-h-screen bg-cover bg-center p-4 transition-colors duration-300 ${
        highContrast ? "bg-black text-white" : ""
      }`}
      style={{
        backgroundImage: highContrast
          ? "none"
          : "url('https://previews.123rf.com/images/ihor_seamless/ihor_seamless0908/ihor_seamless090800023/5407313-seamlessly-wallpaper-chemistry-formulas-on-white.jpg')",
      }}
    >
      <div
        className={`${
          highContrast
            ? "bg-gray-900 text-white border-2 border-white"
            : "bg-white text-gray-800 shadow-2xl"
        } rounded-2xl w-full max-w-md p-6 sm:p-8`}
      >
        <h2
          className={`text-3xl font-bold text-center mb-6 ${
            highContrast ? "text-yellow-400" : "text-indigo-700"
          }`}
        >
          {t("login.title")}
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="login-email"
              className={`block font-semibold mb-1 ${
                highContrast ? "text-yellow-300" : "text-gray-700"
              }`}
            >
              {t("login.email")}
            </label>
            <div
              className={`flex items-center border rounded-lg px-3 py-2 focus-within:ring-2 ${
                highContrast
                  ? "border-yellow-400 focus-within:ring-yellow-400"
                  : "border-gray-300 focus-within:ring-indigo-500"
              }`}
            >
              <User
                className={highContrast ? "text-yellow-400 mr-2" : "text-gray-500 mr-2"}
                size={20}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                className={`w-full bg-transparent outline-none ${
                  highContrast ? "placeholder-yellow-300" : ""
                }`}
                id="login-email"
                aria-label={t("login.email")}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                  autoComplete="email"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label htmlFor="login-password"
              className={`block font-semibold mb-1 ${
                highContrast ? "text-yellow-300" : "text-gray-700"
              }`}
            >
              {t("login.password")}
            </label>
            <div
              className={`flex items-center border rounded-lg px-3 py-2 focus-within:ring-2 ${
                highContrast
                  ? "border-yellow-400 focus-within:ring-yellow-400"
                  : "border-gray-300 focus-within:ring-indigo-500"
              }`}
            >
              <Lock
                className={highContrast ? "text-yellow-400 mr-2" : "text-gray-500 mr-2"}
                size={20}
              />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                className={`w-full bg-transparent outline-none ${
                  highContrast ? "placeholder-yellow-300" : ""
                }`}
                id="login-password"
                aria-label={t("login.password")}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={highContrast ? "text-yellow-400" : "text-gray-500"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={`h-4 w-4 rounded border-gray-300 ${
                  highContrast
                    ? "accent-yellow-400"
                    : "accent-indigo-600"
                }`}
              />
              <span
                className={`text-sm ${
                  highContrast ? "text-yellow-300" : "text-gray-700"
                }`}
              >
                {t("login.rememberMe")}
              </span>
            </label>
            <a
              onClick={() => handleForgotPassword()}
              className={`text-sm font-medium hover:underline cursor-pointer ${
                highContrast ? "text-yellow-400" : "text-indigo-600"
              }`}
            >
              {t("login.forgotPassword")}
            </a>
          </div>

          {/* Registrarse */}
          <div className="flex justify-end">
            <a
              href="/register"
              className={`text-sm font-medium hover:underline ${
                highContrast ? "text-yellow-400" : "text-indigo-600"
              }`}
            >
              {t("login.noAccount")}
            </a>
          </div>

          {/* Contextual help */}
          <div className="mt-4 text-xs text-gray-500">
            <p>{t("login.help.passwordTips") || "Consejos: contraseña de al menos 6 caracteres, evita copiar/pegar desde notas inseguras."}</p>
            <p className="mt-1">{t("login.help.shortcuts") || "Atajos: Ctrl+B (sidebar), Ctrl+H (modo alto contraste), Ctrl+R (recargar)"}</p>
          </div>

          {/* No developer debug UI */}

          {/* Error */}
          {error && (
            <div id="login-error" role="alert" className={`text-sm p-2 rounded-md text-center ${
              highContrast
                ? "bg-yellow-900 text-yellow-200"
                : "bg-red-100 text-red-600"
            }`}
            >
              {error}
            </div>
          )}
          {/* show block countdown */}
          {blockedTimer > 0 && (
            <div className="text-sm text-gray-600 mt-2" role="status" aria-live="polite">{t('login.errors.blockedTimer', { count: blockedTimer }) || `Intenta de nuevo en ${blockedTimer} segundos`}</div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || isBlocked}
            className={`w-full font-semibold py-3 sm:py-2 rounded-lg transition duration-200 ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            } ${
              highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {loading ? (t("login.loading") || "Iniciando...") : t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}