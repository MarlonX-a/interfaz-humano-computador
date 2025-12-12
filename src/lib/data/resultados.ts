import { supabase } from "../supabaseClient";
import type { ResultadoPrueba, ResultadoPruebaInsert, ResultadoPruebaUpdate } from "../../types/db";

/**
 * Crea un resultado de prueba
 */
export async function createResultadoPrueba(payload: ResultadoPruebaInsert): Promise<ResultadoPrueba> {
  const { data, error } = await supabase
    .from("resultado_prueba")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as ResultadoPrueba;
}

/**
 * Obtiene resultados de un usuario para una prueba
 */
export async function getResultadosByUsuarioAndPrueba(
  usuarioId: string,
  pruebaId: number
): Promise<ResultadoPrueba[]> {
  const { data, error } = await supabase
    .from("resultado_prueba")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("prueba_id", pruebaId)
    .order("started_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ResultadoPrueba[];
}

/**
 * Obtiene el mejor resultado de un usuario para una prueba
 */
export async function getMejorResultado(usuarioId: string, pruebaId: number): Promise<ResultadoPrueba | null> {
  const { data, error } = await supabase
    .from("resultado_prueba")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("prueba_id", pruebaId)
    .order("puntaje_obtenido", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as ResultadoPrueba | null;
}

/**
 * Actualiza un resultado de prueba
 */
export async function updateResultadoPrueba(
  id: number,
  payload: ResultadoPruebaUpdate
): Promise<ResultadoPrueba> {
  const { data, error } = await supabase
    .from("resultado_prueba")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ResultadoPrueba;
}

/**
 * Lista todos los resultados de una prueba (para profesores)
 */
export async function listResultadosByPrueba(pruebaId: number): Promise<ResultadoPrueba[]> {
  const { data, error } = await supabase
    .from("resultado_prueba")
    .select("*")
    .eq("prueba_id", pruebaId)
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ResultadoPrueba[];
}

