import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabaseClient';
import { createModeloRA } from '../lib/data/modelos';
import { listLecciones } from '../lib/data/lecciones';
import type { ModeloRA, Leccion } from '../types/db';
import { X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateModeloModalProps {
  onClose: () => void;
  onSuccess: (modelo: ModeloRA) => void;
}

export default function CreateModeloModal({ onClose, onSuccess }: CreateModeloModalProps) {
  const [loading, setLoading] = useState(false);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nombre_modelo: '',
    descripcion: '',
    tipo: '',
    leccion_id: '',
    archivo_url: '',
  });

  useEffect(() => {
    const loadLecciones = async () => {
      try {
        const data = await listLecciones();
        setLecciones(data);
      } catch (err) {
        console.error('Error loading lecciones:', err);
      }
    };
    loadLecciones();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `modelos/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('modelos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('modelos')
        .getPublicUrl(fileName);

      setFormData(prev => ({
        ...prev,
        archivo_url: urlData.publicUrl
      }));
      toast.success('Archivo subido correctamente');
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toast.error('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre_modelo.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    if (!formData.archivo_url) {
      toast.error('Debes subir un archivo');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const nuevoModelo = await createModeloRA({
        nombre_modelo: formData.nombre_modelo,
        descripcion: formData.descripcion || null,
        tipo: formData.tipo || null,
        leccion_id: formData.leccion_id ? parseInt(formData.leccion_id) : null,
        archivo_url: formData.archivo_url,
        created_by: user?.id,
      });

      onSuccess(nuevoModelo);
    } catch (err: any) {
      console.error('Error creating modelo:', err);
      toast.error('Error al crear modelo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Crear Nuevo Modelo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre del Modelo *
            </label>
            <input
              type="text"
              value={formData.nombre_modelo}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                nombre_modelo: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Molécula de Agua"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                descripcion: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descripción del modelo..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={formData.tipo}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  tipo: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 3D, AR, etc"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Lección
              </label>
              <select
                value={formData.leccion_id}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  leccion_id: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar...</option>
                {lecciones.map(leccion => (
                  <option key={leccion.id} value={leccion.id}>
                    {leccion.titulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Archivo *
            </label>
            {formData.archivo_url ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-green-800 font-semibold">✓ Archivo subido</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    archivo_url: ''
                  }))}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition">
                <div className="flex flex-col items-center">
                  <Upload className="h-6 w-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploading ? 'Subiendo...' : 'Haz clic o arrastra un archivo'}
                  </span>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  accept=".glb,.gltf,.obj,.fbx"
                />
              </label>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
            >
              {loading ? 'Creando...' : 'Crear Modelo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
