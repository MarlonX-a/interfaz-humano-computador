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

/**
 * Obtiene la siguiente lección dentro del mismo contenido
 * Devuelve null si no hay más lecciones o la lección actual no pertenece a ningún contenido
 */
export async function getSiguienteLeccion(leccionId: number): Promise<Leccion | null> {
  // Primero obtener a qué contenidos pertenece esta lección y su orden
  const { data: contenidoLecciones, error: clError } = await supabase
    .from("contenido_leccion")
    .select("contenido_id, orden")
    .eq("leccion_id", leccionId);

  if (clError || !contenidoLecciones || contenidoLecciones.length === 0) {
    return null;
  }

  // Tomar el primer contenido (la lección puede pertenecer a múltiples contenidos)
  const { contenido_id, orden: currentOrden } = contenidoLecciones[0];

  // Buscar la siguiente lección en ese contenido (con orden mayor)
  const { data: siguienteRelacion, error: sigError } = await supabase
    .from("contenido_leccion")
    .select("leccion_id, orden")
    .eq("contenido_id", contenido_id)
    .gt("orden", currentOrden || 0)
    .order("orden", { ascending: true })
    .limit(1);

  if (sigError || !siguienteRelacion || siguienteRelacion.length === 0) {
    return null;
  }

  // Obtener datos de la siguiente lección
  const { data: leccion, error: lecError } = await supabase
    .from("leccion")
    .select("id,titulo,descripcion,nivel,thumbnail_url,created_by")
    .eq("id", siguienteRelacion[0].leccion_id)
    .single();

  if (lecError) return null;

  return leccion as Leccion;
}