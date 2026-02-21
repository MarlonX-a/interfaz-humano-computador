import type { ContentSlide, MediaFile } from './media';

// ─────────────────────────────────────────────────────────────
// Tabla: leccion
// ─────────────────────────────────────────────────────────────

/** Tabla: leccion */
export interface Leccion {
  id: number;
  titulo: string;
  descripcion: string | null;
  nivel: string | null;
  thumbnail_url: string | null;
  created_by?: string | null;
  slides?: ContentSlide[] | null;
  media_files?: MediaFile[] | null;
}

/** Para insertar lección (sin id, se autogenera) */
export type LeccionInsert = Omit<Leccion, "id">;
export type LeccionUpdate = Partial<LeccionInsert>;
