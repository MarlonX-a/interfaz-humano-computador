import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  textSizeLarge?: boolean;
  highContrast?: boolean;
};

export default function ResetPassword({ highContrast = false, textSizeLarge = false }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [sessionPresent, setSessionPresent] = useState<boolean | null>(null);
  const [emailForResend, setEmailForResend] = useState("");
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getSession();

      if (data?.session) {
        setSessionPresent(true);
      } else {
        setSessionPresent(false);
        setError("El enlace es inválido o expiró.");
      }

      setLoading(false);
    };

    checkSession();
  }, []);





  const validatePasswords = (): string | null => {
    if (!password || !confirmPassword)
      return t("resetPassword.errors.required") || "Introduce la contraseña y la confirmación.";
    if (password.length < 6)
      return t("resetPassword.errors.tooShort") || "La contraseña debe tener al menos 6 caracteres.";
    if (password !== confirmPassword)
      return t("resetPassword.errors.mismatch") || "Las contraseñas no coinciden.";
    return null;
  };

  const handleUpdatePassword = async () => {
    setError(null);
    const validationError = validatePasswords();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(t("resetPassword.success") || "Contraseña actualizada.");

      // Force logout after update
      try {
        await supabase.auth.signOut();
      } catch (_) {}

      navigate("/login");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetEmail = async () => {
    if (!emailForResend) {
      setError(t("resetPassword.errors.enterEmail") || "Debes indicar un correo.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailForResend, { redirectTo });
      if (error) throw error;

      toast.success(t("resetPassword.resendSuccess") || "Correo enviado.");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex items-center justify-center min-h-screen p-4 ${highContrast ? "bg-black text-white" : "bg-gray-50"}`}>
      <div className={`w-full max-w-md p-6 sm:p-8 bg-white rounded-2xl shadow-lg ${textSizeLarge ? "text-lg" : "text-sm"}`}>
        <h2 className="text-2xl font-bold text-center mb-6">
          {t("resetPassword.title") || "Recuperar contraseña"}
        </h2>

        {sessionPresent === null && (
          <div className="text-center text-sm text-gray-600">
            {t("resetPassword.checkingSession") || "Verificando enlace..."}
          </div>
        )}

        {sessionPresent === false && (
          <>
            <p className="text-sm text-gray-700 mb-4">
              {t("resetPassword.invalidOrExpired") || "El enlace ha expirado o no es válido."}
            </p>

            <div className="space-y-3">
              <input
                type="email"
                placeholder={t("resetPassword.emailPlaceholder") || "Correo electrónico"}
                value={emailForResend}
                onChange={(e) => setEmailForResend(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleResendResetEmail}
                disabled={loading}
                className={`w-full py-3 sm:py-2 rounded-lg font-medium ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {loading ? "Enviando..." : "Enviar correo de recuperación"}
              </button>
            </div>
          </>
        )}

        {sessionPresent === true && (
          <>
            <div className="space-y-3">
              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  {t("resetPassword.newPassword") || "Nueva contraseña"}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium mb-1">
                  {t("resetPassword.confirmPassword") || "Confirmar contraseña"}
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <button
                  type="button"
                  className="absolute right-3 top-8 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={loading}
                className={`w-full py-3 sm:py-2 rounded-lg font-medium ${loading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700 text-white"}`}
              >
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
