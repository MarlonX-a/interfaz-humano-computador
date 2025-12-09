import { supabase } from "../supabaseClient";
import type { Leccion, LeccionInsert } from "../../types/db";

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