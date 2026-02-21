import type { Leccion } from './leccion';

// ─────────────────────────────────────────────────────────────
// Tabla: progreso
// ─────────────────────────────────────────────────────────────

/** Tabla: progreso */
export interface Progreso {
  id: number;
  usuario_id: string | null; // UUID de auth.users
  leccion_id: number | null;
  completado: boolean | null;
  fecha_ultimo_acceso: string | null; // timestamptz
  puntaje: number | null;
}

/** Progreso con datos de lección (para vistas de usuario) */
export interface ProgresoConLeccion extends Progreso {
  leccion: Leccion | null;
}

/** Para insertar progreso */
export type ProgresoInsert = Omit<Progreso, "id">;
export type ProgresoUpdate = Partial<ProgresoInsert>;
