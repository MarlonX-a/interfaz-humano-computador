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
  leccion_id: number | null; // Mantener por compatibilidad, pero usar contenido_leccion
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

/** Tabla intermedia: contenido_leccion (relación muchos-a-muchos) */
export interface ContenidoLeccion {
  id: number;
  contenido_id: number;
  leccion_id: number;
  orden: number | null;
  created_at?: string | null;
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

/** Prueba con sus preguntas y respuestas */
export interface PruebaCompleta extends Prueba {
  preguntas: PreguntaConRespuestas[];
}

/** Lección con contenido y modelos RA anidados */
export interface LeccionCompleta extends Leccion {
  contenidos: Contenido[];
  modelos_ra: ModeloRA[];
  preguntas: PreguntaConRespuestas[];
  pruebas: Prueba[];
}

/** Progreso con datos de lección (para vistas de usuario) */
export interface ProgresoConLeccion extends Progreso {
  leccion: Leccion | null;
}

/** Contenido con lecciones asociadas */
export interface ContenidoConLecciones extends Contenido {
  lecciones: Leccion[];
}

/** ContenidoLeccion con datos de lección */
export interface ContenidoLeccionConLeccion extends ContenidoLeccion {
  leccion: Leccion;
}

// ─────────────────────────────────────────────────────────────
// Tipos para gestión de usuarios
// ─────────────────────────────────────────────────────────────

/** Tabla: profiles */
export interface Profile {
  id: string; // UUID de auth.users
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  role: string; // 'student' | 'teacher' | 'admin'
  role_requested: string | null;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  is_verified: boolean;
  thumbnail_url: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string | null;
}

/** Usuario completo con datos de auth.users y profiles */
export interface UserWithProfile {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string | null;
  last_sign_in_at: string | null;
  // Datos del perfil
  profile: Profile | null;
  // Estado calculado
  is_active: boolean; // basado en email_confirmed_at o metadata
}

/** Filtros para búsqueda de usuarios */
export interface UserFilters {
  search?: string; // búsqueda por email, nombre
  role?: string; // 'student' | 'teacher' | 'admin'
  is_verified?: boolean;
  is_active?: boolean;
  created_from?: string; // fecha ISO
  created_to?: string; // fecha ISO
}

/** Input para crear usuario */
export interface UserCreateInput {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  role?: string; // 'student' | 'teacher' | 'admin'
  send_verification_email?: boolean;
}

/** Input para actualizar usuario */
export interface UserUpdateInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  phone?: string;
  role?: string;
  is_verified?: boolean;
  // Para actualizar password (requiere confirmación)
  password?: string;
}

// ─────────────────────────────────────────────────────────────
// Tipos para Dashboard de Administrador
// ─────────────────────────────────────────────────────────────

/** Estadísticas generales del sistema */
export interface DashboardStats {
  total_users: number;
  total_admins: number;
  total_teachers: number;
  total_students: number;
  total_lessons: number;
  total_contents: number;
  total_pruebas: number;
  total_resultados: number;
  total_progreso: number;
  approval_rate: number; // porcentaje
  monthly_activity: number; // actividad del mes actual
}

/** Actividad reciente del sistema */
export interface RecentActivity {
  recent_users: Array<{
    id: string;
    email: string | null;
    display_name: string | null;
    role: string;
    created_at: string;
  }>;
  recent_lessons: Array<{
    id: number;
    titulo: string;
    created_at: string;
    created_by: string | null;
  }>;
  recent_contents: Array<{
    id: number;
    titulo: string;
    created_at: string;
    updated_at: string | null;
  }>;
  recent_pruebas: Array<{
    id: number;
    titulo: string;
    leccion_id: number;
    created_at: string;
  }>;
}

/** Datos para gráficos de tendencias */
export interface SystemTrends {
  user_growth: Array<{
    month: string;
    count: number;
  }>;
  prueba_activity: Array<{
    month: string;
    count: number;
    aprobados: number;
  }>;
  lesson_completion: Array<{
    month: string;
    completed: number;
    in_progress: number;
  }>;
  role_distribution: Array<{
    role: string;
    count: number;
  }>;
  top_lessons: Array<{
    leccion_id: number;
    titulo: string;
    completadas: number;
  }>;
  top_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
}

/** Resumen de desempeño del sistema */
export interface PerformanceOverview {
  average_score: number;
  approval_rate: number;
  total_attempts: number;
  most_completed_lessons: Array<{
    leccion_id: number;
    titulo: string;
    completadas: number;
  }>;
  best_performing_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
  worst_performing_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
}