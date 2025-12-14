import { supabase } from "../supabaseClient";
import type {
  ContenidoModelo,
  ContenidoModeloInsert,
  ModeloRA,
} from "../../types/db";

/**
 * Lista todos los modelos vinculados a un contenido
 */
export async function listModelosByContenido(contenidoId: number): Promise<ModeloRA[]> {
  const { data, error } = await supabase
    .from("contenido_modelo")
    .select(`
      orden,
      es_principal,
      modelo_ra:modelo_ra_id(*)
    `)
    .eq("contenido_id", contenidoId)
    .order("orden", { ascending: true });

  if (error) throw error;

  // Extraer modelos del resultado - supabase retorna objeto expandido
  return (data ?? [])
    .map((cm: any) => cm.modelo_ra)
    .filter((m): m is ModeloRA => m !== null);
}

/**
 * Obtiene el modelo principal de un contenido
 */
export async function getModeloPrincipalByContenido(
  contenidoId: number
): Promise<ModeloRA | null> {
  const { data, error } = await supabase
    .from("contenido_modelo")
    .select(`
      modelo_ra:modelo_ra_id(*)
    `)
    .eq("contenido_id", contenidoId)
    .eq("es_principal", true)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return (data as { modelo_ra: ModeloRA | null } | null)?.modelo_ra ?? null;
}

/**
 * Vincula un modelo a un contenido
 */
export async function vincularModeloAContenido(
  payload: ContenidoModeloInsert
): Promise<ContenidoModelo> {
  const { data, error } = await supabase
    .from("contenido_modelo")
    .insert([payload])
    .select("*")
    .single();

  if (error) throw error;
  return data as ContenidoModelo;
}

/**
 * Desvincula un modelo de un contenido
 */
export async function desvincularModeloDeContenido(
  contenidoId: number,
  modeloId: number
): Promise<void> {
  const { error } = await supabase
    .from("contenido_modelo")
    .delete()
    .eq("contenido_id", contenidoId)
    .eq("modelo_ra_id", modeloId);

  if (error) throw error;
}

/**
 * Establece un modelo como principal para un contenido
 */
export async function setModeloPrincipal(
  contenidoId: number,
  modeloId: number
): Promise<void> {
  // Quitar es_principal de todos los modelos del contenido
  await supabase
    .from("contenido_modelo")
    .update({ es_principal: false })
    .eq("contenido_id", contenidoId);

  // Establecer el nuevo principal
  const { error } = await supabase
    .from("contenido_modelo")
    .update({ es_principal: true })
    .eq("contenido_id", contenidoId)
    .eq("modelo_ra_id", modeloId);

  if (error) throw error;
}

/**
 * Sugiere modelos para un contenido basándose en tags, título y tipo
 */
export async function suggestModelosForContenido(
  contenido: { titulo: string; tags?: string[] | null; type?: string | null }
): Promise<ModeloRA[]> {
  const suggestions: ModeloRA[] = [];

  // 1. Buscar por keywords que coincidan con tags del contenido
  if (contenido.tags && contenido.tags.length > 0) {
    const { data: byTags } = await supabase
      .from("modelo_ra")
      .select("*")
      .overlaps("keywords", contenido.tags);

    if (byTags) suggestions.push(...(byTags as ModeloRA[]));
  }

  // 2. Buscar por fórmula química en el título (ej: H2O, CO2, NaCl)
  const formulaMatch = contenido.titulo.match(/\b([A-Z][a-z]?\d*)+\b/g);
  if (formulaMatch) {
    for (const formula of formulaMatch) {
      const { data: byFormula } = await supabase
        .from("modelo_ra")
        .select("*")
        .ilike("molecule_formula", formula);

      if (byFormula) suggestions.push(...(byFormula as ModeloRA[]));
    }
  }

  // 3. Buscar por categoría si el tipo de contenido es conocido
  if (contenido.type) {
    const { data: byCategoria } = await supabase
      .from("modelo_ra")
      .select("*")
      .eq("categoria", contenido.type);

    if (byCategoria) suggestions.push(...(byCategoria as ModeloRA[]));
  }

  // 4. Buscar por nombre similar al título
  const palabrasClave = contenido.titulo
    .toLowerCase()
    .split(/\s+/)
    .filter((p) => p.length > 3);

  for (const palabra of palabrasClave.slice(0, 3)) {
    const { data: byNombre } = await supabase
      .from("modelo_ra")
      .select("*")
      .ilike("nombre_modelo", `%${palabra}%`);

    if (byNombre) suggestions.push(...(byNombre as ModeloRA[]));
  }

  // Eliminar duplicados por ID
  const uniqueMap = new Map<number, ModeloRA>();
  suggestions.forEach((m) => uniqueMap.set(m.id, m));

  return Array.from(uniqueMap.values());
}

/**
 * Auto-vincula modelos sugeridos a un contenido
 */
export async function autoVincularModelos(contenidoId: number): Promise<number> {
  // Obtener contenido
  const { data: contenido, error: cError } = await supabase
    .from("contenido")
    .select("titulo, tags, type")
    .eq("id", contenidoId)
    .single();

  if (cError || !contenido) return 0;

  // Obtener sugerencias
  const sugerencias = await suggestModelosForContenido(contenido);
  if (sugerencias.length === 0) return 0;

  // Vincular el mejor modelo como principal
  let vinculados = 0;
  for (let i = 0; i < sugerencias.length && i < 3; i++) {
    try {
      await vincularModeloAContenido({
        contenido_id: contenidoId,
        modelo_ra_id: sugerencias[i].id,
        orden: i,
        es_principal: i === 0,
      });
      vinculados++;
    } catch {
      // Ignorar si ya existe el vínculo
    }
  }

  return vinculados;
}
