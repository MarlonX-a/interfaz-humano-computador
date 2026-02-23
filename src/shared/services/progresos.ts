import { supabase } from "@/shared/lib/supabaseClient";
import type { Progreso, ProgresoConLeccion } from "@/shared/types";
import { getContenidosSeguidos } from "@/shared/services/seguimiento";

/** Estado de progreso de un contenido para un estudiante */
export interface ContentProgress {
  contenido_id: number;
  titulo: string;
  lecciones_total: number;
  lecciones_completadas: number;
  completado: boolean;
  promedio_puntaje: number;
  aprobado: boolean; // promedio >= 70
}

/**
 * Obtiene progresos de un usuario y retorna junto la lección
 */
export async function getProgresosByUsuario(usuarioId: string): Promise<ProgresoConLeccion[]> {
  const { data, error } = await supabase
    .from("progreso")
    .select("id,usuario_id,leccion_id,completado,fecha_ultimo_acceso,puntaje,leccion(id,titulo,nivel,thumbnail_url,descripcion)")
    .eq("usuario_id", usuarioId);

  if (error) throw error;
  return (data ?? []) as ProgresoConLeccion[];
}

/**
 * Calcula el porcentaje de completado para una o más lecciones para un usuario
 * - Usa `leccion_seccion` y `progreso_seccion` para determinar cuántas secciones obligatorias
 *   están completadas o parciales (puntuacion)
 * - Devuelve un mapa { [leccion_id]: porcentajeEntero }
 */
export async function getCompletionPercentsForUser(usuarioId: string, leccionIds: number[]): Promise<Record<number, number>> {
  if (!leccionIds || leccionIds.length === 0) return {};
  try {
    // Obtener secciones para las lecciones indicadas
    const { data: secciones, error: seccionesErr } = await supabase
      .from('leccion_seccion')
      .select('id,leccion_id,es_obligatorio')
      .in('leccion_id', leccionIds);
    if (seccionesErr) throw seccionesErr;

    // Mapear secciones por leccion
    const sectionsByLesson: Record<number, any[]> = {};
    (secciones || []).forEach((s: any) => {
      if (!sectionsByLesson[s.leccion_id]) sectionsByLesson[s.leccion_id] = [];
      sectionsByLesson[s.leccion_id].push(s);
    });

    // Obtener progresos por sección del usuario para las secciones encontradas
    const sectionIds = (secciones || []).map((s: any) => s.id).filter(Boolean);
    let progresosSeccion: any[] = [];
    if (sectionIds.length > 0) {
      const { data: psData, error: psErr } = await supabase
        .from('progreso_seccion')
        .select('leccion_seccion_id,completado,puntuacion')
        .in('leccion_seccion_id', sectionIds)
        .eq('user_id', usuarioId);
      if (psErr) throw psErr;
      progresosSeccion = psData || [];
    }

    const progressBySection: Record<number, any> = {};
    progresosSeccion.forEach((p: any) => { progressBySection[p.leccion_seccion_id] = p; });

    const result: Record<number, number> = {};

    for (const lid of leccionIds) {
      const secs = sectionsByLesson[lid] || [];
      // Considerar solo secciones obligatorias para el cálculo; si no hay obligatorias, usar todas
      const relevantSecs = secs.filter((s) => s.es_obligatorio !== false);
      const total = relevantSecs.length || secs.length || 0;
      if (total === 0) {
        // Consistencia con getEstadisticasProgresoLeccion: si no hay secciones, considerar 100%
        result[lid] = 100;
        continue;
      }

      // Usar únicamente el estado `completado` para calcular porcentaje, igual que la vista detallada
      let completadas = 0;
      for (const s of relevantSecs) {
        const p = progressBySection[s.id];
        if (p && p.completado) {
          completadas += 1;
        }
      }
      const pct = Math.round((completadas / total) * 100);
      result[lid] = Math.max(0, Math.min(100, pct));
    }

    return result;
  } catch (err) {
    console.error('Error computing completion percents', err);
    // En caso de error devolvemos ceros para no romper la UI
    const obj: Record<number, number> = {};
    leccionIds.forEach((id) => { obj[id] = 0; });
    return obj;
  }
}

/**
 * Obtiene el progreso para una lección y usuario específica
 */
export async function getProgresoByUsuarioAndLeccion(usuarioId: string, leccionId: number): Promise<Progreso | null> {
  const { data, error } = await supabase
    .from("progreso")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("leccion_id", leccionId)
    .maybeSingle();

  if (error) throw error;
  return data as Progreso | null;
}

/**
 * Upsert progreso safely using select -> update or insert to avoid relying on DB unique constraint
 */
export async function upsertProgresoLastAccess(usuarioId: string, leccionId: number, payload: Partial<Progreso> = {}): Promise<Progreso> {
  const existing = await getProgresoByUsuarioAndLeccion(usuarioId, leccionId);
  if (existing && existing.id) {
    const { data, error } = await supabase
      .from('progreso')
      .update({ ...payload })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as Progreso;
  }
  const toInsert: Partial<Progreso> = {
    usuario_id: usuarioId,
    leccion_id: leccionId,
    fecha_ultimo_acceso: new Date().toISOString(),
    ...payload,
  };
  const { data, error } = await supabase
    .from('progreso')
    .insert([toInsert])
    .select()
    .single();
  if (error) throw error;
  return data as Progreso;
}

/**
 * Obtiene el progreso de los contenidos que el estudiante SIGUE.
 * Un contenido está "completado" si todas sus lecciones (via contenido_leccion) tienen completado=true.
 * Un contenido está "aprobado" si el promedio de puntaje de sus lecciones >= 70.
 */
export async function getContentProgressForUser(usuarioId: string): Promise<ContentProgress[]> {
  // 1. Obtener solo los contenidos que el usuario sigue
  const seguidos = await getContenidosSeguidos(usuarioId);
  if (seguidos.length === 0) return [];

  const { data: contenidos, error: contErr } = await supabase
    .from('contenido')
    .select('id, titulo')
    .in('id', seguidos);
  if (contErr) throw contErr;
  if (!contenidos || contenidos.length === 0) return [];

  const contenidoIds = contenidos.map((c: any) => c.id);

  // 2. Obtener relaciones contenido_leccion
  const { data: contenidoLecciones, error: clErr } = await supabase
    .from('contenido_leccion')
    .select('contenido_id, leccion_id')
    .in('contenido_id', contenidoIds);
  if (clErr) throw clErr;

  // Agrupar lecciones por contenido
  const leccionesPorContenido: Record<number, number[]> = {};
  (contenidoLecciones || []).forEach((cl: any) => {
    if (!leccionesPorContenido[cl.contenido_id]) {
      leccionesPorContenido[cl.contenido_id] = [];
    }
    leccionesPorContenido[cl.contenido_id].push(cl.leccion_id);
  });

  // 3. Obtener todos los progresos del estudiante
  const { data: progresos, error: progErr } = await supabase
    .from('progreso')
    .select('leccion_id, completado, puntaje')
    .eq('usuario_id', usuarioId);
  if (progErr) throw progErr;

  const progresoByLeccion: Record<number, { completado: boolean; puntaje: number | null }> = {};
  (progresos || []).forEach((p: any) => {
    if (p.leccion_id) {
      const existing = progresoByLeccion[p.leccion_id];
      // Si hay duplicados, priorizar completado=true y el mayor puntaje
      if (!existing || (!existing.completado && p.completado) || (p.puntaje != null && (existing.puntaje == null || p.puntaje > existing.puntaje))) {
        progresoByLeccion[p.leccion_id] = {
          completado: existing ? (existing.completado || !!p.completado) : !!p.completado,
          puntaje: Math.max(existing?.puntaje ?? 0, p.puntaje ?? 0) || null,
        };
      }
    }
  });

  // 4. Calcular progreso por contenido
  const results: ContentProgress[] = [];
  for (const contenido of contenidos) {
    const leccionIds = leccionesPorContenido[contenido.id] || [];
    if (leccionIds.length === 0) continue; // skip content without lessons

    let completadas = 0;
    let sumPuntaje = 0;
    let countPuntaje = 0;

    for (const lid of leccionIds) {
      const prog = progresoByLeccion[lid];
      if (prog?.completado) completadas++;
      if (prog?.puntaje != null) {
        sumPuntaje += prog.puntaje;
        countPuntaje++;
      }
    }

    const lTotal = leccionIds.length;
    const esCompletado = completadas === lTotal;
    const promedio = countPuntaje > 0 ? Math.round((sumPuntaje / countPuntaje) * 100) / 100 : 0;
    const esAprobado = esCompletado && promedio >= 70;

    results.push({
      contenido_id: contenido.id,
      titulo: contenido.titulo,
      lecciones_total: lTotal,
      lecciones_completadas: completadas,
      completado: esCompletado,
      promedio_puntaje: promedio,
      aprobado: esAprobado,
    });
  }

  return results;
}

/**
 * Obtiene el progreso de contenidos de una lista específica de contenidos para un estudiante.
 * Usado en el panel de desempeño del profesor.
 */
export async function getContentProgressForUserByContentIds(
  usuarioId: string,
  contenidoIds: number[]
): Promise<ContentProgress[]> {
  if (!contenidoIds || contenidoIds.length === 0) return [];

  const { data: contenidos, error: contErr } = await supabase
    .from('contenido')
    .select('id, titulo')
    .in('id', contenidoIds);
  if (contErr) throw contErr;
  if (!contenidos || contenidos.length === 0) return [];

  const { data: contenidoLecciones, error: clErr } = await supabase
    .from('contenido_leccion')
    .select('contenido_id, leccion_id')
    .in('contenido_id', contenidoIds);
  if (clErr) throw clErr;

  const leccionesPorContenido: Record<number, number[]> = {};
  (contenidoLecciones || []).forEach((cl: any) => {
    if (!leccionesPorContenido[cl.contenido_id]) leccionesPorContenido[cl.contenido_id] = [];
    leccionesPorContenido[cl.contenido_id].push(cl.leccion_id);
  });

  const allLeccionIds = Array.from(new Set((contenidoLecciones || []).map((cl: any) => cl.leccion_id)));

  let progresoByLeccion: Record<number, { completado: boolean; puntaje: number | null }> = {};
  if (allLeccionIds.length > 0) {
    const { data: progresos, error: progErr } = await supabase
      .from('progreso')
      .select('leccion_id, completado, puntaje')
      .eq('usuario_id', usuarioId)
      .in('leccion_id', allLeccionIds);
    if (progErr) throw progErr;
    (progresos || []).forEach((p: any) => {
      if (p.leccion_id) {
        const existing = progresoByLeccion[p.leccion_id];
        // Si hay duplicados, priorizar completado=true y el mayor puntaje
        if (!existing || (!existing.completado && p.completado) || (p.puntaje != null && (existing.puntaje == null || p.puntaje > existing.puntaje))) {
          progresoByLeccion[p.leccion_id] = {
            completado: existing ? (existing.completado || !!p.completado) : !!p.completado,
            puntaje: Math.max(existing?.puntaje ?? 0, p.puntaje ?? 0) || null,
          };
        }
      }
    });
  }

  const results: ContentProgress[] = [];
  for (const contenido of contenidos) {
    const leccionIds = leccionesPorContenido[contenido.id] || [];
    if (leccionIds.length === 0) continue;

    let completadas = 0;
    let sumPuntaje = 0;
    let countPuntaje = 0;

    for (const lid of leccionIds) {
      const prog = progresoByLeccion[lid];
      if (prog?.completado) completadas++;
      if (prog?.puntaje != null) { sumPuntaje += prog.puntaje; countPuntaje++; }
    }

    const lTotal = leccionIds.length;
    const esCompletado = completadas === lTotal;
    const promedio = countPuntaje > 0 ? Math.round((sumPuntaje / countPuntaje) * 100) / 100 : 0;

    results.push({
      contenido_id: contenido.id,
      titulo: contenido.titulo,
      lecciones_total: lTotal,
      lecciones_completadas: completadas,
      completado: esCompletado,
      promedio_puntaje: promedio,
      aprobado: esCompletado && promedio >= 70,
    });
  }

  return results;
}
