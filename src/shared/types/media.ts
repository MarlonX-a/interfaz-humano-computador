// ─────────────────────────────────────────────────────────────
// Tipos de media y slides
// ─────────────────────────────────────────────────────────────

/** Archivo de media individual */
export interface MediaFile {
  url: string;
  type: 'video' | 'audio' | 'pdf' | 'embed' | 'image';
  name?: string;
  size?: number;
}

/** Slide individual para presentaciones */
export interface ContentSlide {
  title: string;
  content_html: string;
  image_url?: string | null;
  model_id?: number | null;
  // Soporte para slides subidos desde PDF
  pdf_page_url?: string | null;
}
