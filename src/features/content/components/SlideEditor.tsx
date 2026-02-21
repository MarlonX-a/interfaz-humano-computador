import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronUp, ChevronDown, Image, Box, GripVertical, Upload, FileUp, Loader2 } from 'lucide-react';
import type { ContentSlide, ModeloRA } from '@/shared/types';
import { useSlideEditor } from '@/features/content/hooks/useSlideEditor';

interface SlideEditorProps {
  slides: ContentSlide[];
  onChange: (slides: ContentSlide[]) => void;
  availableModelos?: ModeloRA[];
}

export default function SlideEditor({ slides, onChange, availableModelos = [] }: SlideEditorProps) {
  const { t } = useTranslation();
  const hook = useSlideEditor({ slides, onChange });

  return (
    <div className="space-y-4">
      {/* Header con opciones */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {t('slides.title', { defaultValue: 'Diapositivas' })} ({slides.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={hook.addSlide}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              {t('slides.add', { defaultValue: 'Agregar slide' })}
            </button>
            <label className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm cursor-pointer">
              {hook.uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {t('slides.upload', { defaultValue: 'Subir archivo' })}
              <input
                ref={hook.fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={hook.handleFileUpload}
                className="hidden"
                disabled={hook.uploading}
              />
            </label>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          {t('slides.uploadHint', { defaultValue: 'Puedes crear slides manualmente o subir un PDF/imagen de presentación.' })}
        </p>
      </div>

      {slides.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileUp size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500 mb-4">
            {t('slides.empty', { defaultValue: 'No hay diapositivas. Agrega una para comenzar.' })}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={hook.addSlide}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('slides.addFirst', { defaultValue: 'Crear diapositiva' })}
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
              {t('slides.uploadFirst', { defaultValue: 'Subir presentación' })}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={hook.handleFileUpload}
                className="hidden"
                disabled={hook.uploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`border rounded-lg overflow-hidden transition-all ${
                hook.expandedIndex === index ? 'border-blue-500 shadow-md' : 'border-gray-200'
              }`}
            >
              {/* Header del slide */}
              <div
                className={`flex items-center gap-2 px-4 py-3 cursor-pointer ${
                  hook.expandedIndex === index ? 'bg-blue-50' : 'bg-gray-50'
                }`}
                onClick={() => hook.setExpandedIndex(hook.expandedIndex === index ? null : index)}
              >
                <GripVertical size={16} className="text-gray-400" />
                <span className="flex-1 font-medium text-gray-700">
                  {index + 1}. {slide.title || `Slide ${index + 1}`}
                  {slide.pdf_page_url && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">PDF</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); hook.moveSlide(index, 'up'); }}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Mover arriba"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); hook.moveSlide(index, 'down'); }}
                    disabled={index === slides.length - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Mover abajo"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); hook.removeSlide(index); }}
                    className="p-1 rounded hover:bg-red-100 text-red-600"
                    title="Eliminar slide"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido del slide (expandido) */}
              {hook.expandedIndex === index && (
                <div className="p-4 space-y-4 bg-white">
                  {/* Si es PDF subido, mostrar preview */}
                  {slide.pdf_page_url && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('slides.pdfPreview', { defaultValue: 'PDF de presentación' })}
                      </label>
                      <iframe
                        src={slide.pdf_page_url}
                        className="w-full h-64 rounded border"
                        title="PDF Preview"
                      />
                    </div>
                  )}

                  {/* Título del slide */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('slides.slideTitle', { defaultValue: 'Título del slide' })}
                    </label>
                    <input
                      type="text"
                      value={slide.title}
                      onChange={(e) => hook.updateSlide(index, { title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Introducción a los átomos"
                    />
                  </div>

                  {/* Contenido HTML */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('slides.content', { defaultValue: 'Contenido' })}
                    </label>
                    <textarea
                      value={slide.content_html}
                      onChange={(e) => hook.updateSlide(index, { content_html: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder="Escribe el contenido del slide. Puedes usar HTML básico como <b>, <i>, <ul>, etc."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('slides.htmlHint', { defaultValue: 'Puedes usar HTML básico: <b>, <i>, <ul>, <li>, <p>, <h3>, <a>' })}
                    </p>
                  </div>

                  {/* Imagen del slide */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Image size={16} />
                      {t('slides.image', { defaultValue: 'Imagen del slide' })}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        value={slide.image_url || ''}
                        onChange={(e) => hook.updateSlide(index, { image_url: e.target.value || null })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                      <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer text-sm">
                        {hook.uploadingImageIndex === index ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {t('slides.uploadImage', { defaultValue: 'Subir' })}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => hook.handleSlideImageUpload(e, index)}
                          className="hidden"
                          disabled={hook.uploadingImageIndex === index}
                        />
                      </label>
                    </div>
                    {slide.image_url && (
                      <div className="mt-2 flex items-start gap-2">
                        <img
                          src={slide.image_url}
                          alt="Preview"
                          className="max-h-32 rounded border"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                          type="button"
                          onClick={() => hook.updateSlide(index, { image_url: null })}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                          title="Eliminar imagen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Modelo 3D asociado */}
                  {availableModelos.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Box size={16} />
                        {t('slides.model', { defaultValue: 'Modelo 3D asociado (opcional)' })}
                      </label>
                      <select
                        value={slide.model_id || ''}
                        onChange={(e) => hook.updateSlide(index, { model_id: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">{t('slides.noModel', { defaultValue: '-- Sin modelo --' })}</option>
                        {availableModelos.map((modelo) => (
                          <option key={modelo.id} value={modelo.id}>
                            {modelo.nombre_modelo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
