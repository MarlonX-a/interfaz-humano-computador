import { supabase } from "../supabaseClient";
import type { ModeloRA, ModeloRAInsert, ModeloRAUpdate } from "../../types/db";

export async function createModeloRA(payload: ModeloRAInsert): Promise<ModeloRA> {
  const { data, error } = await supabase
    .from("modelo_ra")
    .insert([payload])
    .select("id,leccion_id,nombre_modelo,archivo_url,tipo,descripcion,created_by")
    .single();
  if (error) {
    console.error('createModeloRA error', error);
    throw error;
  }
  return data as ModeloRA;
}

export async function listModelosByLeccion(leccionId: number): Promise<ModeloRA[]> {
  const { data, error } = await supabase
    .from("modelo_ra")
    .select("id,leccion_id,nombre_modelo,archivo_url,tipo,descripcion")
    .eq("leccion_id", leccionId);
  if (error) throw error;
  return (data ?? []) as ModeloRA[];
}

export async function getModeloById(id: number): Promise<ModeloRA | null> {
  const { data, error } = await supabase
    .from("modelo_ra")
    .select("id,leccion_id,nombre_modelo,archivo_url,tipo,descripcion")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as ModeloRA | null;
}

export async function updateModeloRA(id: number, payload: ModeloRAUpdate): Promise<ModeloRA> {
  const { data, error } = await supabase
    .from("modelo_ra")
    .update(payload)
    .eq("id", id)
    .select("id,leccion_id,nombre_modelo,archivo_url,tipo,descripcion")
    .single();
  if (error) throw error;
  return data as ModeloRA;
}
/**
 * Lista todos los modelos RA (para admin)
 */
export async function listAllModelos(): Promise<ModeloRA[]> {
  const { data, error } = await supabase
    .from("modelo_ra")
    .select("*")
    .order("nombre_modelo");
  if (error) throw error;
  return (data ?? []) as ModeloRA[];
}

/**
 * Elimina un modelo RA
 */
export async function deleteModeloRA(id: number): Promise<void> {
  const { error } = await supabase
    .from("modelo_ra")
    .delete()
    .eq("id", id);
  if (error) throw error;
}