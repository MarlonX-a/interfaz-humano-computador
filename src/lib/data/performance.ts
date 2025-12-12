import { supabase } from "../supabaseClient";
import type { ResultadoPrueba, Prueba, Leccion, Progreso } from "../../types/db";

export interface StudentPerformance {
  usuario_id: string;
  display_name: string | null;
  email: string | null;
  total_pruebas: number;
  promedio_puntaje: number;
  aprobados: number;
  reprobados: number;
  lecciones_completadas: number;
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

  if (isAdmin) {
    // Si es admin, obtener todas las pruebas y lecciones
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
  } else {
    // Si es profesor, obtener solo sus pruebas y lecciones
    const { data: pruebas, error: pruebasError } = await supabase
      .from("prueba")
      .select("id")
      .eq("created_by", teacherId);

    if (pruebasError) throw pruebasError;

    const { data: lecciones, error: leccionesError } = await supabase
      .from("leccion")
      .select("id")
      .eq("created_by", teacherId);

    if (leccionesError) throw leccionesError;

    pruebaIds = (pruebas || []).map((p) => p.id);
    leccionIds = (lecciones || []).map((l) => l.id);
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

  // Combinar y obtener IDs únicos de estudiantes
  const studentIds = new Set<string>();
  testStudentIds.forEach((id) => studentIds.add(id));
  lessonStudentIds.forEach((id) => studentIds.add(id));

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
    const leccionesCompletadas = progresosDelProfesor.filter((p: any) => p.completado).length;

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

  // Obtener pruebas (todas si es admin, solo del profesor si no)
  let pruebasQuery = supabase
    .from("prueba")
    .select("id, titulo");
  
  if (!isAdmin) {
    pruebasQuery = pruebasQuery.eq("created_by", teacherId);
  }

  const { data: pruebas, error: pruebasError } = await pruebasQuery;

  if (pruebasError) throw pruebasError;

  // Obtener resultados del estudiante en estas pruebas
  const pruebaIds = (pruebas || []).map((p) => p.id);
  const { data: resultados, error: resultadosError } = await supabase
    .from("resultado_prueba")
    .select("*")
    .eq("usuario_id", studentId)
    .in("prueba_id", pruebaIds)
    .order("completed_at", { ascending: false });

  if (resultadosError) throw resultadosError;

  // Agrupar resultados por prueba
  const pruebasData: StudentDetail["pruebas"] = [];
  for (const prueba of pruebas || []) {
    const resultadosPrueba = (resultados || []).filter(
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
  const { data: progresos, error: progresosError } = await supabase
    .from("progreso")
    .select("*")
    .eq("usuario_id", studentId)
    .in("leccion_id", leccionIds);

  if (progresosError) throw progresosError;

  const leccionesData: StudentDetail["lecciones"] = [];
  for (const leccion of lecciones || []) {
    const progreso = (progresos || []).find((p) => p.leccion_id === leccion.id);
    if (!progreso) continue;

    leccionesData.push({
      leccion_id: leccion.id,
      titulo: leccion.titulo,
      completada: progreso.completado || false,
      puntaje: progreso.puntaje,
      ultimo_acceso: progreso.fecha_ultimo_acceso,
    });
  }

  // Evolución de puntajes (ordenados por fecha)
  const evolucionPuntajes: StudentDetail["evolucion_puntajes"] = (resultados || [])
    .map((r) => {
      const prueba = pruebas?.find((p) => p.id === r.prueba_id);
      return {
        fecha: r.completed_at || r.started_at || "",
        puntaje: r.puntaje_obtenido || 0,
        prueba_titulo: prueba?.titulo || "",
      };
    })
    .filter((e) => e.fecha)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return {
    usuario_id: studentId,
    display_name: profile.display_name,
    email: profile.email,
    pruebas: pruebasData,
    lecciones: leccionesData,
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

  // Obtener pruebas (todas si es admin, solo del profesor si no)
  let pruebasQuery = supabase
    .from("prueba")
    .select("id, titulo");
  
  if (!isAdmin) {
    pruebasQuery = pruebasQuery.eq("created_by", teacherId);
  }

  const { data: pruebas, error: pruebasError } = await pruebasQuery;

  if (pruebasError) throw pruebasError;

  const pruebaIds = (pruebas || []).map((p) => p.id);

  // Obtener resultados de pruebas
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

  const { data: resultados, error: resultadosError } = await resultadosQuery;

  if (resultadosError) throw resultadosError;

  // Calcular métricas por prueba
  const pruebasMetricas: AnalyticsData["pruebas_mejor_desempeno"] = [];
  for (const prueba of pruebas || []) {
    const resultadosPrueba = (resultados || []).filter(
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
  const totalResultados = resultados?.length || 0;
  const promedioPuntajes =
    totalResultados > 0
      ? resultados!.reduce((sum, r) => sum + (r.puntaje_obtenido || 0), 0) /
        totalResultados
      : 0;
  const totalAprobados = resultados?.filter((r) => r.aprobado).length || 0;
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
  const { data: progresos, error: progresosError } = await supabase
    .from("progreso")
    .select("leccion_id")
    .in("leccion_id", leccionIds)
    .eq("completado", true);

  if (progresosError) throw progresosError;

  const leccionesCompletadas: { [key: number]: number } = {};
  (progresos || []).forEach((p) => {
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

