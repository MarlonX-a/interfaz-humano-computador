import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { toast } from "react-hot-toast";

type Props = {
  textSizeLarge: boolean;
  highContrast: boolean;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: string;
  terms: boolean;
};

export default function Register({ highContrast = false, textSizeLarge: _textSizeLarge = false }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
    phone: "",
    role: "student",
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.firstName.trim()) e.firstName = t("register.errors.required.firstName");
    if (!form.lastName.trim()) e.lastName = t("register.errors.required.lastName");
    if (!form.email.trim()) e.email = t("register.errors.required.email");
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = t("register.errors.invalid.email");
    if (form.confirmEmail !== form.email) e.confirmEmail = t("register.errors.mismatch.email");
    if (!form.password) e.password = t("register.errors.required.password");
    else if (form.password.length < 6) e.password = t("register.errors.invalid.password");
    if (form.confirmPassword !== form.password) e.confirmPassword = t("register.errors.mismatch.password");
    if (!form.phone.trim()) e.phone = t("register.errors.required.phone");
    else if (!/^[0-9+\-\s()]{6,20}$/.test(form.phone)) e.phone = t("register.errors.invalid.phone");
    if (!form.terms) e.terms = t("register.errors.required.terms");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (k: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [k]: value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSuccessMsg(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data: signUpData } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            displayName: `${form.firstName} ${form.lastName}`.trim(),
            role: form.role, // Pass role to trigger so it creates profile with correct role
          },
        },
      });

      // ... comprobar signUpError y userId como ya haces ...

      const userId = signUpData?.user?.id;
      const hasSession = !!signUpData?.session;

      const payloadProfile = {
        id: userId,
        email: form.email,
        role: form.role, // Allow direct role assignment (student, teacher, other) for testing
        role_requested: null, // No longer needed since we assign directly
        first_name: form.firstName || null,
        last_name: form.lastName || null,
        display_name: `${form.firstName} ${form.lastName}`.trim() || null,
        phone: form.phone || null,
        terms_accepted: !!form.terms,
        terms_accepted_at: form.terms ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
      };

      if (hasSession) {
        // Si hay sesión, podemos upsert con la session actual
        const { error: profileErr } = await supabase.from('profiles')
          .upsert([payloadProfile], { onConflict: 'id' });
        if (profileErr) {
          console.error('Error creando profile:', profileErr);
          toast.error('Registro creado pero no se pudo crear el perfil: ' + profileErr.message);
          setSubmitting(false);
          return;
        }
      } else {
        // Si no hay sesión, confiamos en el trigger DB para crear el profile después del insert en auth.users,
        // o dejamos el usuario informando que verifique su correo (email verification).
        toast.success('Registro creado. Verifica tu correo para continuar.');
        setSubmitting(false);
        setTimeout(() => navigate('/login'), 1200);
        return;
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error registrando");
      setSubmitting(false);
    }
  };

  const inputBaseClass = `w-full border rounded-lg px-3 py-2 bg-transparent outline-none ${
    highContrast
      ? "border-yellow-400 placeholder-yellow-300 text-yellow-100"
      : "border-gray-300 focus:ring-2 focus:ring-green-500"
  }`;

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
            ? "bg-gray-900 text-white border-2 border-yellow-400"
            : "bg-white shadow-2xl text-gray-800"
        } rounded-2xl w-full max-w-2xl p-8`}
      >
        <h2
          className={`text-3xl font-bold text-center mb-6 ${
            highContrast ? "text-yellow-400" : "text-green-700"
          }`}
        >
          {t("register.title")}
        </h2>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Nombres */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
                {t("register.firstName")}
              </label>
              <input
                id="firstName"
                value={form.firstName}
                 onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder={t("register.placeholders.firstName")}
                className={inputBaseClass}
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
              />
              {errors.firstName && <p id="firstName-error" className="text-sm text-red-600 mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <label htmlFor="lastName" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
                {t("register.lastName")}
              </label>
              <input
                id="lastName"
                value={form.lastName}
                 onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder={t("register.placeholders.lastName")}
                className={inputBaseClass}
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
              />
              {errors.lastName && <p id="lastName-error" className="text-sm text-red-600 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
              {t("register.email")}
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder={t("register.placeholders.email")}
              className={inputBaseClass}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <p id="email-error" className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="confirmEmail" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
              {t("register.confirmEmail")}
            </label>
            <input
              id="confirmEmail"
              type="email"
              value={form.confirmEmail}
              onChange={(e) => handleChange("confirmEmail", e.target.value)}
              placeholder={t("register.placeholders.confirmEmail")}
              className={inputBaseClass}
              aria-invalid={!!errors.confirmEmail}
              aria-describedby={errors.confirmEmail ? "confirmEmail-error" : undefined}
            />
            {errors.confirmEmail && <p id="confirmEmail-error" className="text-sm text-red-600 mt-1">{errors.confirmEmail}</p>}
          </div>

          {/* Contraseñas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <label htmlFor="password" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
                {t("register.password")}
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder={t("register.placeholders.password")}
                className={inputBaseClass}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.password && <p id="password-error" className="text-sm text-red-600 mt-1">{errors.password}</p>}
            </div>

            <div className="relative">
              <label htmlFor="confirmPassword" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
                {t("register.confirmPassword")}
              </label>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                placeholder={t("register.placeholders.confirmPassword")}
                className={inputBaseClass}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-gray-500"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {errors.confirmPassword && <p id="confirmPassword-error" className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="phone" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
              {t("register.phone")}
            </label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder={t("register.placeholders.phone")}
              className={inputBaseClass}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && <p id="phone-error" className="text-sm text-red-600 mt-1">{errors.phone}</p>}
          </div>

          {/* Rol */}
          <div>
            <label htmlFor="role" className={`block text-sm font-semibold mb-1 ${highContrast ? "text-yellow-300" : "text-gray-700"}`}>
              {t("register.role")}
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className={inputBaseClass}
            >
              <option value="student">{t("register.roles.student")}</option>
              <option value="teacher">{t("register.roles.teacher")}</option>
              <option value="other">{t("register.roles.other")}</option>
            </select>
          </div>

          {/* Términos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:space-x-2">
            <input
              id="terms"
              type="checkbox"
              checked={form.terms}
              onChange={(e) => handleChange("terms", e.target.checked)}
              className={`mt-1 ${highContrast ? "accent-yellow-400" : "accent-green-600"}`}
              aria-describedby={errors.terms ? "terms-error" : undefined}
            />
            <label htmlFor="terms" className="text-sm">{t("register.terms")}</label>
          </div>
          {errors.terms && <p id="terms-error" className="text-sm text-red-600 mt-1">{errors.terms}</p>}
          {errors.terms && <p className="text-sm text-red-600 mt-1">{errors.terms}</p>}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full sm:flex-1 py-3 sm:py-2 rounded-lg font-semibold transition duration-200 ${
                highContrast
                  ? "bg-yellow-400 text-black hover:bg-yellow-300"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {submitting ? t("register.buttons.creating") : t("register.buttons.create")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className={`w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg border ${
                highContrast
                  ? "border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {t("register.buttons.haveAccount")}
            </button>
          </div>

          {/* Mensaje de éxito */}
          {successMsg && (
            <p className={`text-sm mt-3 text-center ${highContrast ? "text-yellow-300" : "text-green-700"}`}>
              {successMsg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
