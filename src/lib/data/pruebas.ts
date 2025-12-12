import { supabase } from "../supabaseClient";
import type { Prueba, PruebaInsert, PruebaUpdate, PruebaCompleta, PreguntaConRespuestas } from "../../types/db";

/**
 * Lista todas las pruebas de una lección
 */
export async function listPruebasByLeccion(leccionId: number): Promise<Prueba[]> {
  const { data, error } = await supabase
    .from("prueba")
    .select("*")
    .eq("leccion_id", leccionId)
    .order("orden", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Prueba[];
}

/**
 * Obtiene una prueba completa con sus preguntas y respuestas
 */
export async function getPruebaCompleta(id: number): Promise<PruebaCompleta> {
  // Obtener prueba
  const { data: prueba, error: pruebaError } = await supabase
    .from("prueba")
    .select("*")
    .eq("id", id)
    .single();

  if (pruebaError) throw pruebaError;

  // Obtener preguntas de la prueba
  const { data: preguntas, error: preguntasError } = await supabase
    .from("pregunta")
    .select("*")
    .eq("prueba_id", id)
    .order("orden", { ascending: true, nullsFirst: false });

  if (preguntasError) throw preguntasError;

  // Obtener respuestas para cada pregunta
  const preguntaIds = (preguntas || []).map((p) => p.id);
  let respuestas: any[] = [];

  if (preguntaIds.length > 0) {
    const { data: respuestasData, error: respuestasError } = await supabase
      .from("respuesta")
      .select("*")
      .in("pregunta_id", preguntaIds)
      .order("orden", { ascending: true, nullsFirst: false });

    if (respuestasError) throw respuestasError;
    respuestas = respuestasData || [];
  }

  // Combinar preguntas con sus respuestas
  const preguntasConRespuestas: PreguntaConRespuestas[] = (preguntas || []).map((pregunta) => ({
    ...pregunta,
    respuestas: respuestas.filter((r) => r.pregunta_id === pregunta.id),
  }));

  return {
    ...prueba,
    preguntas: preguntasConRespuestas,
  } as PruebaCompleta;
}

/**
 * Obtiene una prueba por ID
 */
export async function getPrueba(id: number): Promise<Prueba> {
  const { data, error } = await supabase
    .from("prueba")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Prueba;
}

/**
 * Crea una nueva prueba
 */
export async function createPrueba(payload: PruebaInsert): Promise<Prueba> {
  const { data, error } = await supabase
    .from("prueba")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as Prueba;
}

/**
 * Actualiza una prueba
 */
export async function updatePrueba(id: number, payload: PruebaUpdate): Promise<Prueba> {
  const { data, error } = await supabase
    .from("prueba")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Prueba;
}

/**
 * Elimina una prueba (las preguntas y respuestas se eliminan por CASCADE)
 */
export async function deletePrueba(id: number): Promise<void> {
  const { error } = await supabase
    .from("prueba")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Lista pruebas creadas por un profesor
 * Si isAdmin es true, retorna todas las pruebas del sistema
 */
export async function listPruebasByTeacher(userId: string, isAdmin: boolean = false): Promise<Prueba[]> {
  if (isAdmin) {
    // Si es admin, obtener todas las pruebas
    const { data, error } = await supabase
      .from("prueba")
      .select("*")
      .order("orden", { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data ?? []) as Prueba[];
  }

  // Si es profesor, obtener solo sus pruebas
  // Obtener lecciones del profesor
  const { data: lecciones, error: leccionesError } = await supabase
    .from("leccion")
    .select("id")
    .eq("created_by", userId);

  if (leccionesError) throw leccionesError;

  const leccionIds = (lecciones || []).map((l) => l.id);
  if (leccionIds.length === 0) return [];

  // Obtener pruebas de esas lecciones
  const { data, error } = await supabase
    .from("prueba")
    .select("*")
    .in("leccion_id", leccionIds)
    .order("orden", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Prueba[];
}

