// ...existing code...
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface RegisterProps {
  highContrast: boolean;
}

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

export default function Register({ highContrast } : RegisterProps) {
  const navigate = useNavigate();
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
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: typeof errors = {};

    if (!form.firstName.trim()) e.firstName = "Nombre es requerido";
    if (!form.lastName.trim()) e.lastName = "Apellido es requerido";

    if (!form.email.trim()) e.email = "Email es requerido";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email inválido";

    if (form.confirmEmail !== form.email) e.confirmEmail = "Los emails no coinciden";

    if (!form.password) e.password = "Contraseña es requerida";
    else if (form.password.length < 6) e.password = "La contraseña debe tener al menos 6 caracteres";

    if (form.confirmPassword !== form.password) e.confirmPassword = "Las contraseñas no coinciden";

    if (!form.phone.trim()) e.phone = "Teléfono es requerido";
    else if (!/^[0-9+\-\s()]{6,20}$/.test(form.phone)) e.phone = "Teléfono inválido";

    if (!form.terms) e.terms = "Debes aceptar los términos";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (k: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [k]: value }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSuccessMsg(null);

    if (!validate()) return;

    setSubmitting(true);
    // Simular petición a API
    setTimeout(() => {
      setSubmitting(false);
      setSuccessMsg("Registro exitoso. Redirigiendo a inicio de sesión...");
      setTimeout(() => navigate("/login"), 1200);
    }, 900);
  };

  return (
     <div className={"max-w-xl mx-auto p-6 bg-transparent rounded shadow"}>
        <div className={highContrast ? "bg-black text-yellow-300" : ""}>
        
       
      <h2 className="text-2xl font-semibold mb-4">Crear cuenta</h2>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              value={form.firstName}
              onChange={e => handleChange("firstName", e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Nombre"
            />
            {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Apellido</label>
            <input
              value={form.lastName}
              onChange={e => handleChange("lastName", e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Apellido"
            />
            {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            value={form.email}
            onChange={e => handleChange("email", e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="correo@ejemplo.com"
            type="email"
          />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Confirmar email</label>
          <input
            value={form.confirmEmail}
            onChange={e => handleChange("confirmEmail", e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Repite el correo"
            type="email"
          />
          {errors.confirmEmail && <p className="text-sm text-red-600 mt-1">{errors.confirmEmail}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Contraseña</label>
            <input
              value={form.password}
              onChange={e => handleChange("password", e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Contraseña"
              type="password"
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Confirmar contraseña</label>
            <input
              value={form.confirmPassword}
              onChange={e => handleChange("confirmPassword", e.target.value)}
              className="w-full border px-3 py-2 rounded"
              placeholder="Repite la contraseña"
              type="password"
            />
            {errors.confirmPassword && <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Teléfono</label>
          <input
            value={form.phone}
            onChange={e => handleChange("phone", e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="+593 9XXXXXXXX"
          />
          {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Rol</label>
          <select
            value={form.role}
            onChange={e => handleChange("role", e.target.value)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="student">Estudiante</option>
            <option value="teacher">Profesor</option>
            <option value="other">Otro</option>
          </select>
        </div>

        <div className="flex items-start space-x-2">
          <input
            id="terms"
            type="checkbox"
            checked={form.terms}
            onChange={e => handleChange("terms", e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm">
            Acepto los términos y condiciones
          </label>
        </div>
        {errors.terms && <p className="text-sm text-red-600 mt-1">{errors.terms}</p>}

        <div className="flex items-center justify-between space-x-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Registrando..." : "Crear cuenta"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded border"
          >
            Ya tengo cuenta
          </button>
        </div>

        {successMsg && <p className="text-sm text-green-700 mt-2">{successMsg}</p>}
      </form>
       </div>  
    </div>
  );
}
// ...existing code...