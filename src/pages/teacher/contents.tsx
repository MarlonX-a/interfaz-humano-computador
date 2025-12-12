import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listContenidosByTeacher, deleteContenido } from '../../lib/data/contenidos';
import type { ContenidoConLecciones } from '../../types/db';
import EditContenidoModal from '../../components/EditContenidoModal';
import { X, Search, Plus, Edit, Trash2, BookOpenText } from 'lucide-react';

export default function TeacherContents() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [contents, setContents] = useState<ContenidoConLecciones[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingContenidoId, setEditingContenidoId] = useState<number | null>(null);
  const [deletingContenidoId, setDeletingContenidoId] = useState<number | null>(null);

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
        await loadContents(session.user.id, adminStatus);
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('teacher.contents.loadError') || 'Error al cargar contenidos');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [navigate, t]);

  const loadContents = async (teacherId: string, isAdmin: boolean = false) => {
    setLoading(true);
    try {
      const data = await listContenidosByTeacher(teacherId, isAdmin);
      setContents(data);
    } catch (error: any) {
      console.error('Error loading contents:', error);
      toast.error(error?.message || t('teacher.contents.loadError') || 'Error al cargar contenidos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('teacher.contents.confirmDelete') || '¿Estás seguro de que deseas eliminar este contenido?')) {
      return;
    }
    setDeletingContenidoId(id);
    try {
      await deleteContenido(id);
      toast.success(t('teacher.contents.deleteSuccess') || 'Contenido eliminado correctamente');
      if (userId) await loadContents(userId);
    } catch (error: any) {
      console.error('Error deleting contenido:', error);
      toast.error(error?.message || t('teacher.contents.deleteError') || 'Error al eliminar contenido');
    } finally {
      setDeletingContenidoId(null);
    }
  };

  const handleEdit = (id: number) => {
    setEditingContenidoId(id);
  };

  const handleModalClose = () => {
    setEditingContenidoId(null);
  };

  const handleModalUpdated = async () => {
    if (userId) await loadContents(userId, isAdmin);
  };

  const filteredContents = contents.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const leccionesMatch = c.lecciones?.some((l) => l.titulo?.toLowerCase().includes(q)) || false;
    return (
      c.titulo?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.author?.toLowerCase().includes(q) ||
      c.difficulty?.toLowerCase().includes(q) ||
      leccionesMatch ||
      (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const getTypeLabel = (typeVal: string | null | undefined) => {
    if (!typeVal) return '';
    switch (typeVal) {
      case 'molecule': return t('addcontent.form.typeOptions.molecule');
      case 'atom': return t('addcontent.form.typeOptions.atom');
      case 'experiment': return t('addcontent.form.typeOptions.experiment');
      case 'chemical-reaction': return t('addcontent.form.typeOptions.chemicalReactions');
      case 'periodic-table': return t('addcontent.form.typeOptions.periodicTable');
      case 'article': return t('addcontent.form.typeOptions.article');
      default: return typeVal;
    }
  };

  const difficultyColor = (difficulty: string | null | undefined) => {
    switch (difficulty) {
      case 'fácil':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'difícil':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
              ? (t('teacher.contents.titleAll') || 'Todos los Contenidos')
              : (t('teacher.contents.title') || 'Mis Contenidos')}
          </h1>
          {isAdmin && (
            <p className="text-sm text-gray-600 mb-2">
              {t('teacher.contents.viewingAll') || 'Vista de administrador: viendo todos los contenidos del sistema'}
            </p>
          )}
          <p className="text-gray-600">
            {t('teacher.contents.description') || 'Gestiona todos tus contenidos y lecciones'}
          </p>
        </div>
        <button
          onClick={() => navigate('/add-content')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Plus size={18} />
          <span>{t('teacher.newContent') || 'Nuevo Contenido'}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={t('teacher.contents.searchPlaceholder') || 'Buscar contenidos...'}
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

      {/* Contents Grid */}
      {!loading && (
        <>
          {filteredContents.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <BookOpenText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery ? t('teacher.contents.noResults') || 'No se encontraron resultados' : t('teacher.contents.noContents') || 'No tienes contenidos aún'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? t('teacher.contents.tryDifferentSearch') || 'Intenta con otros términos de búsqueda'
                  : t('teacher.contents.createFirst') || 'Crea tu primer contenido para comenzar'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/add-content')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('teacher.newContent') || 'Crear Contenido'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContents.map((c) => {
                const isDeleting = deletingContenidoId === c.id;
                const primeraLeccion = c.lecciones?.[0];
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200"
                  >
                    {/* Thumbnail/Header */}
                    {primeraLeccion?.thumbnail_url ? (
                      <div className="h-40 bg-gray-200 overflow-hidden">
                        <img
                          src={primeraLeccion.thumbnail_url}
                          alt={primeraLeccion.titulo || ''}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <BookOpenText size={48} className="text-white opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                          {c.titulo}
                        </h3>
                        {/* Múltiples lecciones */}
                        {c.lecciones && c.lecciones.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {c.lecciones.slice(0, 2).map((leccion) => (
                              <div key={leccion.id} className="flex items-center gap-2 text-sm text-gray-600">
                                <BookOpenText size={14} />
                                <span className="truncate">{leccion.titulo}</span>
                              </div>
                            ))}
                            {c.lecciones.length > 2 && (
                              <div className="text-xs text-gray-500 pl-6">
                                +{c.lecciones.length - 2} {t('teacher.contents.moreLessons') || 'lecciones más'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {c.type && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {getTypeLabel(c.type)}
                          </span>
                        )}
                        {c.difficulty && (
                          <span className={`px-2 py-1 text-xs rounded-full border ${difficultyColor(c.difficulty)}`}>
                            {c.difficulty}
                          </span>
                        )}
                        {c.author && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {c.author}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {Array.isArray(c.tags) && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {c.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              +{c.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <button
                          onClick={() => handleEdit(c.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          disabled={isDeleting}
                        >
                          <Edit size={16} />
                          <span className="text-sm font-medium">{t('teacher.edit') || 'Editar'}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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
      {editingContenidoId && userId && (
        <EditContenidoModal
          open={!!editingContenidoId}
          onClose={handleModalClose}
          contenidoId={editingContenidoId}
          onUpdated={handleModalUpdated}
          userId={userId}
        />
      )}
    </main>
  );
}
