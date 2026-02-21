// ─────────────────────────────────────────────────────────────
// Tabla: modelo_ra y contenido_modelo
// ─────────────────────────────────────────────────────────────

/** Tabla: modelo_ra (Realidad Aumentada) */
export interface ModeloRA {
  id: number;
  leccion_id: number | null;
  nombre_modelo: string;
  archivo_url: string;
  tipo: string | null;
  descripcion: string | null;
  created_by?: string | null;
  // Nuevos campos para auto-matching
  keywords?: string[] | null;
  molecule_formula?: string | null;
  categoria?: string | null;
  descripcion_corta?: string | null;
}

/** Tabla: contenido_modelo (vincula modelos a contenidos específicos) */
export interface ContenidoModelo {
  id: number;
  contenido_id: number;
  modelo_ra_id: number;
  orden: number;
  es_principal: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Para insertar modelo RA */
export type ModeloRAInsert = Omit<ModeloRA, "id">;
export type ModeloRAUpdate = Partial<ModeloRAInsert>;

/** Para insertar contenido_modelo */
export type ContenidoModeloInsert = Omit<ContenidoModelo, "id" | "created_at" | "updated_at">;
export type ContenidoModeloUpdate = Partial<ContenidoModeloInsert>;
