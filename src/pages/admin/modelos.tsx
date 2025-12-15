import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listAllModelos, deleteModeloRA } from '../../lib/data/modelos';
import { listLecciones } from '../../lib/data/lecciones';
import type { ModeloRA, Leccion } from '../../types/db';
import { Plus, Trash2, Edit2, Eye, Search } from 'lucide-react';
import EditModeloModal from '../../components/EditModeloModal';
import ViewModeloModal from '../../components/ViewModeloModal';
import CreateModeloModal from '../../components/CreateModeloModal';

export default function AdminModelos() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modelos, setModelos] = useState<ModeloRA[]>([]);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  
  const [editingModelo, setEditingModelo] = useState<ModeloRA | null>(null);
  const [viewingModelo, setViewingModelo] = useState<ModeloRA | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          navigate('/login');
          return;
        }
        const profile = await getProfile(session.user.id);
        if (profile?.data?.role !== 'admin') {
          navigate('/login');
          return;
        }
      } catch (err) {
        console.error('Auth error:', err);
        navigate('/login');
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  // Cargar datos
  useEffect(() => {
    if (checkingAuth) return;
    loadData();
  }, [checkingAuth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelosData, leccionesData] = await Promise.all([
        listAllModelos(),
        listLecciones(),
      ]);
      setModelos(modelosData);
      setLecciones(leccionesData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      toast.error(t('admin.modelos.errorLoading') || 'Error cargando modelos');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!window.confirm(`¿Eliminar modelo "${nombre}"?`)) return;

    try {
      await deleteModeloRA(id);
      setModelos(modelos.filter(m => m.id !== id));
      toast.success('Modelo eliminado correctamente');
    } catch (err: any) {
      console.error('Error deleting modelo:', err);
      toast.error('Error al eliminar modelo');
    }
  };

  const handleEdit = (modelo: ModeloRA) => {
    setEditingModelo(modelo);
    setShowEditModal(true);
  };

  const handleView = (modelo: ModeloRA) => {
    setViewingModelo(modelo);
    setShowViewModal(true);
  };

  const handleModeloCreated = (nuevoModelo: ModeloRA) => {
    setModelos([...modelos, nuevoModelo]);
    setShowCreateModal(false);
    toast.success('Modelo creado correctamente');
  };

  const handleModeloUpdated = (modeloActualizado: ModeloRA) => {
    setModelos(modelos.map(m => m.id === modeloActualizado.id ? modeloActualizado : m));
    setShowEditModal(false);
    setEditingModelo(null);
    toast.success('Modelo actualizado correctamente');
  };

  // Filtrar modelos
  const modelosFiltrados = modelos.filter(modelo => {
    const matchSearch = modelo.nombre_modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       modelo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = !filtroTipo || modelo.tipo === filtroTipo;
    return matchSearch && matchTipo;
  });

  // Obtener nombre de lección
  const getNombreLeccion = (leccionId: number | null) => {
    if (!leccionId) return 'Sin lección';
    return lecciones.find(l => l.id === leccionId)?.titulo || `Lección ${leccionId}`;
  };

  // Tipos únicos
  const tipos = Array.from(new Set(modelos.map(m => m.tipo).filter(Boolean)));

  if (checkingAuth || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('admin.modelos.title') || 'Gestión de Modelos RA'}
          </h1>
          <p className="text-gray-600">
            {t('admin.modelos.subtitle') || 'Administra los modelos de Realidad Aumentada de la plataforma'}
          </p>
        </div>

        {/* Controles */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Búsqueda */}
            <div className="col-span-1 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro tipo */}
            <div>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los tipos</option>
                {tipos.map(tipo => (
                  <option key={tipo || 'sin-tipo'} value={tipo || ''}>{tipo || 'Sin tipo'}</option>
                ))}
              </select>
            </div>

            {/* Botón crear */}
            <div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Plus className="h-5 w-5" />
                {t('admin.modelos.create') || 'Nuevo Modelo'}
              </button>
            </div>
          </div>

          {/* Resumen */}
          <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold">{modelosFiltrados.length}</span> de{' '}
            <span className="font-semibold">{modelos.length}</span> modelos
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {modelosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">
                {searchTerm || filtroTipo
                  ? 'No se encontraron modelos con los filtros aplicados'
                  : 'No hay modelos registrados aún'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tipo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Lección</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Descripción</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Creado por</th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modelosFiltrados.map(modelo => (
                    <tr key={modelo.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {modelo.nombre_modelo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {modelo.tipo || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getNombreLeccion(modelo.leccion_id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <p className="truncate max-w-xs">
                          {modelo.descripcion || '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {modelo.created_by || 'Sistema'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleView(modelo)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(modelo)}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(modelo.id, modelo.nombre_modelo)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateModeloModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleModeloCreated}
        />
      )}

      {showEditModal && editingModelo && (
        <EditModeloModal
          modelo={editingModelo}
          onClose={() => {
            setShowEditModal(false);
            setEditingModelo(null);
          }}
          onSuccess={handleModeloUpdated}
        />
      )}

      {showViewModal && viewingModelo && (
        <ViewModeloModal
          modelo={viewingModelo}
          onClose={() => {
            setShowViewModal(false);
            setViewingModelo(null);
          }}
        />
      )}
    </div>
  );
}
