import type { Contenido } from './contenido';
import type { ModeloRA } from './modelo';
import type { Prueba } from './prueba';

// ─────────────────────────────────────────────────────────────
// Tabla: leccion_seccion y progreso_seccion
// ─────────────────────────────────────────────────────────────

/** Tipo de sección en leccion_seccion */
export type TipoSeccion = 'contenido' | 'prueba' | 'modelo';

/** Tabla: leccion_seccion (flujo ordenado de lección) */
export interface LeccionSeccion {
  id: number;
  leccion_id: number;
  tipo: TipoSeccion;
  contenido_id: number | null;
  prueba_id: number | null;
  modelo_id: number | null;
  orden: number;
  es_obligatorio: boolean;
  requisitos: number[];
  titulo_seccion: string | null;
  descripcion_seccion: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Tabla: progreso_seccion (tracking por sección) */
export interface ProgresoSeccion {
  id: number;
  user_id: string;
  leccion_seccion_id: number;
  completado: boolean;
  puntuacion: number | null;
  intentos: number;
  tiempo_dedicado: number;
  fecha_completado: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Sección de lección con datos completos */
export interface LeccionSeccionCompleta extends LeccionSeccion {
  contenido?: Contenido | null;
  prueba?: Prueba | null;
  modelo?: ModeloRA | null;
  progreso?: ProgresoSeccion | null;
  bloqueada?: boolean; // Calculado basándose en requisitos
}

/** Para insertar leccion_seccion */
export type LeccionSeccionInsert = Omit<LeccionSeccion, "id" | "created_at" | "updated_at">;
export type LeccionSeccionUpdate = Partial<LeccionSeccionInsert>;

/** Para insertar progreso_seccion */
export type ProgresoSeccionInsert = Omit<ProgresoSeccion, "id" | "created_at" | "updated_at">;
export type ProgresoSeccionUpdate = Partial<ProgresoSeccionInsert>;
