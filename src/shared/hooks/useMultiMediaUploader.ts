import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/shared/lib/supabaseClient';
import toast from 'react-hot-toast';
import type { MediaFile } from '@/shared/types';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

const ACCEPTED_TYPES: Record<MediaType, string[]> = {
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  embed: [],
};

function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('image')) return 'image';
  return 'pdf';
}

interface UseMultiMediaUploaderParams {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  bucketName: string;
  maxFiles: number;
}

export function useMultiMediaUploader({
  mediaFiles,
  onMediaFilesChange,
  bucketName,
  maxFiles,
}: UseMultiMediaUploaderParams) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (mediaFiles.length + files.length > maxFiles) {
      toast.error(t('media.maxFilesReached', {
        defaultValue: `Máximo ${maxFiles} archivos permitidos`,
        count: maxFiles,
      }));
      return;
    }

    setUploading(true);
    const newFiles: MediaFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(t('media.fileTooLarge', {
            defaultValue: `${file.name} es demasiado grande. Máximo 50MB.`,
          }));
          continue;
        }

        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'bin';
        const mediaType = getMediaTypeFromMime(file.type);
        const fileName = `${mediaType}/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(t('media.uploadErrorFile', {
            defaultValue: `Error subiendo ${file.name}`,
          }));
          continue;
        }

        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          newFiles.push({
            url: urlData.publicUrl,
            type: mediaType,
            name: file.name,
            size: file.size,
          });
        }
      }

      if (newFiles.length > 0) {
        onMediaFilesChange([...mediaFiles, ...newFiles]);
        toast.success(t('media.filesUploaded', {
          defaultValue: `${newFiles.length} archivo(s) subido(s)`,
          count: newFiles.length,
        }));
      }
    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast.error(error?.message || t('media.uploadError', { defaultValue: 'Error al subir archivos' }));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [mediaFiles, maxFiles, bucketName, onMediaFilesChange, t]);

  const handleAddEmbed = useCallback(() => {
    if (!embedUrl.trim()) {
      toast.error(t('media.embedRequired', { defaultValue: 'Ingresa una URL válida' }));
      return;
    }
    if (mediaFiles.length >= maxFiles) {
      toast.error(t('media.maxFilesReached', { defaultValue: `Máximo ${maxFiles} archivos permitidos` }));
      return;
    }
    const newFile: MediaFile = { url: embedUrl.trim(), type: 'embed', name: 'Embed URL' };
    onMediaFilesChange([...mediaFiles, newFile]);
    setEmbedUrl('');
    setShowEmbedInput(false);
    toast.success(t('media.embedAdded', { defaultValue: 'URL añadida' }));
  }, [embedUrl, mediaFiles, maxFiles, onMediaFilesChange, t]);

  const removeFile = useCallback((index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    onMediaFilesChange(newFiles);
  }, [mediaFiles, onMediaFilesChange]);

  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const allAccepted = Object.values(ACCEPTED_TYPES).flat().join(',');

  return {
    t,
    uploading,
    embedUrl, setEmbedUrl,
    showEmbedInput, setShowEmbedInput,
    fileInputRef,
    handleFileSelect,
    handleAddEmbed,
    removeFile,
    formatFileSize,
    allAccepted,
  };
}
