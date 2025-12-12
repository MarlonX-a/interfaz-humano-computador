import { supabase } from "../supabaseClient";
import type { Contenido, ContenidoInsert, ContenidoUpdate, ContenidoConLecciones, Leccion, ContenidoLeccion } from "../../types/db";

/**
 * Lista todos los contenidos creados por un profesor con sus lecciones asociadas
 * Si isAdmin es true, retorna todos los contenidos del sistema
 */
export async function listContenidosByTeacher(userId: string, isAdmin: boolean = false): Promise<ContenidoConLecciones[]> {
  let leccionIds: number[] = [];

  if (isAdmin) {
    // Si es admin, obtener todas las lecciones
    const { data: todasLecciones, error: leccionesError } = await supabase
      .from("leccion")
      .select("id");

    if (leccionesError) throw leccionesError;
    leccionIds = (todasLecciones || []).map((l) => l.id);
  } else {
    // Si es profesor, obtener solo sus lecciones
    const { data: lecciones, error: leccionesError } = await supabase
      .from("leccion")
      .select("id")
      .eq("created_by", userId);

    if (leccionesError) throw leccionesError;
    leccionIds = (lecciones || []).map((l) => l.id);
  }

  let contenidos: any[] = [];
  let contenidoLecciones: any[] = [];

  if (isAdmin) {
    // Si es admin, obtener todos los contenidos directamente
    const { data: contenidosData, error: contenidosError } = await supabase
      .from("contenido")
      .select("*")
      .order("orden", { ascending: true, nullsFirst: false });

    if (contenidosError) throw contenidosError;
    contenidos = contenidosData || [];

    // Obtener todas las relaciones contenido_leccion para estos contenidos
    if (contenidos.length > 0) {
      const contenidoIds = contenidos.map((c) => c.id);
      const { data: clData, error: clError } = await supabase
        .from("contenido_leccion")
        .select("contenido_id, leccion_id, orden")
        .in("contenido_id", contenidoIds);

      if (clError) throw clError;
      contenidoLecciones = clData || [];
    }
  } else {
    // Si es profesor, obtener contenidos asociados a sus lecciones
    if (leccionIds.length === 0) return [];

    // Obtener contenidos asociados a esas lecciones a través de contenido_leccion
    const { data: clData, error: clError } = await supabase
      .from("contenido_leccion")
      .select("contenido_id, leccion_id, orden")
      .in("leccion_id", leccionIds);

    if (clError) throw clError;
    contenidoLecciones = clData || [];

    const contenidoIds = Array.from(new Set((contenidoLecciones || []).map((cl) => cl.contenido_id)));

    if (contenidoIds.length === 0) return [];

    // Obtener los contenidos
    const { data: contenidosData, error: contenidosError } = await supabase
      .from("contenido")
      .select("*")
      .in("id", contenidoIds)
      .order("orden", { ascending: true, nullsFirst: false });

    if (contenidosError) throw contenidosError;
    contenidos = contenidosData || [];
  }

  // Obtener todas las lecciones asociadas
  // Si es admin, obtener todas las lecciones del sistema; si no, solo las del profesor
  let todasLeccionesQuery = supabase
    .from("leccion")
    .select("id, titulo, descripcion, nivel, thumbnail_url, created_by");
  
  if (!isAdmin && leccionIds.length > 0) {
    todasLeccionesQuery = todasLeccionesQuery.in("id", leccionIds);
  }
  
  const { data: todasLecciones, error: leccionesDataError } = await todasLeccionesQuery;

  if (leccionesDataError) throw leccionesDataError;

  // Mapear contenidos con sus lecciones
  const contenidosConLecciones: ContenidoConLecciones[] = contenidos.map((c) => {
    const leccionesDelContenido = contenidoLecciones
      .filter((cl) => cl.contenido_id === c.id)
      .map((cl) => {
        const leccion = (todasLecciones || []).find((l) => l.id === cl.leccion_id);
        return leccion ? { ...leccion, orden: cl.orden } : null;
      })
      .filter((l): l is Leccion & { orden: number | null } => l !== null)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map(({ orden, ...leccion }) => leccion);

    return {
      ...c,
      lecciones: leccionesDelContenido,
    };
  });

  return contenidosConLecciones;
}

/**
 * Obtiene un contenido específico por su ID con sus lecciones asociadas
 */
export async function getContenido(id: number): Promise<ContenidoConLecciones> {
  const { data: contenido, error: contenidoError } = await supabase
    .from("contenido")
    .select("*")
    .eq("id", id)
    .single();

  if (contenidoError) throw contenidoError;

  // Obtener lecciones asociadas
  const { data: contenidoLecciones, error: clError } = await supabase
    .from("contenido_leccion")
    .select("leccion_id, orden")
    .eq("contenido_id", id)
    .order("orden", { ascending: true, nullsFirst: false });

  if (clError) throw clError;

  const leccionIds = (contenidoLecciones || []).map((cl) => cl.leccion_id);

  let lecciones: Leccion[] = [];
  if (leccionIds.length > 0) {
    const { data: leccionesData, error: leccionesError } = await supabase
      .from("leccion")
      .select("id, titulo, descripcion, nivel, thumbnail_url, created_by")
      .in("id", leccionIds);

    if (leccionesError) throw leccionesError;

    // Ordenar según el orden en contenido_leccion
    lecciones = (leccionesData || []).sort((a, b) => {
      const ordenA = contenidoLecciones.find((cl) => cl.leccion_id === a.id)?.orden || 0;
      const ordenB = contenidoLecciones.find((cl) => cl.leccion_id === b.id)?.orden || 0;
      return ordenA - ordenB;
    });
  }

  return {
    ...contenido,
    lecciones,
  } as ContenidoConLecciones;
}

/**
 * Crea un nuevo contenido
 */
export async function createContenido(payload: ContenidoInsert): Promise<Contenido> {
  const { data, error } = await supabase
    .from("contenido")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as Contenido;
}

/**
 * Actualiza un contenido existente
 */
export async function updateContenido(id: number, payload: ContenidoUpdate): Promise<Contenido> {
  const { data, error } = await supabase
    .from("contenido")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Contenido;
}

/**
 * Elimina un contenido (también elimina las relaciones en contenido_leccion por CASCADE)
 */
export async function deleteContenido(id: number): Promise<void> {
  const { error } = await supabase
    .from("contenido")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Agrega una lección a un contenido
 */
export async function addLeccionToContenido(
  contenidoId: number,
  leccionId: number,
  orden?: number
): Promise<ContenidoLeccion> {
  const { data, error } = await supabase
    .from("contenido_leccion")
    .insert([{
      contenido_id: contenidoId,
      leccion_id: leccionId,
      orden: orden ?? null,
    }])
    .select("*")
    .single();

  if (error) throw error;
  return data as ContenidoLeccion;
}

/**
 * Elimina una lección de un contenido
 */
export async function removeLeccionFromContenido(
  contenidoId: number,
  leccionId: number
): Promise<void> {
  const { error } = await supabase
    .from("contenido_leccion")
    .delete()
    .eq("contenido_id", contenidoId)
    .eq("leccion_id", leccionId);

  if (error) throw error;
}

/**
 * Actualiza todas las lecciones asociadas a un contenido
 */
export async function updateContenidoLecciones(
  contenidoId: number,
  leccionIds: number[]
): Promise<void> {
  // Eliminar todas las relaciones existentes
  const { error: deleteError } = await supabase
    .from("contenido_leccion")
    .delete()
    .eq("contenido_id", contenidoId);

  if (deleteError) throw deleteError;

  // Insertar nuevas relaciones
  if (leccionIds.length > 0) {
    const relaciones = leccionIds.map((leccionId, index) => ({
      contenido_id: contenidoId,
      leccion_id: leccionId,
      orden: index,
    }));

    const { error: insertError } = await supabase
      .from("contenido_leccion")
      .insert(relaciones);

    if (insertError) throw insertError;
  }
}
