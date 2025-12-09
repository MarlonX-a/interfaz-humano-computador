//Interfaces basadas en las tablas de la base de datos

// ─────────────────────────────────────────────────────────────
// Definiciones de las tablas de la base de datos
// ─────────────────────────────────────────────────────────────

/** Tabla: leccion */
export interface Leccion {
  id: number;
  titulo: string;
  descripcion: string | null;
  nivel: string | null;
  thumbnail_url: string | null;
  created_by?: string | null;
}

/** Tabla: contenido */
export interface Contenido {
  id: number;
  leccion_id: number | null;
  titulo: string;
  texto_html: string | null;
  orden: number | null;
  type?: string | null;
  author?: string | null;
  difficulty?: string | null;
  tags?: string[] | null;
  resources?: string[] | null;
  version?: number | null;
  updated_at?: string | null;
  updated_by?: string | null;
}


/** Tabla: modelo_ra (Realidad Aumentada) */
export interface ModeloRA {
  id: number;
  leccion_id: number | null;
  nombre_modelo: string;
  archivo_url: string;
  tipo: string | null;
  descripcion: string | null;
  created_by?: string | null;
}

/** Tabla: pregunta */
export interface Pregunta {
  id: number;
  leccion_id: number | null;
  texto: string;
  tipo: string | null;
}

/** Tabla: respuesta */
export interface Respuesta {
  id: number;
  pregunta_id: number | null;
  texto: string;
  es_correcta: boolean | null;
}

/** Tabla: progreso */
export interface Progreso {
  id: number;
  usuario_id: string | null; // UUID de auth.users
  leccion_id: number | null;
  completado: boolean | null;
  fecha_ultimo_acceso: string | null; // timestamptz
  puntaje: number | null;
}

// ─────────────────────────────────────────────────────────────
// Tipos derivados para operaciones CRUD
// ─────────────────────────────────────────────────────────────

/** Para insertar lección (sin id, se autogenera) */
export type LeccionInsert = Omit<Leccion, "id">;
export type LeccionUpdate = Partial<LeccionInsert>;

/** Para insertar contenido (sin id ni campos de versión) */
export type ContenidoInsert = Omit<Contenido, "id" | "version" | "updated_at" | "updated_by">;
export type ContenidoUpdate = Partial<ContenidoInsert>;

/** Para insertar modelo RA */
export type ModeloRAInsert = Omit<ModeloRA, "id">;
export type ModeloRAUpdate = Partial<ModeloRAInsert>;

/** Para insertar pregunta */
export type PreguntaInsert = Omit<Pregunta, "id">;
export type PreguntaUpdate = Partial<PreguntaInsert>;

/** Para insertar respuesta */
export type RespuestaInsert = Omit<Respuesta, "id">;
export type RespuestaUpdate = Partial<RespuestaInsert>;

/** Para insertar progreso */
export type ProgresoInsert = Omit<Progreso, "id">;
export type ProgresoUpdate = Partial<ProgresoInsert>;

// ─────────────────────────────────────────────────────────────
// Tipos compuestos útiles
// ─────────────────────────────────────────────────────────────

/** Pregunta con sus respuestas anidadas */
export interface PreguntaConRespuestas extends Pregunta {
  respuestas: Respuesta[];
}

/** Lección con contenido y modelos RA anidados */
export interface LeccionCompleta extends Leccion {
  contenidos: Contenido[];
  modelos_ra: ModeloRA[];
  preguntas: PreguntaConRespuestas[];
}

/** Progreso con datos de lección (para vistas de usuario) */
export interface ProgresoConLeccion extends Progreso {
  leccion: Leccion | null;
}