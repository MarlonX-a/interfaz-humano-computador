import { supabase } from '../supabaseClient';
import type { DashboardStats, RecentActivity, SystemTrends, PerformanceOverview } from '../../types/db';

/**
 * Obtiene estadísticas generales del sistema
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // Contar usuarios por rol
  const { data: usersByRole, error: usersError } = await supabase
    .from('profiles')
    .select('role');

  if (usersError) throw usersError;

  const total_users = usersByRole?.length || 0;
  const total_admins = usersByRole?.filter((u) => u.role === 'admin').length || 0;
  const total_teachers = usersByRole?.filter((u) => u.role === 'teacher').length || 0;
  const total_students = usersByRole?.filter((u) => u.role === 'student').length || 0;

  // Contar lecciones
  const { count: lessonsCount, error: lessonsError } = await supabase
    .from('leccion')
    .select('*', { count: 'exact', head: true });

  if (lessonsError) throw lessonsError;

  // Contar contenidos
  const { count: contentsCount, error: contentsError } = await supabase
    .from('contenido')
    .select('*', { count: 'exact', head: true });

  if (contentsError) throw contentsError;

  // Contar pruebas
  const { count: pruebasCount, error: pruebasError } = await supabase
    .from('prueba')
    .select('*', { count: 'exact', head: true });

  if (pruebasError) throw pruebasError;

  // Contar resultados de pruebas
  const { count: resultadosCount, error: resultadosError } = await supabase
    .from('resultado_prueba')
    .select('*', { count: 'exact', head: true });

  if (resultadosError) throw resultadosError;

  // Contar progreso
  const { count: progresoCount, error: progresoError } = await supabase
    .from('progreso')
    .select('*', { count: 'exact', head: true });

  if (progresoError) throw progresoError;

  // Calcular tasa de aprobación
  const { data: resultados, error: resultadosDataError } = await supabase
    .from('resultado_prueba')
    .select('aprobado');

  if (resultadosDataError) throw resultadosDataError;

  const totalResultados = resultados?.length || 0;
  const aprobados = resultados?.filter((r) => r.aprobado).length || 0;
  const approval_rate = totalResultados > 0 ? (aprobados / totalResultados) * 100 : 0;

  // Actividad del mes actual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  const { count: monthlyActivity, error: monthlyError } = await supabase
    .from('resultado_prueba')
    .select('*', { count: 'exact', head: true })
    .gte('completed_at', startOfMonth);

  if (monthlyError) throw monthlyError;

  return {
    total_users,
    total_admins,
    total_teachers,
    total_students,
    total_lessons: lessonsCount || 0,
    total_contents: contentsCount || 0,
    total_pruebas: pruebasCount || 0,
    total_resultados: resultadosCount || 0,
    total_progreso: progresoCount || 0,
    approval_rate: Math.round(approval_rate * 100) / 100,
    monthly_activity: monthlyActivity || 0,
  };
}

/**
 * Obtiene actividad reciente del sistema
 */
export async function getRecentActivity(): Promise<RecentActivity> {
  // Usuarios recientes (últimos 5)
  const { data: recentUsers, error: usersError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (usersError) throw usersError;

  // Lecciones recientes (últimas 5)
  const { data: recentLessons, error: lessonsError } = await supabase
    .from('leccion')
    .select('id, titulo, created_at, created_by')
    .order('created_at', { ascending: false })
    .limit(5);

  if (lessonsError) throw lessonsError;

  // Contenidos recientes (últimos 5)
  const { data: recentContents, error: contentsError } = await supabase
    .from('contenido')
    .select('id, titulo, updated_at')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (contentsError) throw contentsError;

  // Pruebas recientes (últimas 5)
  const { data: recentPruebas, error: pruebasError } = await supabase
    .from('prueba')
    .select('id, titulo, leccion_id, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (pruebasError) throw pruebasError;

  return {
    recent_users: (recentUsers || []).map((u) => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      created_at: u.created_at,
    })),
    recent_lessons: (recentLessons || []).map((l) => ({
      id: l.id,
      titulo: l.titulo,
      created_at: l.created_at,
      created_by: l.created_by,
    })),
    recent_contents: (recentContents || []).map((c) => ({
      id: c.id,
      titulo: c.titulo,
      created_at: c.updated_at || new Date().toISOString(),
      updated_at: c.updated_at,
    })),
    recent_pruebas: (recentPruebas || []).map((p) => ({
      id: p.id,
      titulo: p.titulo,
      leccion_id: p.leccion_id,
      created_at: p.created_at || new Date().toISOString(),
    })),
  };
}

/**
 * Obtiene tendencias y datos para gráficos
 */
export async function getSystemTrends(): Promise<SystemTrends> {
  // Crecimiento de usuarios por mes (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: allUsers, error: usersError } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: true });

  if (usersError) throw usersError;

  // Agrupar por mes
  const userGrowthMap = new Map<string, number>();
  (allUsers || []).forEach((user) => {
    const date = new Date(user.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    userGrowthMap.set(monthKey, (userGrowthMap.get(monthKey) || 0) + 1);
  });

  const user_growth = Array.from(userGrowthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Actividad de pruebas por mes
  const { data: resultados, error: resultadosError } = await supabase
    .from('resultado_prueba')
    .select('completed_at, aprobado')
    .gte('completed_at', sixMonthsAgo.toISOString())
    .not('completed_at', 'is', null);

  if (resultadosError) throw resultadosError;

  const pruebaActivityMap = new Map<string, { count: number; aprobados: number }>();
  (resultados || []).forEach((r) => {
    if (!r.completed_at) return;
    const date = new Date(r.completed_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = pruebaActivityMap.get(monthKey) || { count: 0, aprobados: 0 };
    current.count += 1;
    if (r.aprobado) current.aprobados += 1;
    pruebaActivityMap.set(monthKey, current);
  });

  const prueba_activity = Array.from(pruebaActivityMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Completación de lecciones por mes
  const { data: progreso, error: progresoError } = await supabase
    .from('progreso')
    .select('fecha_ultimo_acceso, completado')
    .gte('fecha_ultimo_acceso', sixMonthsAgo.toISOString());

  if (progresoError) throw progresoError;

  const lessonCompletionMap = new Map<string, { completed: number; in_progress: number }>();
  (progreso || []).forEach((p) => {
    if (!p.fecha_ultimo_acceso) return;
    const date = new Date(p.fecha_ultimo_acceso);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const current = lessonCompletionMap.get(monthKey) || { completed: 0, in_progress: 0 };
    if (p.completado) {
      current.completed += 1;
    } else {
      current.in_progress += 1;
    }
    lessonCompletionMap.set(monthKey, current);
  });

  const lesson_completion = Array.from(lessonCompletionMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Distribución de roles
  const { data: roleData, error: roleError } = await supabase
    .from('profiles')
    .select('role');

  if (roleError) throw roleError;

  const roleMap = new Map<string, number>();
  (roleData || []).forEach((r) => {
    roleMap.set(r.role, (roleMap.get(r.role) || 0) + 1);
  });

  const role_distribution = Array.from(roleMap.entries()).map(([role, count]) => ({
    role,
    count,
  }));

  // Top 5 lecciones más completadas
  const { data: topLessons, error: topLessonsError } = await supabase
    .from('progreso')
    .select('leccion_id, completado')
    .eq('completado', true);

  if (topLessonsError) throw topLessonsError;

  const lessonCountMap = new Map<number, number>();
  (topLessons || []).forEach((p) => {
    if (p.leccion_id) {
      lessonCountMap.set(p.leccion_id, (lessonCountMap.get(p.leccion_id) || 0) + 1);
    }
  });

  // Obtener títulos de lecciones
  const leccionIds = Array.from(lessonCountMap.keys());
  let topLessonsWithTitles: Array<{ leccion_id: number; titulo: string; completadas: number }> = [];

  if (leccionIds.length > 0) {
    const { data: lecciones, error: leccionesError } = await supabase
      .from('leccion')
      .select('id, titulo')
      .in('id', leccionIds);

    if (!leccionesError && lecciones) {
      topLessonsWithTitles = lecciones
        .map((l) => ({
          leccion_id: l.id,
          titulo: l.titulo,
          completadas: lessonCountMap.get(l.id) || 0,
        }))
        .sort((a, b) => b.completadas - a.completadas)
        .slice(0, 5);
    }
  }

  // Top 5 pruebas con mejor desempeño
  const { data: pruebaResults, error: pruebaResultsError } = await supabase
    .from('resultado_prueba')
    .select('prueba_id, puntaje_obtenido, puntaje_total');

  if (pruebaResultsError) throw pruebaResultsError;

  const pruebaStatsMap = new Map<
    number,
    { total: number; sum: number; count: number }
  >();
  (pruebaResults || []).forEach((r) => {
    const current = pruebaStatsMap.get(r.prueba_id) || { total: 0, sum: 0, count: 0 };
    current.count += 1;
    current.sum += r.puntaje_total > 0 ? (r.puntaje_obtenido / r.puntaje_total) * 100 : 0;
    pruebaStatsMap.set(r.prueba_id, current);
  });

  const pruebaIds = Array.from(pruebaStatsMap.keys());
  let topPruebas: Array<{ prueba_id: number; titulo: string; promedio: number; intentos: number }> = [];

  if (pruebaIds.length > 0) {
    const { data: pruebas, error: pruebasError } = await supabase
      .from('prueba')
      .select('id, titulo')
      .in('id', pruebaIds);

    if (!pruebasError && pruebas) {
      topPruebas = pruebas
        .map((p) => {
          const stats = pruebaStatsMap.get(p.id);
          return {
            prueba_id: p.id,
            titulo: p.titulo,
            promedio: stats ? Math.round((stats.sum / stats.count) * 100) / 100 : 0,
            intentos: stats?.count || 0,
          };
        })
        .sort((a, b) => b.promedio - a.promedio)
        .slice(0, 5);
    }
  }

  return {
    user_growth,
    prueba_activity,
    lesson_completion,
    role_distribution,
    top_lessons: topLessonsWithTitles,
    top_pruebas: topPruebas,
  };
}

/**
 * Obtiene resumen de desempeño del sistema
 */
export async function getPerformanceOverview(): Promise<PerformanceOverview> {
  // Obtener todos los resultados de pruebas
  const { data: resultados, error: resultadosError } = await supabase
    .from('resultado_prueba')
    .select('puntaje_obtenido, puntaje_total, aprobado');

  if (resultadosError) throw resultadosError;

  const totalAttempts = resultados?.length || 0;
  let totalScore = 0;
  let aprobados = 0;

  (resultados || []).forEach((r) => {
    if (r.puntaje_total > 0) {
      totalScore += (r.puntaje_obtenido / r.puntaje_total) * 100;
    }
    if (r.aprobado) aprobados += 1;
  });

  const average_score = totalAttempts > 0 ? Math.round((totalScore / totalAttempts) * 100) / 100 : 0;
  const approval_rate = totalAttempts > 0 ? Math.round((aprobados / totalAttempts) * 100 * 100) / 100 : 0;

  // Lecciones más completadas
  const { data: progreso, error: progresoError } = await supabase
    .from('progreso')
    .select('leccion_id, completado')
    .eq('completado', true);

  if (progresoError) throw progresoError;

  const lessonCountMap = new Map<number, number>();
  (progreso || []).forEach((p) => {
    if (p.leccion_id) {
      lessonCountMap.set(p.leccion_id, (lessonCountMap.get(p.leccion_id) || 0) + 1);
    }
  });

  const leccionIds = Array.from(lessonCountMap.keys());
  let mostCompletedLessons: Array<{ leccion_id: number; titulo: string; completadas: number }> = [];

  if (leccionIds.length > 0) {
    const { data: lecciones, error: leccionesError } = await supabase
      .from('leccion')
      .select('id, titulo')
      .in('id', leccionIds);

    if (!leccionesError && lecciones) {
      mostCompletedLessons = lecciones
        .map((l) => ({
          leccion_id: l.id,
          titulo: l.titulo,
          completadas: lessonCountMap.get(l.id) || 0,
        }))
        .sort((a, b) => b.completadas - a.completadas)
        .slice(0, 5);
    }
  }

  // Pruebas con mejor y peor desempeño
  const { data: pruebaResults, error: pruebaResultsError } = await supabase
    .from('resultado_prueba')
    .select('prueba_id, puntaje_obtenido, puntaje_total');

  if (pruebaResultsError) throw pruebaResultsError;

  const pruebaStatsMap = new Map<
    number,
    { sum: number; count: number }
  >();
  (pruebaResults || []).forEach((r) => {
    const current = pruebaStatsMap.get(r.prueba_id) || { sum: 0, count: 0 };
    current.count += 1;
    current.sum += r.puntaje_total > 0 ? (r.puntaje_obtenido / r.puntaje_total) * 100 : 0;
    pruebaStatsMap.set(r.prueba_id, current);
  });

  const pruebaIds = Array.from(pruebaStatsMap.keys());
  let bestPruebas: Array<{ prueba_id: number; titulo: string; promedio: number; intentos: number }> = [];
  let worstPruebas: Array<{ prueba_id: number; titulo: string; promedio: number; intentos: number }> = [];

  if (pruebaIds.length > 0) {
    const { data: pruebas, error: pruebasError } = await supabase
      .from('prueba')
      .select('id, titulo')
      .in('id', pruebaIds);

    if (!pruebasError && pruebas) {
      const allPruebas = pruebas
        .map((p) => {
          const stats = pruebaStatsMap.get(p.id);
          return {
            prueba_id: p.id,
            titulo: p.titulo,
            promedio: stats ? Math.round((stats.sum / stats.count) * 100) / 100 : 0,
            intentos: stats?.count || 0,
          };
        })
        .filter((p) => p.intentos > 0)
        .sort((a, b) => b.promedio - a.promedio);

      bestPruebas = allPruebas.slice(0, 5);
      worstPruebas = allPruebas.slice(-5).reverse();
    }
  }

  return {
    average_score,
    approval_rate,
    total_attempts: totalAttempts,
    most_completed_lessons: mostCompletedLessons,
    best_performing_pruebas: bestPruebas,
    worst_performing_pruebas: worstPruebas,
  };
}

