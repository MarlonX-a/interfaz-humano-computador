import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X, Loader2, ExternalLink, Video, Music, Image, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import type { MediaFile } from '../types/db';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

interface MultiMediaUploaderProps {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  bucketName?: string;
  maxFiles?: number;
}

const ACCEPTED_TYPES: Record<MediaType, string[]> = {
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  audio: ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  embed: [],
};

const TYPE_LABELS: Record<MediaType, string> = {
  pdf: 'PDF',
  video: 'Video',
  audio: 'Audio',
  image: 'Imagen',
  embed: 'Embed/URL',
};

const TYPE_ICONS: Record<MediaType, React.ReactNode> = {
  pdf: <FileText size={18} />,
  video: <Video size={18} />,
  audio: <Music size={18} />,
  image: <Image size={18} />,
  embed: <ExternalLink size={18} />,
};

function getMediaTypeFromMime(mimeType: string): MediaType {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('video')) return 'video';
  if (mimeType.includes('audio')) return 'audio';
  if (mimeType.includes('image')) return 'image';
  return 'pdf';
}

export default function MultiMediaUploader({
  mediaFiles,
  onMediaFilesChange,
  bucketName = 'contenido-media',
  maxFiles = 10,
}: MultiMediaUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [showEmbedInput, setShowEmbedInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Verificar límite
    if (mediaFiles.length + files.length > maxFiles) {
      toast.error(t('media.maxFilesReached', { 
        defaultValue: `Máximo ${maxFiles} archivos permitidos`,
        count: maxFiles 
      }));
      return;
    }

    setUploading(true);
    const newFiles: MediaFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validar tamaño (máximo 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(t('media.fileTooLarge', { 
            defaultValue: `${file.name} es demasiado grande. Máximo 50MB.` 
          }));
          continue;
        }

        // Generar nombre único
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'bin';
        const mediaType = getMediaTypeFromMime(file.type);
        const fileName = `${mediaType}/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(t('media.uploadErrorFile', { 
            defaultValue: `Error subiendo ${file.name}` 
          }));
          continue;
        }

        // Obtener URL pública
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
          count: newFiles.length 
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
  };

  const handleAddEmbed = () => {
    if (!embedUrl.trim()) {
      toast.error(t('media.embedRequired', { defaultValue: 'Ingresa una URL válida' }));
      return;
    }

    if (mediaFiles.length >= maxFiles) {
      toast.error(t('media.maxFilesReached', { defaultValue: `Máximo ${maxFiles} archivos permitidos` }));
      return;
    }

    const newFile: MediaFile = {
      url: embedUrl.trim(),
      type: 'embed',
      name: 'Embed URL',
    };

    onMediaFilesChange([...mediaFiles, newFile]);
    setEmbedUrl('');
    setShowEmbedInput(false);
    toast.success(t('media.embedAdded', { defaultValue: 'URL añadida' }));
  };

  const removeFile = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    onMediaFilesChange(newFiles);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allAccepted = Object.values(ACCEPTED_TYPES).flat().join(',');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {t('media.title', { defaultValue: 'Documentos / Media' })} ({mediaFiles.length}/{maxFiles})
        </h3>
      </div>

      {/* Lista de archivos subidos */}
      {mediaFiles.length > 0 && (
        <div className="space-y-2">
          {mediaFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0 p-2 bg-white rounded border">
                {TYPE_ICONS[file.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name || TYPE_LABELS[file.type]}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="bg-gray-200 px-1.5 py-0.5 rounded">{TYPE_LABELS[file.type]}</span>
                  {file.size && <span>{formatFileSize(file.size)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                  title="Ver archivo"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Previews por tipo */}
      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {mediaFiles.map((file, index) => (
            <div key={index} className="border rounded-lg overflow-hidden bg-white">
              {file.type === 'pdf' && (
                <iframe src={file.url} className="w-full h-40" title={`PDF ${index}`} />
              )}
              {file.type === 'video' && (
                <video src={file.url} controls className="w-full h-40 object-cover" />
              )}
              {file.type === 'audio' && (
                <div className="p-4">
                  <audio src={file.url} controls className="w-full" />
                </div>
              )}
              {file.type === 'image' && (
                <img src={file.url} alt={file.name} className="w-full h-40 object-cover" />
              )}
              {file.type === 'embed' && (
                <iframe src={file.url} className="w-full h-40" title={`Embed ${index}`} allowFullScreen />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Área de subida */}
      {mediaFiles.length < maxFiles && (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  {t('media.uploading', { defaultValue: 'Subiendo archivos...' })}
                </p>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-2 text-sm">
                  {t('media.dropHint', { defaultValue: 'Arrastra archivos aquí o' })}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm">
                      {t('media.selectFiles', { defaultValue: 'Seleccionar archivos' })}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={allAccepted}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEmbedInput(!showEmbedInput)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    <Plus size={16} className="inline mr-1" />
                    {t('media.addEmbed', { defaultValue: 'Añadir URL/Embed' })}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {t('media.supportedFormats', { defaultValue: 'PDF, Videos, Audio, Imágenes • Máximo 50MB cada uno' })}
                </p>
              </>
            )}
          </div>

          {/* Input para embed URL */}
          {showEmbedInput && (
            <div className="flex gap-2 p-4 bg-gray-50 rounded-lg border">
              <input
                type="url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddEmbed}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('media.add', { defaultValue: 'Añadir' })}
              </button>
              <button
                type="button"
                onClick={() => { setShowEmbedInput(false); setEmbedUrl(''); }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
