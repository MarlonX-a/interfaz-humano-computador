import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listPruebasByTeacher, deletePrueba } from '../../lib/data/pruebas';
import type { Prueba } from '../../types/db';
import { Plus, Search, Edit, Trash2, BookOpenText, Clock, Target } from 'lucide-react';
import EditPruebaModal from '../../components/EditPruebaModal';

export default function TeacherPruebas() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPruebaId, setEditingPruebaId] = useState<number | null>(null);
  const [deletingPruebaId, setDeletingPruebaId] = useState<number | null>(null);

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
        await loadPruebas(session.user.id, adminStatus);
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('teacher.pruebas.loadError') || 'Error al cargar pruebas');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [navigate, t]);

  const loadPruebas = async (teacherId: string, isAdmin: boolean = false) => {
    setLoading(true);
    try {
      const data = await listPruebasByTeacher(teacherId, isAdmin);
      // Cargar información de lecciones
      const pruebasConLecciones = await Promise.all(
        data.map(async (p) => {
          const { data: leccionData } = await supabase
            .from('leccion')
            .select('id, titulo')
            .eq('id', p.leccion_id)
            .single();
          return { ...p, leccion: leccionData };
        })
      );
      setPruebas(pruebasConLecciones as any);
    } catch (error: any) {
      console.error('Error loading pruebas:', error);
      toast.error(error?.message || t('teacher.pruebas.loadError') || 'Error al cargar pruebas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('teacher.pruebas.confirmDelete') || '¿Estás seguro de que deseas eliminar esta prueba?')) {
      return;
    }
    setDeletingPruebaId(id);
    try {
      await deletePrueba(id);
      toast.success(t('teacher.pruebas.deleteSuccess') || 'Prueba eliminada correctamente');
      if (userId) await loadPruebas(userId);
    } catch (error: any) {
      console.error('Error deleting prueba:', error);
      toast.error(error?.message || t('teacher.pruebas.deleteError') || 'Error al eliminar prueba');
    } finally {
      setDeletingPruebaId(null);
    }
  };

  const handleEdit = (id: number) => {
    setEditingPruebaId(id);
  };

  const handleModalClose = () => {
    setEditingPruebaId(null);
  };

  const handleModalUpdated = async () => {
    if (userId) await loadPruebas(userId, isAdmin);
  };

  const filteredPruebas = pruebas.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const leccionTitulo = (p as any).leccion?.titulo?.toLowerCase() || '';
    return (
      p.titulo?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      leccionTitulo.includes(q)
    );
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
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isAdmin 
              ? (t('teacher.pruebas.titleAll') || 'Todas las Pruebas')
              : (t('teacher.pruebas.title') || 'Gestión de Pruebas')}
          </h1>
          <p className="text-gray-600">
            {isAdmin
              ? (t('teacher.pruebas.descriptionAll') || 'Vista de administrador: todas las pruebas del sistema')
              : (t('teacher.pruebas.description') || 'Crea y gestiona pruebas para tus lecciones')}
          </p>
        </div>
        <button
          onClick={() => setEditingPruebaId(0)} // 0 = nueva prueba
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus size={18} />
          <span>{t('teacher.pruebas.newPrueba') || 'Nueva Prueba'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={t('teacher.pruebas.searchPlaceholder') || 'Buscar pruebas...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading') || 'Cargando...'}</p>
        </div>
      )}

      {/* Pruebas Grid */}
      {!loading && (
        <>
          {filteredPruebas.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BookOpenText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? t('teacher.pruebas.noResults') || 'No se encontraron resultados' : t('teacher.pruebas.noPruebas') || 'No tienes pruebas aún'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? t('teacher.pruebas.tryDifferentSearch') || 'Intenta con otros términos de búsqueda'
                  : t('teacher.pruebas.createFirst') || 'Crea tu primera prueba para comenzar'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setEditingPruebaId(0)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('teacher.pruebas.newPrueba') || 'Crear Prueba'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPruebas.map((p) => {
                const isDeleting = deletingPruebaId === p.id;
                const leccion = (p as any).leccion;
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
                  >
                    <div className="p-5">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {p.titulo}
                        </h3>
                        {leccion && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <BookOpenText size={14} />
                            <span className="truncate">{leccion.titulo}</span>
                          </div>
                        )}
                        {p.descripcion && (
                          <p className="text-sm text-gray-500 line-clamp-2 mb-2">{p.descripcion}</p>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {p.tiempo_limite && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            <Clock size={12} />
                            <span>{p.tiempo_limite} min</span>
                          </div>
                        )}
                        {p.puntaje_minimo && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            <Target size={12} />
                            <span>{p.puntaje_minimo}%</span>
                          </div>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${p.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {p.activa ? t('teacher.pruebas.active') || 'Activa' : t('teacher.pruebas.inactive') || 'Inactiva'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <button
                          onClick={() => handleEdit(p.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          disabled={isDeleting}
                        >
                          <Edit size={16} />
                          <span className="text-sm font-medium">{t('teacher.edit') || 'Editar'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingPruebaId !== null && userId && (
        <EditPruebaModal
          open={editingPruebaId !== null}
          onClose={handleModalClose}
          pruebaId={editingPruebaId === 0 ? null : editingPruebaId}
          onUpdated={handleModalUpdated}
          userId={userId}
        />
      )}
    </main>
  );
}

