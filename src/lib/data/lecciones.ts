import { supabase } from "../supabaseClient";
import type { Leccion, LeccionInsert, LeccionUpdate } from "../../types/db";

export async function listLecciones(): Promise<Leccion[]> {
  const { data, error } = await supabase
    .from("leccion")
    .select("id,titulo,descripcion,nivel,thumbnail_url,created_by")
    .order("titulo");

  if (error) throw error;
  return (data ?? []) as Leccion[];
}

export async function createLeccion(payload: LeccionInsert): Promise<Leccion> {
  const { data, error } = await supabase
    .from("leccion")
    .insert([payload])
    .select("id,titulo,descripcion,nivel,thumbnail_url,created_by")
    .single();

  if (error) throw error;
  return data as Leccion;
}

export async function searchLecciones(query: string, limit = 10): Promise<Leccion[]> {
  if (!query || !query.trim()) return [];
  const q = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("leccion")
    .select("id,titulo,descripcion,nivel,thumbnail_url")
    .ilike("titulo", q)
    .limit(limit)
    .order("titulo");

  if (error) throw error;
  return (data ?? []) as Leccion[];
}

export async function updateLeccion(id: number, payload: LeccionUpdate): Promise<Leccion> {
  const { data, error } = await supabase
    .from("leccion")
    .update(payload)
    .eq("id", id)
    .select("id,titulo,descripcion,nivel,thumbnail_url,created_by")
    .single();

  if (error) throw error;
  return data as Leccion;
}

/**
 * Elimina una lección si no tiene contenidos asociados
 */
export async function deleteLeccion(id: number): Promise<void> {
  // Verificar si hay contenidos asociados
  const { data: contenidos, error: checkError } = await supabase
    .from("contenido")
    .select("id")
    .eq("leccion_id", id)
    .limit(1);

  if (checkError) throw checkError;

  if (contenidos && contenidos.length > 0) {
    throw new Error("No se puede eliminar la lección porque tiene contenidos asociados");
  }

  // Si no hay contenidos, proceder con la eliminación
  const { error } = await supabase
    .from("leccion")
    .delete()
    .eq("id", id);

  if (error) throw error;
}