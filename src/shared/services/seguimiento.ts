import { supabase } from "@/shared/lib/supabaseClient";

/** Registro de seguimiento de contenido */
export interface ContenidoSeguimiento {
  id: number;
  usuario_id: string;
  contenido_id: number;
  fecha_seguimiento: string;
}

/**
 * Obtiene los IDs de contenidos que el usuario sigue
 */
export async function getContenidosSeguidos(usuarioId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("contenido_seguimiento")
    .select("contenido_id")
    .eq("usuario_id", usuarioId);
  if (error) throw error;
  return (data || []).map((d: any) => d.contenido_id);
}

/**
 * Obtiene los registros completos de seguimiento de un usuario
 */
export async function getSeguimientosUsuario(usuarioId: string): Promise<ContenidoSeguimiento[]> {
  const { data, error } = await supabase
    .from("contenido_seguimiento")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("fecha_seguimiento", { ascending: false });
  if (error) throw error;
  return (data || []) as ContenidoSeguimiento[];
}

/**
 * Sigue un contenido
 */
export async function seguirContenido(usuarioId: string, contenidoId: number): Promise<void> {
  const { error } = await supabase
    .from("contenido_seguimiento")
    .insert({ usuario_id: usuarioId, contenido_id: contenidoId });
  if (error) throw error;
}

/**
 * Deja de seguir un contenido
 */
export async function dejarDeSeguirContenido(usuarioId: string, contenidoId: number): Promise<void> {
  const { error } = await supabase
    .from("contenido_seguimiento")
    .delete()
    .eq("usuario_id", usuarioId)
    .eq("contenido_id", contenidoId);
  if (error) throw error;
}

/**
 * Verifica si el usuario sigue un contenido específico
 */
export async function sigueContenido(usuarioId: string, contenidoId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from("contenido_seguimiento")
    .select("id")
    .eq("usuario_id", usuarioId)
    .eq("contenido_id", contenidoId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/**
 * Obtiene los IDs de los estudiantes que siguen un contenido específico
 */
export async function getSeguidoresByContenido(contenidoId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from("contenido_seguimiento")
    .select("usuario_id")
    .eq("contenido_id", contenidoId);
  if (error) throw error;
  return (data || []).map((d: any) => d.usuario_id);
}

/**
 * Obtiene los IDs de los estudiantes que siguen cualquier contenido de una lista
 */
export async function getSeguidoresByContenidos(contenidoIds: number[]): Promise<Map<string, number[]>> {
  if (!contenidoIds || contenidoIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("contenido_seguimiento")
    .select("usuario_id, contenido_id")
    .in("contenido_id", contenidoIds);
  if (error) throw error;

  // Map: userId -> [contenidoId, ...]
  const map = new Map<string, number[]>();
  (data || []).forEach((d: any) => {
    const arr = map.get(d.usuario_id) || [];
    arr.push(d.contenido_id);
    map.set(d.usuario_id, arr);
  });
  return map;
}
