import { supabase } from "../supabaseClient";
import type { Pregunta, PreguntaInsert, PreguntaUpdate, PreguntaConRespuestas } from "../../types/db";

/**
 * Lista todas las preguntas de una prueba
 */
export async function listPreguntasByPrueba(pruebaId: number): Promise<PreguntaConRespuestas[]> {
  const { data: preguntas, error: preguntasError } = await supabase
    .from("pregunta")
    .select("*")
    .eq("prueba_id", pruebaId)
    .order("orden", { ascending: true, nullsFirst: false });

  if (preguntasError) throw preguntasError;

  const preguntaIds = (preguntas || []).map((p) => p.id);
  if (preguntaIds.length === 0) return [];

  // Obtener respuestas
  const { data: respuestas, error: respuestasError } = await supabase
    .from("respuesta")
    .select("*")
    .in("pregunta_id", preguntaIds)
    .order("orden", { ascending: true, nullsFirst: false });

  if (respuestasError) throw respuestasError;

  // Combinar
  return (preguntas || []).map((pregunta) => ({
    ...pregunta,
    respuestas: (respuestas || []).filter((r) => r.pregunta_id === pregunta.id),
  })) as PreguntaConRespuestas[];
}

/**
 * Obtiene una pregunta con sus respuestas
 */
export async function getPregunta(id: number): Promise<PreguntaConRespuestas> {
  const { data: pregunta, error: preguntaError } = await supabase
    .from("pregunta")
    .select("*")
    .eq("id", id)
    .single();

  if (preguntaError) throw preguntaError;

  const { data: respuestas, error: respuestasError } = await supabase
    .from("respuesta")
    .select("*")
    .eq("pregunta_id", id)
    .order("orden", { ascending: true, nullsFirst: false });

  if (respuestasError) throw respuestasError;

  return {
    ...pregunta,
    respuestas: respuestas || [],
  } as PreguntaConRespuestas;
}

/**
 * Crea una nueva pregunta
 */
export async function createPregunta(payload: PreguntaInsert): Promise<Pregunta> {
  const { data, error } = await supabase
    .from("pregunta")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as Pregunta;
}

/**
 * Actualiza una pregunta
 */
export async function updatePregunta(id: number, payload: PreguntaUpdate): Promise<Pregunta> {
  const { data, error } = await supabase
    .from("pregunta")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Pregunta;
}

/**
 * Elimina una pregunta (las respuestas se eliminan por CASCADE)
 */
export async function deletePregunta(id: number): Promise<void> {
  const { error } = await supabase
    .from("pregunta")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

