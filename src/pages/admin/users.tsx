import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getProfile } from '../../lib/data/profiles';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { listUsers, deleteUser } from '../../lib/data/users';
import type { UserWithProfile, UserFilters } from '../../types/db';
import EditUserModal from '../../components/EditUserModal';
import CreateUserModal from '../../components/CreateUserModal';
import UsersTable from '../../components/UsersTable';
import UserFiltersComponent from '../../components/UserFilters';
import { Search, Plus, Download } from 'lucide-react';

export default function AdminUsers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<UserFilters>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
        if (role !== 'admin') {
          navigate('/login');
          return;
        }
        setUserId(session.user.id);
        await loadUsers();
      } catch (error: any) {
        console.error('Error in ensure:', error);
        toast.error(error?.message || t('admin.users.errors.loadError') || 'Error al cargar usuarios');
      } finally {
        setCheckingAuth(false);
      }
    };
    ensure();
  }, [navigate, t]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allFilters: UserFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
      };
      console.log('[AdminUsers] Loading users with filters:', allFilters);
      const data = await listUsers(allFilters);
      console.log(`[AdminUsers] Loaded ${data.length} users:`, data.map(u => ({ email: u.email, role: u.profile?.role })));
      setUsers(data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error(error?.message || t('admin.users.errors.loadError') || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      loadUsers();
    }
  }, [filters, searchQuery]);

  const handleDelete = async (user: UserWithProfile) => {
    const confirmMessage = t('admin.users.confirmDelete', { email: user.email }) || 
      `¿Estás seguro de que deseas eliminar al usuario ${user.email}?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    setDeletingUserId(user.id);
    try {
      await deleteUser(user.id, false); // Soft delete por defecto
      toast.success(t('admin.users.success.deleted') || 'Usuario eliminado correctamente');
      await loadUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error?.message || t('admin.users.errors.deleteError') || 'Error al eliminar usuario');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleEdit = (user: UserWithProfile) => {
    setEditingUserId(user.id);
  };

  const handleModalClose = () => {
    setEditingUserId(null);
    setShowCreateModal(false);
  };

  const handleModalUpdated = async () => {
    await loadUsers();
  };

  const handleExport = () => {
    try {
      // Crear CSV
      const headers = [
        'Email',
        'Nombre',
        'Apellido',
        'Nombre para Mostrar',
        'Teléfono',
        'Rol',
        'Estado',
        'Verificado',
        'Fecha Registro',
      ];
      const rows = users.map((user) => [
        user.email,
        user.profile?.first_name || '',
        user.profile?.last_name || '',
        user.profile?.display_name || '',
        user.profile?.phone || '',
        user.profile?.role || '',
        user.is_active ? 'Activo' : 'Inactivo',
        user.profile?.is_verified ? 'Sí' : 'No',
        new Date(user.created_at).toLocaleDateString('es-ES'),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('admin.users.success.exported') || 'Usuarios exportados exitosamente');
    } catch (error: any) {
      console.error('Error exporting users:', error);
      toast.error(error?.message || t('admin.users.errors.exportError') || 'Error al exportar usuarios');
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
            {t('admin.users.title') || 'Gestión de Usuarios'}
          </h1>
          <p className="text-gray-600">
            {t('admin.users.description') || 'Administra todos los usuarios del sistema'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition"
          >
            <Download size={18} />
            <span>{t('admin.users.export') || 'Exportar'}</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
          >
            <Plus size={18} />
            <span>{t('admin.users.create.button') || 'Crear Usuario'}</span>
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('admin.users.search') || 'Buscar por email, nombre...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Filtros */}
      <UserFiltersComponent filters={filters} onFiltersChange={setFilters} />

      {/* Tabla */}
      <UsersTable
        users={users}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Modales */}
      {editingUserId && (
        <EditUserModal
          open={!!editingUserId}
          onClose={handleModalClose}
          userId={editingUserId}
          onUpdated={handleModalUpdated}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          open={showCreateModal}
          onClose={handleModalClose}
          onCreated={handleModalUpdated}
        />
      )}
    </main>
  );
}

