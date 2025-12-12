import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  getStudentsByTeacher,
  getAnalyticsByTeacher,
  getPerformanceByStudent,
  type StudentPerformance,
  type AnalyticsData,
  type StudentDetail,
} from '../../lib/data/performance';
import PerformanceMetrics from '../../components/PerformanceMetrics';
import PerformanceChart from '../../components/PerformanceChart';
import PerformanceTable from '../../components/PerformanceTable';
import StudentPerformanceDetail from '../../components/StudentPerformanceDetail';
import ExportButton from '../../components/ExportButton';
import { Filter, Download } from 'lucide-react';

export default function TeacherPerformance() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [loadingStudentDetail, setLoadingStudentDetail] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    leccion_id: '',
    prueba_id: '',
    estudiante_id: '',
  });

  useEffect(() => {
    const ensure = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          navigate('/login');
          return;
        }
        const { data: profile } = await getProfile(session.user.id);
        const role = profile?.role || session.user.user_metadata?.role || null;
        if (!['teacher', 'admin'].includes(role)) {
          navigate('/login');
          return;
        }
        setUserId(session.user.id);
        const adminStatus = role === 'admin';
        setIsAdmin(adminStatus);
        await loadData(session.user.id, adminStatus);
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('teacher.performance.loadError') || 'Error al cargar datos');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [navigate, t]);

  const loadData = async (teacherId: string, isAdmin: boolean = false) => {
    setLoading(true);
    try {
      const [studentsData, analyticsData] = await Promise.all([
        getStudentsByTeacher(teacherId, isAdmin),
        getAnalyticsByTeacher(teacherId, isAdmin),
      ]);
      setStudents(studentsData);
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Error loading performance data:', error);
      toast.error(error?.message || t('teacher.performance.loadError') || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentDetail = async (studentId: string) => {
    if (!userId) return;
    setLoadingStudentDetail(true);
    setShowStudentDetail(true);
    try {
      const detail = await getPerformanceByStudent(studentId, userId, isAdmin);
      setSelectedStudent(detail);
    } catch (error: any) {
      console.error('Error loading student detail:', error);
      toast.error(error?.message || 'Error al cargar detalles del estudiante');
      setSelectedStudent(null);
    } finally {
      setLoadingStudentDetail(false);
    }
  };

  const handleCloseStudentDetail = () => {
    setShowStudentDetail(false);
    setSelectedStudent(null);
  };

  // Filtrar estudiantes según filtros aplicados
  const filteredStudents = students.filter((student) => {
    if (filters.estudiante_id && student.usuario_id !== filters.estudiante_id) {
      return false;
    }
    // Los filtros de lección y prueba se pueden aplicar aquí si es necesario
    return true;
  });

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading') || 'Cargando...'}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isAdmin
            ? (t('teacher.performance.titleAll') || 'Panel de Desempeño - Todos los Estudiantes')
            : (t('teacher.performance.title') || 'Panel de Desempeño del Estudiante')}
        </h1>
        <p className="text-gray-600">
          {isAdmin
            ? (t('teacher.performance.descriptionAll') || 'Vista de administrador: analiza el desempeño de todos los estudiantes del sistema')
            : (t('teacher.performance.description') || 'Analiza el desempeño de los estudiantes en tus lecciones y pruebas')}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">
            {t('teacher.performance.filters') || 'Filtros'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacher.performance.filters.student') || 'Estudiante'}
            </label>
            <select
              value={filters.estudiante_id}
              onChange={(e) => setFilters({ ...filters, estudiante_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('teacher.performance.allStudents') || 'Todos los estudiantes'}</option>
              {students.map((student) => (
                <option key={student.usuario_id} value={student.usuario_id}>
                  {student.display_name || student.email || student.usuario_id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacher.performance.filters.lesson') || 'Lección'}
            </label>
            <select
              value={filters.leccion_id}
              onChange={(e) => setFilters({ ...filters, leccion_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('teacher.performance.allLessons') || 'Todas las lecciones'}</option>
              {/* TODO: Cargar lecciones del profesor */}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('teacher.performance.filters.test') || 'Prueba'}
            </label>
            <select
              value={filters.prueba_id}
              onChange={(e) => setFilters({ ...filters, prueba_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('teacher.performance.allTests') || 'Todas las pruebas'}</option>
              {/* TODO: Cargar pruebas del profesor */}
            </select>
          </div>
        </div>
      </div>

      {/* Métricas */}
      {analytics && <PerformanceMetrics analytics={analytics} loading={loading} />}

      {/* Gráficos */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PerformanceChart type="trends" data={analytics.pruebas_mejor_desempeno} loading={loading} />
          <PerformanceChart type="distribution" data={analytics} loading={loading} />
        </div>
      )}

      {/* Tabla de Estudiantes y Exportación */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('teacher.performance.studentsList') || 'Lista de Estudiantes'}
          </h2>
          <div className="flex items-center gap-2">
            <ExportButton students={filteredStudents} analytics={analytics!} format="csv" />
            <ExportButton students={filteredStudents} analytics={analytics!} format="pdf" />
          </div>
        </div>
        <PerformanceTable
          students={filteredStudents}
          loading={loading}
          onViewDetail={handleViewStudentDetail}
        />
      </div>

      {/* Modal de Detalle de Estudiante */}
      <StudentPerformanceDetail
        student={selectedStudent}
        open={showStudentDetail}
        onClose={handleCloseStudentDetail}
        loading={loadingStudentDetail}
      />
    </main>
  );
}
