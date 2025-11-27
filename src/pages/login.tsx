import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useTranslation } from "react-i18next";

type Props = {
  textSizeLarge: boolean;
  highContrast: boolean;
};

export default function Login({ highContrast = false, textSizeLarge: _textSizeLarge = false }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("login.errors.allFields"));
      return;
    }

    // Ejemplo: validación simulada
    if (email === "admin@ejemplo.com" && password === "123456") {
      setError("");
      alert(t("login.success"));
      if (remember) localStorage.setItem("rememberedEmail", email);
      else localStorage.removeItem("rememberedEmail");
    } else {
      setError(t("login.errors.invalid"));
    }
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
        } rounded-2xl w-full max-w-md p-8`}
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
            <label
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
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label
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

          {/* Recordar usuario */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className={`h-4 w-4 ${
                  highContrast
                    ? "text-yellow-400 accent-yellow-400"
                    : "text-indigo-600"
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
              href="#"
              className={`text-sm font-medium hover:underline ${
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

          {/* Error */}
          {error && (
            <div
              className={`text-sm p-2 rounded-md text-center ${
                highContrast
                  ? "bg-yellow-900 text-yellow-200"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            className={`w-full font-semibold py-2 rounded-lg transition duration-200 ${
              highContrast
                ? "bg-yellow-400 text-black hover:bg-yellow-300"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}