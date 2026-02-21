import type { Leccion } from './leccion';
import type { Contenido, ContenidoLeccion } from './contenido';
import type { ModeloRA } from './modelo';
import type { Prueba, PreguntaConRespuestas } from './prueba';
import type { LeccionSeccionCompleta } from './seccion';

// ─────────────────────────────────────────────────────────────
// Tipos compuestos (combinan múltiples tablas)
// ─────────────────────────────────────────────────────────────

/** Lección con contenido y modelos RA anidados */
export interface LeccionCompleta extends Leccion {
  contenidos: Contenido[];
  modelos_ra: ModeloRA[];
  preguntas: PreguntaConRespuestas[];
  pruebas: Prueba[];
  secciones?: LeccionSeccionCompleta[];
}

/** Contenido con lecciones asociadas */
export interface ContenidoConLecciones extends Contenido {
  lecciones: Leccion[];
}

/** ContenidoLeccion con datos de lección */
export interface ContenidoLeccionConLeccion extends ContenidoLeccion {
  leccion: Leccion;
}
