import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { ContentSlide } from '@/shared/types';
import { supabase } from '@/shared/lib/supabaseClient';

interface UseSlideEditorParams {
  slides: ContentSlide[];
  onChange: (slides: ContentSlide[]) => void;
}

export function useSlideEditor({ slides, onChange }: UseSlideEditorParams) {
  const { t } = useTranslation();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [uploading, setUploading] = useState(false);
  const [activeMode, setActiveMode] = useState<'manual' | 'upload'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);

  const addSlide = useCallback(() => {
    const newSlide: ContentSlide = {
      title: `Slide ${slides.length + 1}`,
      content_html: '',
      image_url: null,
      model_id: null,
    };
    onChange([...slides, newSlide]);
    setExpandedIndex(slides.length);
  }, [slides, onChange]);

  const removeSlide = useCallback((index: number) => {
    const newSlides = slides.filter((_, i) => i !== index);
    onChange(newSlides);
    setExpandedIndex((prev) => {
      if (prev === index) {
        return newSlides.length > 0 ? 0 : null;
      } else if (prev !== null && prev > index) {
        return prev - 1;
      }
      return prev;
    });
  }, [slides, onChange]);

  const updateSlide = useCallback((index: number, updates: Partial<ContentSlide>) => {
    const newSlides = slides.map((slide, i) =>
      i === index ? { ...slide, ...updates } : slide
    );
    onChange(newSlides);
  }, [slides, onChange]);

  const moveSlide = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= slides.length) return;

    const newSlides = [...slides];
    [newSlides[index], newSlides[newIndex]] = [newSlides[newIndex], newSlides[index]];
    onChange(newSlides);
    setExpandedIndex(newIndex);
  }, [slides, onChange]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

      const { error: uploadError } = await supabase.storage
        .from('contenido-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('contenido-media').getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        if (file.type === 'application/pdf') {
          const newSlide: ContentSlide = {
            title: file.name.replace(/\.[^/.]+$/, ''),
            content_html: `<p>Presentación subida: ${file.name}</p>`,
            image_url: null,
            pdf_page_url: urlData.publicUrl,
          };
          onChange([...slides, newSlide]);
          toast.success(t('slides.pdfUploaded', { defaultValue: 'PDF de presentación subido' }));
        } else {
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
  }, [slides, onChange, t]);

  const handleSlideImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
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
        // Call updateSlide inline since we need slides reference
        const newSlides = slides.map((slide, i) =>
          i === slideIndex ? { ...slide, image_url: urlData.publicUrl } : slide
        );
        onChange(newSlides);
        toast.success(t('slides.imageAdded', { defaultValue: 'Imagen agregada al slide' }));
      }
    } catch (error: any) {
      console.error('Error uploading slide image:', error);
      toast.error(error?.message || t('slides.imageUploadError', { defaultValue: 'Error al subir imagen' }));
    } finally {
      setUploadingImageIndex(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }, [slides, onChange, t]);

  return {
    expandedIndex, setExpandedIndex,
    uploading,
    activeMode, setActiveMode,
    fileInputRef,
    imageInputRef,
    uploadingImageIndex,
    addSlide,
    removeSlide,
    updateSlide,
    moveSlide,
    handleFileUpload,
    handleSlideImageUpload,
    t,
  };
}
