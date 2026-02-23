import type { ContentSlide, MediaFile } from './media';

// ─────────────────────────────────────────────────────────────
// Tabla: contenido y contenido_leccion
// ─────────────────────────────────────────────────────────────

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
  // Nuevos campos para multimedia
  media_url?: string | null;
  media_type?: 'video' | 'audio' | 'pdf' | 'embed' | 'image' | null;
  slides?: ContentSlide[] | null;
  duracion_estimada?: number | null;
  // Múltiples archivos de media
  media_files?: MediaFile[] | null;
  // Creador del contenido
  created_by?: string | null;
}

/** Tabla intermedia: contenido_leccion (relación muchos-a-muchos) */
export interface ContenidoLeccion {
  id: number;
  contenido_id: number;
  leccion_id: number;
  orden: number | null;
  created_at?: string | null;
}

/** Para insertar contenido (sin id ni campos de versión) */
export type ContenidoInsert = Omit<Contenido, "id" | "version" | "updated_at" | "updated_by">;
export type ContenidoUpdate = Partial<ContenidoInsert>;
