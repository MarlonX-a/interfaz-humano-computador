import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ChevronUp, ChevronDown, Image, Box, GripVertical, Upload, FileUp, Loader2 } from 'lucide-react';
import type { ContentSlide, ModeloRA } from '../types/db';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface SlideEditorProps {
  slides: ContentSlide[];
  onChange: (slides: ContentSlide[]) => void;
  availableModelos?: ModeloRA[];
}

export default function SlideEditor({ slides, onChange, availableModelos = [] }: SlideEditorProps) {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [uploading, setUploading] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'upload'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);

  const addSlide = () => {
    const newSlide: ContentSlide = {
      title: `Slide ${slides.length + 1}`,
      content_html: '',
      image_url: null,
      model_id: null,
    };
    onChange([...slides, newSlide]);
    setExpandedIndex(slides.length);
  };

  const removeSlide = (index: number) => {
    const newSlides = slides.filter((_, i) => i !== index);
    onChange(newSlides);
    if (expandedIndex === index) {
      setExpandedIndex(newSlides.length > 0 ? 0 : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateSlide = (index: number, updates: Partial<ContentSlide>) => {
    const newSlides = slides.map((slide, i) => 
      i === index ? { ...slide, ...updates } : slide
    );
    onChange(newSlides);
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;
    
    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    onChange(newSlides);
    setExpandedIndex(newIndex);
  };

  // Subir archivo de presentación (PDF, PPTX convertido a imágenes, etc.)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('slides.invalidFileType', { defaultValue: 'Tipo de archivo no soportado. Usa PDF o imágenes.' }));
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `slides/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('contenido-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('contenido-media').getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        if (file.type === 'application/pdf') {
          // Para PDF, crear un slide con el PDF embedido
          const newSlide: ContentSlide = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            content_html: `<p>Presentación subida: ${file.name}</p>`,
            image_url: null,
            pdf_page_url: urlData.publicUrl,
          };
          onChange([...slides, newSlide]);
          toast.success(t('slides.pdfUploaded', { defaultValue: 'PDF de presentación subido' }));
        } else {
          // Para imagen, crear un slide con la imagen
          const newSlide: ContentSlide = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            content_html: '',
            image_url: urlData.publicUrl,
          };
          onChange([...slides, newSlide]);
          toast.success(t('slides.imageUploaded', { defaultValue: 'Imagen de slide subida' }));
        }
        setExpandedIndex(slides.length);
      }
    } catch (error: any) {
      console.error('Error uploading slide file:', error);
      toast.error(error?.message || t('slides.uploadError', { defaultValue: 'Error al subir archivo' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Subir imagen para un slide específico
  const handleSlideImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error(t('slides.invalidImageType', { defaultValue: 'Solo se permiten imágenes (JPG, PNG, GIF, WebP)' }));
      return;
    }

    setUploadingImageIndex(slideIndex);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `slide-images/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('contenido-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('contenido-media').getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        updateSlide(slideIndex, { image_url: urlData.publicUrl });
        toast.success(t('slides.imageAdded', { defaultValue: 'Imagen agregada al slide' }));
      }
    } catch (error: any) {
      console.error('Error uploading slide image:', error);
      toast.error(error?.message || t('slides.imageUploadError', { defaultValue: 'Error al subir imagen' }));
    } finally {
      setUploadingImageIndex(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

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
              onClick={addSlide}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus size={16} />
              {t('slides.add', { defaultValue: 'Agregar slide' })}
            </button>
            <label className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm cursor-pointer">
              {uploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Upload size={16} />
              )}
              {t('slides.upload', { defaultValue: 'Subir archivo' })}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
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
              onClick={addSlide}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('slides.addFirst', { defaultValue: 'Crear diapositiva' })}
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">
              {t('slides.uploadFirst', { defaultValue: 'Subir presentación' })}
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
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
                expandedIndex === index ? 'border-blue-500 shadow-md' : 'border-gray-200'
              }`}
            >
              {/* Header del slide */}
              <div
                className={`flex items-center gap-2 px-4 py-3 cursor-pointer ${
                  expandedIndex === index ? 'bg-blue-50' : 'bg-gray-50'
                }`}
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              >
                <GripVertical size={16} className="text-gray-400" />
                <span className="flex-1 font-medium text-gray-700">
                  {index + 1}. {slide.title || `Slide ${index + 1}`}
                  {slide.pdf_page_url && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">PDF</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveSlide(index, 'up'); }}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Mover arriba"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); moveSlide(index, 'down'); }}
                    disabled={index === slides.length - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                    title="Mover abajo"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSlide(index); }}
                    className="p-1 rounded hover:bg-red-100 text-red-600"
                    title="Eliminar slide"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Contenido del slide (expandido) */}
              {expandedIndex === index && (
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
                      onChange={(e) => updateSlide(index, { title: e.target.value })}
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
                      onChange={(e) => updateSlide(index, { content_html: e.target.value })}
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
                        onChange={(e) => updateSlide(index, { image_url: e.target.value || null })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                      <label className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer text-sm">
                        {uploadingImageIndex === index ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {t('slides.uploadImage', { defaultValue: 'Subir' })}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSlideImageUpload(e, index)}
                          className="hidden"
                          disabled={uploadingImageIndex === index}
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
                          onClick={() => updateSlide(index, { image_url: null })}
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
                        onChange={(e) => updateSlide(index, { model_id: e.target.value ? Number(e.target.value) : null })}
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
