import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import toast from 'react-hot-toast';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

const ACCEPTED_TYPES: Record<MediaType, string[]> = {
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  embed: [],
};

interface UseMediaUploaderParams {
  mediaUrl: string | null;
  mediaType: MediaType | null;
  onMediaChange: (url: string | null, type: MediaType | null) => void;
  bucketName: string;
}

export function useMediaUploader({
  mediaType,
  onMediaChange,
  bucketName,
}: UseMediaUploaderParams) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<MediaType>(mediaType || 'pdf');
  const [embedUrl, setEmbedUrl] = useState(mediaType === 'embed' ? '' : '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const acceptedMimes = ACCEPTED_TYPES[selectedType];
    if (acceptedMimes.length > 0 && !acceptedMimes.includes(file.type)) {
      toast.error(t('media.invalidType', {
        defaultValue: `Tipo de archivo no válido. Se esperaba: ${selectedType}`,
      }));
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('media.fileTooLarge', { defaultValue: 'El archivo es demasiado grande. Máximo 50MB.' }));
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${selectedType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          toast.error(t('media.bucketError', {
            defaultValue: 'Error: El bucket de almacenamiento no existe. Contacta al administrador.',
          }));
          throw uploadError;
        }
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        onMediaChange(urlData.publicUrl, selectedType);
        toast.success(t('media.uploadSuccess', { defaultValue: 'Archivo subido correctamente' }));
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error?.message || t('media.uploadError', { defaultValue: 'Error al subir archivo' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedType, bucketName, onMediaChange, t]);

  const handleEmbedSave = useCallback(() => {
    if (!embedUrl.trim()) {
      toast.error(t('media.embedRequired', { defaultValue: 'Ingresa una URL válida' }));
      return;
    }
    onMediaChange(embedUrl.trim(), 'embed');
    toast.success(t('media.embedSaved', { defaultValue: 'URL guardada' }));
  }, [embedUrl, onMediaChange, t]);

  const handleClear = useCallback(() => {
    onMediaChange(null, null);
    setEmbedUrl('');
  }, [onMediaChange]);

  const getAcceptString = useCallback(() => {
    return ACCEPTED_TYPES[selectedType].join(',');
  }, [selectedType]);

  return {
    t,
    uploading,
    selectedType, setSelectedType,
    embedUrl, setEmbedUrl,
    fileInputRef,
    handleFileSelect,
    handleEmbedSave,
    handleClear,
    getAcceptString,
  };
}
