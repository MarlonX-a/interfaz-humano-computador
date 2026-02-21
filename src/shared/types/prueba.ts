// ─────────────────────────────────────────────────────────────
// Tablas: prueba, pregunta, respuesta, resultado_prueba
// ─────────────────────────────────────────────────────────────

/** Tabla: prueba */
export interface Prueba {
  id: number;
  leccion_id: number;
  titulo: string;
  descripcion: string | null;
  tiempo_limite: number | null; // minutos
  puntaje_minimo: number | null; // porcentaje
  activa: boolean | null;
  orden: number | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Tabla: pregunta */
export interface Pregunta {
  id: number;
  leccion_id: number | null; // Mantener por compatibilidad
  prueba_id: number | null; // Nueva relación con prueba
  texto: string;
  tipo: string | null;
  orden?: number | null; // Orden dentro de la prueba
}

/** Tabla: respuesta */
export interface Respuesta {
  id: number;
  pregunta_id: number | null;
  texto: string;
  es_correcta: boolean | null;
  orden?: number | null; // Orden de la respuesta
}

/** Tabla: resultado_prueba */
export interface ResultadoPrueba {
  id: number;
  prueba_id: number;
  usuario_id: string;
  puntaje_obtenido: number;
  puntaje_total: number;
  aprobado: boolean;
  tiempo_empleado: number | null;
  respuestas: Record<number, number> | null; // {pregunta_id: respuesta_id}
  started_at: string | null;
  completed_at: string | null;
}

/** Pregunta con sus respuestas anidadas */
export interface PreguntaConRespuestas extends Pregunta {
  respuestas: Respuesta[];
}

/** Prueba con sus preguntas y respuestas */
export interface PruebaCompleta extends Prueba {
  preguntas: PreguntaConRespuestas[];
}

/** Para insertar prueba */
export type PruebaInsert = Omit<Prueba, "id" | "created_at" | "updated_at">;
export type PruebaUpdate = Partial<PruebaInsert>;

/** Para insertar pregunta */
export type PreguntaInsert = Omit<Pregunta, "id">;
export type PreguntaUpdate = Partial<PreguntaInsert>;

/** Para insertar respuesta */
export type RespuestaInsert = Omit<Respuesta, "id">;
export type RespuestaUpdate = Partial<RespuestaInsert>;

/** Para insertar resultado de prueba */
export type ResultadoPruebaInsert = Omit<ResultadoPrueba, "id">;
export type ResultadoPruebaUpdate = Partial<ResultadoPruebaInsert>;
