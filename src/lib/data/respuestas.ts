import { supabase } from "../supabaseClient";
import type { Respuesta, RespuestaInsert, RespuestaUpdate } from "../../types/db";

/**
 * Lista todas las respuestas de una pregunta
 */
export async function listRespuestasByPregunta(preguntaId: number): Promise<Respuesta[]> {
  const { data, error } = await supabase
    .from("respuesta")
    .select("*")
    .eq("pregunta_id", preguntaId)
    .order("orden", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Respuesta[];
}

/**
 * Obtiene una respuesta por ID
 */
export async function getRespuesta(id: number): Promise<Respuesta> {
  const { data, error } = await supabase
    .from("respuesta")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Respuesta;
}

/**
 * Crea una nueva respuesta
 */
export async function createRespuesta(payload: RespuestaInsert): Promise<Respuesta> {
  const { data, error } = await supabase
    .from("respuesta")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as Respuesta;
}

/**
 * Actualiza una respuesta
 */
export async function updateRespuesta(id: number, payload: RespuestaUpdate): Promise<Respuesta> {
  const { data, error } = await supabase
    .from("respuesta")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Respuesta;
}

/**
 * Elimina una respuesta
 */
export async function deleteRespuesta(id: number): Promise<void> {
  const { error } = await supabase
    .from("respuesta")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Crea múltiples respuestas a la vez
 */
export async function createRespuestas(respuestas: RespuestaInsert[]): Promise<Respuesta[]> {
  const { data, error } = await supabase
    .from("respuesta")
    .insert(respuestas)
    .select("*");

  if (error) throw error;
  return (data ?? []) as Respuesta[];
}

