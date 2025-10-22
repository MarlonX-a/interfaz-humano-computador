// ...existing code...
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e: typeof errors = {};

    if (!email.trim()) e.email = "El email es obligatorio";
    if (!password.trim()) e.password = "La contraseña es obligatoria";

    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    // Simular petición / login
    setTimeout(() => {
      setSubmitting(false);
      navigate("/"); // redirige al inicio tras "login" exitoso
    }, 800);
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Entrar</h2>

      {/* formulario básico */}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <input
            className="w-full border px-3 py-2 rounded"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
          />
          {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
        </div>

        <div>
          <input
            className="w-full border px-3 py-2 rounded"
            placeholder="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white px-4 py-2 rounded"
          disabled={submitting}
        >
          {submitting ? "Ingresando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          className="text-blue-600 underline text-sm"
          onClick={() => navigate("/register")}
          type="button"
        >
          ¿No tienes cuenta? Registrarse
        </button>
      </div>
    </div>
  );
}
// ...existing code...