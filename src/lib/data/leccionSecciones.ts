import { supabase } from "../supabaseClient";
import type {
  LeccionSeccion,
  LeccionSeccionInsert,
  LeccionSeccionUpdate,
  LeccionSeccionCompleta,
  ProgresoSeccion,
  Contenido,
  Prueba,
  ModeloRA,
} from "../../types/db";

/**
 * Lista todas las secciones de una lección ordenadas
 */
export async function listSeccionesByLeccion(leccionId: number): Promise<LeccionSeccion[]> {
  const { data, error } = await supabase
    .from("leccion_seccion")
    .select("*")
    .eq("leccion_id", leccionId)
    .order("orden", { ascending: true });

  if (error) throw error;
  return (data ?? []) as LeccionSeccion[];
}

/**
 * Lista secciones con datos completos (contenido, prueba, modelo, progreso)
 */
export async function listSeccionesCompletasByLeccion(
  leccionId: number,
  userId?: string
): Promise<LeccionSeccionCompleta[]> {
  // Obtener secciones
  const secciones = await listSeccionesByLeccion(leccionId);
  if (secciones.length === 0) return [];

  // Obtener IDs únicos
  const contenidoIds = secciones.filter((s) => s.contenido_id).map((s) => s.contenido_id!);
  const pruebaIds = secciones.filter((s) => s.prueba_id).map((s) => s.prueba_id!);
  const modeloIds = secciones.filter((s) => s.modelo_id).map((s) => s.modelo_id!);
  const seccionIds = secciones.map((s) => s.id);

  // Cargar datos en paralelo
  const [contenidosRes, pruebasRes, modelosRes, progresosRes] = await Promise.all([
    contenidoIds.length > 0
      ? supabase.from("contenido").select("*").in("id", contenidoIds)
      : Promise.resolve({ data: [], error: null }),
    pruebaIds.length > 0
      ? supabase.from("prueba").select("*").in("id", pruebaIds)
      : Promise.resolve({ data: [], error: null }),
    modeloIds.length > 0
      ? supabase.from("modelo_ra").select("*").in("id", modeloIds)
      : Promise.resolve({ data: [], error: null }),
    userId
      ? supabase.from("progreso_seccion").select("*").eq("user_id", userId).in("leccion_seccion_id", seccionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  // Mapear datos
  const contenidosMap = new Map<number, Contenido>(
    ((contenidosRes.data ?? []) as Contenido[]).map((c) => [c.id, c])
  );
  const pruebasMap = new Map<number, Prueba>(
    ((pruebasRes.data ?? []) as Prueba[]).map((p) => [p.id, p])
  );
  const modelosMap = new Map<number, ModeloRA>(
    ((modelosRes.data ?? []) as ModeloRA[]).map((m) => [m.id, m])
  );
  const progresosMap = new Map<number, ProgresoSeccion>(
    ((progresosRes.data ?? []) as ProgresoSeccion[]).map((p) => [p.leccion_seccion_id, p])
  );

  // Crear set de secciones completadas para validar requisitos
  const seccionesCompletadas = new Set<number>();
  progresosMap.forEach((progreso, seccionId) => {
    if (progreso.completado) {
      seccionesCompletadas.add(seccionId);
    }
  });

  // Construir secciones completas
  return secciones.map((seccion) => {
    // Verificar si está bloqueada por requisitos no cumplidos
    const bloqueada = seccion.requisitos.some(
      (reqId) => !seccionesCompletadas.has(reqId)
    );

    return {
      ...seccion,
      contenido: seccion.contenido_id ? contenidosMap.get(seccion.contenido_id) ?? null : null,
      prueba: seccion.prueba_id ? pruebasMap.get(seccion.prueba_id) ?? null : null,
      modelo: seccion.modelo_id ? modelosMap.get(seccion.modelo_id) ?? null : null,
      progreso: progresosMap.get(seccion.id) ?? null,
      bloqueada,
    };
  });
}

/**
 * Crea una nueva sección en una lección
 */
export async function createSeccion(payload: LeccionSeccionInsert): Promise<LeccionSeccion> {
  const { data, error } = await supabase
    .from("leccion_seccion")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as LeccionSeccion;
}

/**
 * Actualiza una sección existente
 */
export async function updateSeccion(id: number, payload: LeccionSeccionUpdate): Promise<LeccionSeccion> {
  const { data, error } = await supabase
    .from("leccion_seccion")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as LeccionSeccion;
}

/**
 * Elimina una sección
 */
export async function deleteSeccion(id: number): Promise<void> {
  const { error } = await supabase.from("leccion_seccion").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Reordena las secciones de una lección
 */
export async function reorderSecciones(
  leccionId: number,
  seccionOrders: { id: number; orden: number }[]
): Promise<void> {
  // Actualizar cada sección con su nuevo orden
  const updates = seccionOrders.map(({ id, orden }) =>
    supabase.from("leccion_seccion").update({ orden }).eq("id", id).eq("leccion_id", leccionId)
  );

  const results = await Promise.all(updates);
  const errorResult = results.find((r) => r.error);
  if (errorResult?.error) throw errorResult.error;
}

/**
 * Obtiene el siguiente orden disponible para una lección
 */
export async function getNextOrden(leccionId: number): Promise<number> {
  const { data, error } = await supabase
    .from("leccion_seccion")
    .select("orden")
    .eq("leccion_id", leccionId)
    .order("orden", { ascending: false })
    .limit(1);

  if (error) throw error;
  const maxOrden = data?.[0]?.orden ?? 0;
  return maxOrden + 10;
}
