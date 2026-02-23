import { supabase } from "@/shared/lib/supabaseClient";
import type { ResultadoPrueba, Prueba, Leccion, Progreso } from "@/shared/types";
import { getContentProgressForUserByContentIds } from "@/shared/services/progresos";
import type { ContentProgress } from "@/shared/services/progresos";
import { getSeguidoresByContenidos } from "@/shared/services/seguimiento";

export interface StudentPerformance {
  usuario_id: string;
  display_name: string | null;
  email: string | null;
  total_pruebas: number;
  promedio_puntaje: number;
  aprobados: number;
  reprobados: number;
  lecciones_completadas: number;
  contenidos_completados: number;
  contenidos_aprobados: number;
  contenidos_reprobados: number;
  contenidos_seguidos: number;
  ultima_actividad: string | null;
}

export interface PerformanceFilters {
  leccion_id?: number;
  prueba_id?: number;
  estudiante_id?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface AnalyticsData {
  total_estudiantes: number;
  promedio_puntajes: number;
  tasa_aprobacion: number;
  tasa_reprobacion: number;
  pruebas_mejor_desempeno: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
    aprobados: number;
  }>;
  pruebas_peor_desempeno: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
    aprobados: number;
  }>;
  lecciones_mas_completadas: Array<{
    leccion_id: number;
    titulo: string;
    completadas: number;
  }>;
}

export interface StudentDetail {
  usuario_id: string;
  display_name: string | null;
  email: string | null;
  pruebas: Array<{
    prueba_id: number;
    titulo: string;
    intentos: number;
    mejor_puntaje: number;
    promedio: number;
    aprobado: boolean;
    ultimo_intento: string | null;
  }>;
  lecciones: Array<{
    leccion_id: number;
    titulo: string;
    completada: boolean;
    puntaje: number | null;
    ultimo_acceso: string | null;
  }>;
  contenidos: ContentProgress[];
  contenidos_seguidos_nombres: string[];
  evolucion_puntajes: Array<{
    fecha: string;
    puntaje: number;
    prueba_titulo: string;
  }>;
}

/**
 * Obtiene estudiantes que han interactuado con contenido del profesor
 * Si isAdmin es true, retorna todos los estudiantes del sistema
 */
export async function getStudentsByTeacher(teacherId: string, isAdmin: boolean = false): Promise<StudentPerformance[]> {
  let pruebaIds: number[] = [];
  let leccionIds: number[] = [];
  let contenidoIds: number[] = [];

  if (isAdmin) {
    // Si es admin, obtener todas las pruebas, lecciones y contenidos
    const { data: todasPruebas, error: pruebasError } = await supabase
      .from("prueba")
      .select("id");

    if (pruebasError) throw pruebasError;
    pruebaIds = (todasPruebas || []).map((p) => p.id);

    const { data: todasLecciones, error: leccionesError } = await supabase
      .from("leccion")
      .select("id");

    if (leccionesError) throw leccionesError;
    leccionIds = (todasLecciones || []).map((l) => l.id);

    const { data: todosContenidos, error: contenidosError } = await supabase
      .from("contenido")
      .select("id");
    if (contenidosError) throw contenidosError;
    contenidoIds = (todosContenidos || []).map((c) => c.id);
  } else {
    // Si es profesor, obtener sus lecciones y contenidos
    const { data: lecciones, error: leccionesError } = await supabase
      .from("leccion")
      .select("id")
      .eq("created_by", teacherId);

    if (leccionesError) throw leccionesError;
    leccionIds = (lecciones || []).map((l) => l.id);

    // Obtener pruebas que pertenecen a las lecciones del profesor (no por created_by)
    if (leccionIds.length > 0) {
      const { data: pruebas, error: pruebasError } = await supabase
        .from("prueba")
        .select("id")
        .in("leccion_id", leccionIds);
      if (pruebasError) throw pruebasError;
      pruebaIds = (pruebas || []).map((p) => p.id);
    }

    const { data: contenidos, error: contenidosError } = await supabase
      .from("contenido")
      .select("id")
      .eq("created_by", teacherId);
    if (contenidosError) throw contenidosError;
    contenidoIds = (contenidos || []).map((c) => c.id);
  }

  // Obtener estudiantes que han tomado pruebas del profesor
  let testStudentIds = new Set<string>();
  if (pruebaIds.length > 0) {
    const { data: resultados, error: resultadosError } = await supabase
      .from("resultado_prueba")
      .select("usuario_id")
      .in("prueba_id", pruebaIds);

    if (resultadosError) throw resultadosError;
    (resultados || []).forEach((r) => {
      testStudentIds.add(r.usuario_id);
    });
  }

  // Obtener estudiantes con progreso en lecciones del profesor
  let lessonStudentIds = new Set<string>();
  if (leccionIds.length > 0) {
    const { data: progresos, error: progresosError } = await supabase
      .from("progreso")
      .select("usuario_id")
      .in("leccion_id", leccionIds);

    if (progresosError) throw progresosError;
    (progresos || []).forEach((p) => {
      lessonStudentIds.add(p.usuario_id);
    });
  }

  // Obtener estudiantes que SIGUEN los contenidos del profesor
  let followStudentMap = new Map<string, number[]>();
  if (contenidoIds.length > 0) {
    followStudentMap = await getSeguidoresByContenidos(contenidoIds);
  }

  // Combinar y obtener IDs únicos de estudiantes
  const studentIds = new Set<string>();
  if (isAdmin) {
    // Admin ve todos los estudiantes con cualquier interacción
    testStudentIds.forEach((id) => studentIds.add(id));
    lessonStudentIds.forEach((id) => studentIds.add(id));
    followStudentMap.forEach((_contenidos, id) => studentIds.add(id));
  } else {
    // Profesor solo ve estudiantes que SIGUEN sus contenidos
    followStudentMap.forEach((_contenidos, id) => studentIds.add(id));
  }

  // Obtener perfiles de estudiantes
  const studentIdsArray = Array.from(studentIds);
  if (studentIdsArray.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", studentIdsArray);

  if (profileError) throw profileError;

  // Calcular métricas para cada estudiante
  const students: StudentPerformance[] = [];

  for (const profile of profiles || []) {
    const userId = profile.id;

    // Obtener resultados de pruebas
    let resultadosDelProfesor: any[] = [];
    if (isAdmin) {
      // Si es admin, obtener todos los resultados del estudiante
      const { data: resultados, error: resultadosError } = await supabase
        .from("resultado_prueba")
        .select("*")
        .eq("usuario_id", userId);

      if (resultadosError) throw resultadosError;
      resultadosDelProfesor = resultados || [];
    } else if (pruebaIds.length > 0) {
      // Si es profesor, solo resultados de sus pruebas
      const { data: resultados, error: resultadosError } = await supabase
        .from("resultado_prueba")
        .select("*")
        .eq("usuario_id", userId)
        .in("prueba_id", pruebaIds);

      if (resultadosError) throw resultadosError;
      resultadosDelProfesor = resultados || [];
    }

    // Obtener progreso en lecciones
    let progresosDelProfesor: any[] = [];
    if (isAdmin) {
      // Si es admin, obtener todo el progreso del estudiante
      const { data: progresos, error: progresosError } = await supabase
        .from("progreso")
        .select("*")
        .eq("usuario_id", userId);

      if (progresosError) throw progresosError;
      progresosDelProfesor = progresos || [];
    } else if (leccionIds.length > 0) {
      // Si es profesor, solo progreso en sus lecciones
      const { data: progresos, error: progresosError } = await supabase
        .from("progreso")
        .select("*")
        .eq("usuario_id", userId)
        .in("leccion_id", leccionIds);

      if (progresosError) throw progresosError;
      progresosDelProfesor = progresos || [];
    }

    // Calcular métricas
    const totalPruebas = resultadosDelProfesor.length;
    const promedioPuntaje =
      totalPruebas > 0
        ? resultadosDelProfesor.reduce(
            (sum: number, r: any) => sum + (r.puntaje_obtenido || 0),
            0
          ) / totalPruebas
        : 0;
    const aprobados = resultadosDelProfesor.filter((r: any) => r.aprobado).length;
    const reprobados = totalPruebas - aprobados;
    // Deduplicate progreso by leccion_id, prioritize completado=true
    const progresoByLeccionMap = new Map<number, boolean>();
    progresosDelProfesor.forEach((p: any) => {
      const prev = progresoByLeccionMap.get(p.leccion_id);
      if (prev === undefined || (!prev && p.completado)) {
        progresoByLeccionMap.set(p.leccion_id, !!p.completado);
      }
    });
    const leccionesCompletadas = Array.from(progresoByLeccionMap.values()).filter(Boolean).length;

    // Calcular progreso por contenidos (solo los que el estudiante sigue)
    let contenidosCompletados = 0;
    let contenidosAprobados = 0;
    let contenidosReprobados = 0;
    const contenidosSeguidos = followStudentMap.get(userId) || [];
    const contenidosSeguidosCount = contenidosSeguidos.length;
    // Intersect: only teacher's content that the student follows
    const contenidosDelEstudiante = contenidoIds.filter(cid => contenidosSeguidos.includes(cid));
    if (contenidosDelEstudiante.length > 0) {
      try {
        const contentProg = await getContentProgressForUserByContentIds(userId, contenidosDelEstudiante);
        contenidosCompletados = contentProg.filter(c => c.completado).length;
        contenidosAprobados = contentProg.filter(c => c.aprobado).length;
        contenidosReprobados = contentProg.filter(c => c.completado && !c.aprobado).length;
      } catch (e) {
        console.error('Error computing content progress for', userId, e);
      }
    }

    // Última actividad
    const ultimasFechas = [
      ...resultadosDelProfesor.map((r: any) => r.completed_at).filter(Boolean),
      ...progresosDelProfesor.map((p: any) => p.fecha_ultimo_acceso).filter(Boolean),
    ];
    const ultimaActividad =
      ultimasFechas.length > 0
        ? ultimasFechas.sort().reverse()[0]
        : null;

    students.push({
      usuario_id: userId,
      display_name: profile.display_name,
      email: profile.email,
      total_pruebas: totalPruebas,
      promedio_puntaje: Math.round(promedioPuntaje * 100) / 100,
      aprobados,
      reprobados,
      lecciones_completadas: leccionesCompletadas,
      contenidos_completados: contenidosCompletados,
      contenidos_aprobados: contenidosAprobados,
      contenidos_reprobados: contenidosReprobados,
      contenidos_seguidos: contenidosSeguidosCount,
      ultima_actividad: ultimaActividad,
    });
  }

  return students;
}

/**
 * Obtiene desempeño completo de un estudiante específico
 * Si isAdmin es true, incluye todas las pruebas y lecciones del sistema
 */
export async function getPerformanceByStudent(
  studentId: string,
  teacherId: string,
  isAdmin: boolean = false
): Promise<StudentDetail | null> {
  // Obtener perfil del estudiante
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", studentId)
    .single();

  if (profileError) throw profileError;
  if (!profile) return null;

  // Obtener lecciones del profesor (para buscar pruebas en ellas)
  let leccionIdsForPruebas: number[] = [];
  if (!isAdmin) {
    const { data: leccionesTeacher, error: lecTeacherErr } = await supabase
      .from("leccion")
      .select("id")
      .eq("created_by", teacherId);
    if (lecTeacherErr) throw lecTeacherErr;
    leccionIdsForPruebas = (leccionesTeacher || []).map((l) => l.id);
  }

  // Obtener pruebas (todas si es admin, las de las lecciones del profesor si no)
  let pruebas: any[] = [];
  if (isAdmin) {
    const { data, error } = await supabase.from("prueba").select("id, titulo");
    if (error) throw error;
    pruebas = data || [];
  } else if (leccionIdsForPruebas.length > 0) {
    const { data, error } = await supabase
      .from("prueba")
      .select("id, titulo")
      .in("leccion_id", leccionIdsForPruebas);
    if (error) throw error;
    pruebas = data || [];
  }

  // Obtener resultados del estudiante en estas pruebas
  const pruebaIds = pruebas.map((p: any) => p.id);
  let resultados: any[] = [];
  if (pruebaIds.length > 0) {
    const { data: resultadosData, error: resultadosError } = await supabase
      .from("resultado_prueba")
      .select("*")
      .eq("usuario_id", studentId)
      .in("prueba_id", pruebaIds)
      .order("completed_at", { ascending: false });

    if (resultadosError) throw resultadosError;
    resultados = resultadosData || [];
  }

  // Agrupar resultados por prueba
  const pruebasData: StudentDetail["pruebas"] = [];
  for (const prueba of pruebas || []) {
    const resultadosPrueba = resultados.filter(
      (r) => r.prueba_id === prueba.id
    );
    if (resultadosPrueba.length === 0) continue;

    const mejorPuntaje = Math.max(
      ...resultadosPrueba.map((r) => r.puntaje_obtenido || 0)
    );
    const promedio =
      resultadosPrueba.reduce((sum, r) => sum + (r.puntaje_obtenido || 0), 0) /
      resultadosPrueba.length;
    const aprobado = resultadosPrueba.some((r) => r.aprobado);
    const ultimoIntento = resultadosPrueba[0]?.completed_at || null;

    pruebasData.push({
      prueba_id: prueba.id,
      titulo: prueba.titulo,
      intentos: resultadosPrueba.length,
      mejor_puntaje: mejorPuntaje,
      promedio: Math.round(promedio * 100) / 100,
      aprobado,
      ultimo_intento: ultimoIntento,
    });
  }

  // Obtener lecciones (todas si es admin, solo del profesor si no)
  let leccionesQuery = supabase
    .from("leccion")
    .select("id, titulo");
  
  if (!isAdmin) {
    leccionesQuery = leccionesQuery.eq("created_by", teacherId);
  }

  const { data: lecciones, error: leccionesError } = await leccionesQuery;

  if (leccionesError) throw leccionesError;

  const leccionIds = (lecciones || []).map((l) => l.id);
  let progresos: any[] = [];
  if (leccionIds.length > 0) {
    const { data: progresosData, error: progresosError } = await supabase
      .from("progreso")
      .select("*")
      .eq("usuario_id", studentId)
      .in("leccion_id", leccionIds);

    if (progresosError) throw progresosError;
    progresos = progresosData || [];
  }

  const leccionesData: StudentDetail["lecciones"] = [];
  for (const leccion of lecciones || []) {
    // Find all progreso records for this lesson and pick the best one
    const progresosLeccion = progresos.filter((p: any) => p.leccion_id === leccion.id);
    if (progresosLeccion.length === 0) continue;

    const completado = progresosLeccion.some((p: any) => p.completado);
    const mejorPuntaje = Math.max(...progresosLeccion.map((p: any) => p.puntaje ?? 0));
    const ultimoAcceso = progresosLeccion
      .map((p: any) => p.fecha_ultimo_acceso)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;

    leccionesData.push({
      leccion_id: leccion.id,
      titulo: leccion.titulo,
      completada: completado,
      puntaje: mejorPuntaje,
      ultimo_acceso: ultimoAcceso,
    });
  }

  // Evolución de puntajes (ordenados por fecha)
  const evolucionPuntajes: StudentDetail["evolucion_puntajes"] = resultados
    .map((r: any) => {
      const prueba = pruebas?.find((p) => p.id === r.prueba_id);
      return {
        fecha: r.completed_at || r.started_at || "",
        puntaje: r.puntaje_obtenido || 0,
        prueba_titulo: prueba?.titulo || "",
      };
    })
    .filter((e) => e.fecha)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Progreso por contenidos del profesor/admin — solo los que el estudiante sigue
  let contenidosData: ContentProgress[] = [];
  let contenidosSeguidosNombres: string[] = [];
  try {
    let queryContenidos = supabase.from("contenido").select("id, titulo");
    if (!isAdmin) {
      queryContenidos = queryContenidos.eq("created_by", teacherId);
    }
    const { data: contData } = await queryContenidos;
    const allTeacherContentIds = (contData || []).map((c: any) => c.id);

    if (allTeacherContentIds.length > 0) {
      // Get content the student follows
      const { data: segData } = await supabase
        .from("contenido_seguimiento")
        .select("contenido_id")
        .eq("usuario_id", studentId)
        .in("contenido_id", allTeacherContentIds);
      const seguidosIds = (segData || []).map((s: any) => s.contenido_id);

      // Get names of followed content
      contenidosSeguidosNombres = (contData || [])
        .filter((c: any) => seguidosIds.includes(c.id))
        .map((c: any) => c.titulo);

      if (seguidosIds.length > 0) {
        contenidosData = await getContentProgressForUserByContentIds(studentId, seguidosIds);
      }
    }
  } catch (e) {
    console.error('Error computing content progress for student detail', e);
  }

  return {
    usuario_id: studentId,
    display_name: profile.display_name,
    email: profile.email,
    pruebas: pruebasData,
    lecciones: leccionesData,
    contenidos: contenidosData,
    contenidos_seguidos_nombres: contenidosSeguidosNombres,
    evolucion_puntajes: evolucionPuntajes,
  };
}

/**
 * Obtiene analíticas agregadas del profesor
 * Si isAdmin es true, retorna analíticas de todo el sistema
 */
export async function getAnalyticsByTeacher(
  teacherId: string,
  isAdmin: boolean = false,
  dateRange?: { inicio?: string; fin?: string }
): Promise<AnalyticsData> {
  // Obtener estudiantes
  const students = await getStudentsByTeacher(teacherId, isAdmin);
  const totalEstudiantes = students.length;
  // Set de IDs de estudiantes válidos (para filtrar resultados/progresos)
  const validStudentIds = new Set(students.map(s => s.usuario_id));

  // Obtener lecciones del profesor (para buscar pruebas en ellas)
  let leccionIdsForAnalytics: number[] = [];
  if (!isAdmin) {
    const { data: leccionesTeacher, error: lecTeacherErr } = await supabase
      .from("leccion")
      .select("id")
      .eq("created_by", teacherId);
    if (lecTeacherErr) throw lecTeacherErr;
    leccionIdsForAnalytics = (leccionesTeacher || []).map((l) => l.id);
  }

  // Obtener pruebas (todas si es admin, las de las lecciones del profesor si no)
  let pruebas: any[] = [];
  if (isAdmin) {
    const { data, error } = await supabase.from("prueba").select("id, titulo");
    if (error) throw error;
    pruebas = data || [];
  } else if (leccionIdsForAnalytics.length > 0) {
    const { data, error } = await supabase
      .from("prueba")
      .select("id, titulo")
      .in("leccion_id", leccionIdsForAnalytics);
    if (error) throw error;
    pruebas = data || [];
  }

  const pruebaIds = pruebas.map((p: any) => p.id);

  // Obtener resultados de pruebas
  let resultados: any[] = [];
  if (pruebaIds.length > 0) {
    let resultadosQuery = supabase
      .from("resultado_prueba")
      .select("*")
      .in("prueba_id", pruebaIds);

    if (dateRange?.inicio) {
      resultadosQuery = resultadosQuery.gte("completed_at", dateRange.inicio);
    }
    if (dateRange?.fin) {
      resultadosQuery = resultadosQuery.lte("completed_at", dateRange.fin);
    }

    const { data: resultadosData, error: resultadosError } = await resultadosQuery;

    if (resultadosError) throw resultadosError;
    // Solo incluir resultados de estudiantes válidos (seguidores para profesor)
    resultados = (resultadosData || []).filter(r => validStudentIds.has(r.usuario_id));
  }

  // Calcular métricas por prueba
  const pruebasMetricas: AnalyticsData["pruebas_mejor_desempeno"] = [];
  for (const prueba of pruebas || []) {
    const resultadosPrueba = resultados.filter(
      (r) => r.prueba_id === prueba.id
    );
    if (resultadosPrueba.length === 0) continue;

    const promedio =
      resultadosPrueba.reduce((sum, r) => sum + (r.puntaje_obtenido || 0), 0) /
      resultadosPrueba.length;
    const aprobados = resultadosPrueba.filter((r) => r.aprobado).length;

    pruebasMetricas.push({
      prueba_id: prueba.id,
      titulo: prueba.titulo,
      promedio: Math.round(promedio * 100) / 100,
      intentos: resultadosPrueba.length,
      aprobados,
    });
  }

  // Ordenar por promedio
  const mejorDesempeno = [...pruebasMetricas]
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, 5);
  const peorDesempeno = [...pruebasMetricas]
    .sort((a, b) => a.promedio - b.promedio)
    .slice(0, 5);

  // Calcular promedios generales
  const totalResultados = resultados.length;
  const promedioPuntajes =
    totalResultados > 0
      ? resultados.reduce((sum: number, r: any) => sum + (r.puntaje_obtenido || 0), 0) /
        totalResultados
      : 0;
  const totalAprobados = resultados.filter((r: any) => r.aprobado).length;
  const tasaAprobacion =
    totalResultados > 0 ? (totalAprobados / totalResultados) * 100 : 0;
  const tasaReprobacion = 100 - tasaAprobacion;

  // Lecciones más completadas (todas si es admin, solo del profesor si no)
  let leccionesQuery = supabase
    .from("leccion")
    .select("id, titulo");
  
  if (!isAdmin) {
    leccionesQuery = leccionesQuery.eq("created_by", teacherId);
  }

  const { data: lecciones, error: leccionesError } = await leccionesQuery;

  if (leccionesError) throw leccionesError;

  const leccionIds = (lecciones || []).map((l) => l.id);
  let progresos: any[] = [];
  if (leccionIds.length > 0) {
    const { data: progresosData, error: progresosError } = await supabase
      .from("progreso")
      .select("leccion_id, usuario_id")
      .in("leccion_id", leccionIds)
      .eq("completado", true);

    if (progresosError) throw progresosError;
    // Solo incluir progresos de estudiantes válidos (seguidores para profesor)
    progresos = (progresosData || []).filter(p => validStudentIds.has(p.usuario_id));
  }

  const leccionesCompletadas: { [key: number]: number } = {};
  progresos.forEach((p: any) => {
    leccionesCompletadas[p.leccion_id || 0] =
      (leccionesCompletadas[p.leccion_id || 0] || 0) + 1;
  });

  const leccionesMasCompletadas: AnalyticsData["lecciones_mas_completadas"] = (
    lecciones || []
  )
    .map((l) => ({
      leccion_id: l.id,
      titulo: l.titulo,
      completadas: leccionesCompletadas[l.id] || 0,
    }))
    .sort((a, b) => b.completadas - a.completadas)
    .slice(0, 5);

  return {
    total_estudiantes: totalEstudiantes,
    promedio_puntajes: Math.round(promedioPuntajes * 100) / 100,
    tasa_aprobacion: Math.round(tasaAprobacion * 100) / 100,
    tasa_reprobacion: Math.round(tasaReprobacion * 100) / 100,
    pruebas_mejor_desempeno: mejorDesempeno,
    pruebas_peor_desempeno: peorDesempeno,
    lecciones_mas_completadas: leccionesMasCompletadas,
  };
}

/**
 * Filtra estudiantes según criterios
 */
export async function getFilteredStudents(
  teacherId: string,
  filters: PerformanceFilters
): Promise<StudentPerformance[]> {
  let students = await getStudentsByTeacher(teacherId);

  // Aplicar filtros
  if (filters.estudiante_id) {
    students = students.filter((s) => s.usuario_id === filters.estudiante_id);
  }

  // Filtros adicionales se pueden aplicar aquí según necesidad
  // Por ahora, los filtros de lección y prueba se aplican en la vista

  return students;
}

