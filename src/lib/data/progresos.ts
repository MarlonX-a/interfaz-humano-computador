import { supabase } from "../supabaseClient";
import type { Progreso, ProgresoConLeccion } from "../../types/db";

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
