import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ModeloRA, Leccion } from '../types/db';
import { X } from 'lucide-react';
import { listLecciones } from '../lib/data/lecciones';

interface ViewModeloModalProps {
  modelo: ModeloRA;
  onClose: () => void;
}

export default function ViewModeloModal({ modelo, onClose }: ViewModeloModalProps) {
  const [leccion, setLeccion] = useState<Leccion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (modelo.leccion_id) {
      const loadLeccion = async () => {
        try {
          const lecciones = await listLecciones();
          const found = lecciones.find(l => l.id === modelo.leccion_id);
          setLeccion(found || null);
        } catch (err) {
          console.error('Error loading leccion:', err);
        } finally {
          setLoading(false);
        }
      };
      loadLeccion();
    } else {
      setLoading(false);
    }
  }, [modelo.leccion_id]);

  return (
    <div className="fixed inset-0 bg-white/5 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Detalles del Modelo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Modelo
            </label>
            <p className="text-lg text-gray-900">{modelo.nombre_modelo}</p>
          </div>

          {/* Descripción */}
          {modelo.descripcion && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción
              </label>
              <p className="text-gray-700 leading-relaxed">{modelo.descripcion}</p>
            </div>
          )}

          {/* Grid de detalles */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Tipo */}
            {modelo.tipo && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold mb-1">Tipo</p>
                <p className="text-sm text-gray-900 font-semibold">{modelo.tipo}</p>
              </div>
            )}

            {/* Creado por */}
            {modelo.created_by && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 font-semibold mb-1">Creado por</p>
                <p className="text-sm text-gray-900 font-semibold">{modelo.created_by}</p>
              </div>
            )}

            {/* ID */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-1">ID</p>
              <p className="text-sm text-gray-900 font-semibold">{modelo.id}</p>
            </div>
          </div>

          {/* Lección */}
          {modelo.leccion_id && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lección Asociada
              </label>
              {loading ? (
                <p className="text-gray-500">Cargando...</p>
              ) : leccion ? (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">{leccion.titulo}</p>
                  {leccion.descripcion && (
                    <p className="text-sm text-blue-800 mt-1">{leccion.descripcion}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Lección no encontrada</p>
              )}
            </div>
          )}

          {/* Archivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              URL del Archivo
            </label>
            <div className="p-4 bg-gray-100 rounded-lg break-all">
              <a
                href={modelo.archivo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                {modelo.archivo_url}
              </a>
            </div>
          </div>

          {/* Keywords */}
          {modelo.keywords && modelo.keywords.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Palabras Clave
              </label>
              <div className="flex flex-wrap gap-2">
                {modelo.keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Fórmula molecular */}
          {modelo.molecule_formula && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fórmula Molecular
              </label>
              <p className="text-gray-900 font-mono">{modelo.molecule_formula}</p>
            </div>
          )}

          {/* Categoría */}
          {modelo.categoria && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Categoría
              </label>
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm font-semibold">
                {modelo.categoria}
              </span>
            </div>
          )}

          {/* Descripción corta */}
          {modelo.descripcion_corta && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descripción Corta
              </label>
              <p className="text-gray-700">{modelo.descripcion_corta}</p>
            </div>
          )}

          {/* Botón cerrar */}
          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
