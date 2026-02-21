// ─────────────────────────────────────────────────────────────
// Tipos para Dashboard de Administrador
// ─────────────────────────────────────────────────────────────

/** Estadísticas generales del sistema */
export interface DashboardStats {
  total_users: number;
  total_admins: number;
  total_teachers: number;
  total_students: number;
  total_lessons: number;
  total_contents: number;
  total_pruebas: number;
  total_resultados: number;
  total_progreso: number;
  approval_rate: number; // porcentaje
  monthly_activity: number; // actividad del mes actual
}

/** Actividad reciente del sistema */
export interface RecentActivity {
  recent_users: Array<{
    id: string;
    email: string | null;
    display_name: string | null;
    role: string;
    created_at: string;
  }>;
  recent_lessons: Array<{
    id: number;
    titulo: string;
    created_at: string;
    created_by: string | null;
  }>;
  recent_contents: Array<{
    id: number;
    titulo: string;
    created_at: string;
    updated_at: string | null;
  }>;
  recent_pruebas: Array<{
    id: number;
    titulo: string;
    leccion_id: number;
    created_at: string;
  }>;
}

/** Datos para gráficos de tendencias */
export interface SystemTrends {
  user_growth: Array<{
    month: string;
    count: number;
  }>;
  prueba_activity: Array<{
    month: string;
    count: number;
    aprobados: number;
  }>;
  lesson_completion: Array<{
    month: string;
    completed: number;
    in_progress: number;
  }>;
  role_distribution: Array<{
    role: string;
    count: number;
  }>;
  top_lessons: Array<{
    leccion_id: number;
    titulo: string;
    completadas: number;
  }>;
  top_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
}

/** Resumen de desempeño del sistema */
export interface PerformanceOverview {
  average_score: number;
  approval_rate: number;
  total_attempts: number;
  most_completed_lessons: Array<{
    leccion_id: number;
    titulo: string;
    completadas: number;
  }>;
  best_performing_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
  worst_performing_pruebas: Array<{
    prueba_id: number;
    titulo: string;
    promedio: number;
    intentos: number;
  }>;
}
