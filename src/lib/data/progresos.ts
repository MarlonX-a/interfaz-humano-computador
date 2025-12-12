import { supabase } from "../supabaseClient";
import type { Progreso, ProgresoConLeccion } from "../../types/db";

/**
 * Obtiene progresos de un usuario y retorna junto la lección
 */
export async function getProgresosByUsuario(usuarioId: string): Promise<ProgresoConLeccion[]> {
  const { data, error } = await supabase
    .from("progreso")
    .select("id,usuario_id,leccion_id,completado,fecha_ultimo_acceso,puntaje,leccion(id,titulo,nivel,thumbnail_url,descripcion)")
    .eq("usuario_id", usuarioId);

  if (error) throw error;
  return (data ?? []) as ProgresoConLeccion[];
}

/**
 * Obtiene el progreso para una lección y usuario específica
 */
export async function getProgresoByUsuarioAndLeccion(usuarioId: string, leccionId: number): Promise<Progreso | null> {
  const { data, error } = await supabase
    .from("progreso")
    .select("*")
    .eq("usuario_id", usuarioId)
    .eq("leccion_id", leccionId)
    .maybeSingle();

  if (error) throw error;
  return data as Progreso | null;
}

/**
 * Upsert progreso safely using select -> update or insert to avoid relying on DB unique constraint
 */
export async function upsertProgresoLastAccess(usuarioId: string, leccionId: number, payload: Partial<Progreso> = {}): Promise<Progreso> {
  const existing = await getProgresoByUsuarioAndLeccion(usuarioId, leccionId);
  if (existing && existing.id) {
    const { data, error } = await supabase
      .from('progreso')
      .update({ ...payload })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as Progreso;
  }
  const toInsert: Partial<Progreso> = {
    usuario_id: usuarioId,
    leccion_id: leccionId,
    fecha_ultimo_acceso: new Date().toISOString(),
    ...payload,
  };
  const { data, error } = await supabase
    .from('progreso')
    .insert([toInsert])
    .select()
    .single();
  if (error) throw error;
  return data as Progreso;
}
