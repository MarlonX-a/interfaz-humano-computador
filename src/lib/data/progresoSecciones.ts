import { supabase } from "../supabaseClient";
import type {
  ProgresoSeccion,
  ProgresoSeccionUpdate,
} from "../../types/db";

/**
 * Obtiene el progreso de una sección para un usuario
 */
export async function getProgresoSeccion(
  userId: string,
  seccionId: number
): Promise<ProgresoSeccion | null> {
  const { data, error } = await supabase
    .from("progreso_seccion")
    .select("*")
    .eq("user_id", userId)
    .eq("leccion_seccion_id", seccionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as ProgresoSeccion | null;
}

/**
 * Obtiene todos los progresos de un usuario para una lección
 */
export async function listProgresosByLeccion(
  userId: string,
  leccionId: number
): Promise<ProgresoSeccion[]> {
  const { data, error } = await supabase
    .from("progreso_seccion")
    .select(`
      *,
      leccion_seccion!inner(leccion_id)
    `)
    .eq("user_id", userId)
    .eq("leccion_seccion.leccion_id", leccionId);

  if (error) throw error;
  return (data ?? []) as ProgresoSeccion[];
}

/**
 * Crea o actualiza el progreso de una sección (upsert)
 */
export async function upsertProgresoSeccion(
  userId: string,
  seccionId: number,
  payload: Partial<ProgresoSeccionUpdate>
): Promise<ProgresoSeccion> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("progreso_seccion")
    .upsert(
      {
        user_id: userId,
        leccion_seccion_id: seccionId,
        ...payload,
        updated_at: now,
        ...(payload.completado ? { fecha_completado: now } : {}),
      },
      { onConflict: "user_id,leccion_seccion_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data as ProgresoSeccion;
}

/**
 * Marca una sección como completada
 */
export async function marcarSeccionCompletada(
  userId: string,
  seccionId: number,
  puntuacion?: number
): Promise<ProgresoSeccion> {
  return upsertProgresoSeccion(userId, seccionId, {
    completado: true,
    puntuacion: puntuacion ?? null,
    fecha_completado: new Date().toISOString(),
  });
}

/**
 * Incrementa el tiempo dedicado a una sección
 */
export async function incrementarTiempoSeccion(
  userId: string,
  seccionId: number,
  segundos: number
): Promise<void> {
  // Obtener progreso actual
  const progreso = await getProgresoSeccion(userId, seccionId);
  const tiempoActual = progreso?.tiempo_dedicado ?? 0;

  await upsertProgresoSeccion(userId, seccionId, {
    tiempo_dedicado: tiempoActual + segundos,
  });
}

/**
 * Incrementa los intentos de una sección (para pruebas)
 */
export async function incrementarIntentosSeccion(
  userId: string,
  seccionId: number
): Promise<void> {
  const progreso = await getProgresoSeccion(userId, seccionId);
  const intentosActuales = progreso?.intentos ?? 0;

  await upsertProgresoSeccion(userId, seccionId, {
    intentos: intentosActuales + 1,
  });
}

/**
 * Verifica si todas las secciones obligatorias de una lección están completadas
 */
export async function verificarLeccionCompletada(
  userId: string,
  leccionId: number
): Promise<boolean> {
  // Obtener secciones obligatorias
  const { data: secciones, error: seccionesError } = await supabase
    .from("leccion_seccion")
    .select("id")
    .eq("leccion_id", leccionId)
    .eq("es_obligatorio", true);

  if (seccionesError) throw seccionesError;
  if (!secciones || secciones.length === 0) return true;

  const seccionIds = secciones.map((s) => s.id);

  // Obtener progresos completados
  const { data: progresos, error: progresosError } = await supabase
    .from("progreso_seccion")
    .select("leccion_seccion_id")
    .eq("user_id", userId)
    .eq("completado", true)
    .in("leccion_seccion_id", seccionIds);

  if (progresosError) throw progresosError;

  const completadas = new Set((progresos ?? []).map((p) => p.leccion_seccion_id));
  return seccionIds.every((id) => completadas.has(id));
}

/**
 * Obtiene estadísticas de progreso para una lección
 */
export async function getEstadisticasProgresoLeccion(
  userId: string,
  leccionId: number
): Promise<{
  totalSecciones: number;
  seccionesCompletadas: number;
  porcentajeCompletado: number;
  tiempoTotalDedicado: number;
}> {
  // Obtener todas las secciones
  const { data: secciones, error: seccionesError } = await supabase
    .from("leccion_seccion")
    .select("id")
    .eq("leccion_id", leccionId);

  if (seccionesError) throw seccionesError;

  const totalSecciones = secciones?.length ?? 0;
  if (totalSecciones === 0) {
    return {
      totalSecciones: 0,
      seccionesCompletadas: 0,
      porcentajeCompletado: 100,
      tiempoTotalDedicado: 0,
    };
  }

  const seccionIds = secciones!.map((s) => s.id);

  // Obtener progresos
  const { data: progresos, error: progresosError } = await supabase
    .from("progreso_seccion")
    .select("leccion_seccion_id, completado, tiempo_dedicado")
    .eq("user_id", userId)
    .in("leccion_seccion_id", seccionIds);

  if (progresosError) throw progresosError;

  const seccionesCompletadas = (progresos ?? []).filter((p) => p.completado).length;
  const tiempoTotalDedicado = (progresos ?? []).reduce(
    (acc, p) => acc + (p.tiempo_dedicado ?? 0),
    0
  );

  return {
    totalSecciones,
    seccionesCompletadas,
    porcentajeCompletado: Math.round((seccionesCompletadas / totalSecciones) * 100),
    tiempoTotalDedicado,
  };
}
