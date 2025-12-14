import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X, Loader2, ExternalLink, Video, Music, Image } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

interface MediaUploaderProps {
  mediaUrl: string | null;
  mediaType: MediaType | null;
  onMediaChange: (url: string | null, type: MediaType | null) => void;
  bucketName?: string;
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
  pdf: <FileText size={20} />,
  video: <Video size={20} />,
  audio: <Music size={20} />,
  image: <Image size={20} />,
  embed: <ExternalLink size={20} />,
};

export default function MediaUploader({
  mediaUrl,
  mediaType,
  onMediaChange,
  bucketName = 'contenido-media',
}: MediaUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<MediaType>(mediaType || 'pdf');
  const [embedUrl, setEmbedUrl] = useState(mediaType === 'embed' ? mediaUrl || '' : '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const acceptedMimes = ACCEPTED_TYPES[selectedType];
    if (acceptedMimes.length > 0 && !acceptedMimes.includes(file.type)) {
      toast.error(t('media.invalidType', { 
        defaultValue: `Tipo de archivo no válido. Se esperaba: ${TYPE_LABELS[selectedType]}` 
      }));
      return;
    }

    // Validar tamaño (máximo 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(t('media.fileTooLarge', { defaultValue: 'El archivo es demasiado grande. Máximo 50MB.' }));
      return;
    }

    setUploading(true);
    try {
      // Generar nombre único
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `${selectedType}/${fileName}`;

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Si el bucket no existe, intentar crearlo o usar uno existente
        if (uploadError.message.includes('Bucket not found')) {
          toast.error(t('media.bucketError', { 
            defaultValue: 'Error: El bucket de almacenamiento no existe. Contacta al administrador.' 
          }));
          throw uploadError;
        }
        throw uploadError;
      }

      // Obtener URL pública
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
  };

  const handleEmbedSave = () => {
    if (!embedUrl.trim()) {
      toast.error(t('media.embedRequired', { defaultValue: 'Ingresa una URL válida' }));
      return;
    }
    onMediaChange(embedUrl.trim(), 'embed');
    toast.success(t('media.embedSaved', { defaultValue: 'URL guardada' }));
  };

  const handleClear = () => {
    onMediaChange(null, null);
    setEmbedUrl('');
  };

  const getAcceptString = () => {
    return ACCEPTED_TYPES[selectedType].join(',');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {t('media.title', { defaultValue: 'Documento / Media' })}
        </h3>
      </div>

      {/* Selector de tipo */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as MediaType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              selectedType === type
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {TYPE_ICONS[type]}
            <span className="text-sm">{TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      {/* Área de carga o URL actual */}
      {mediaUrl ? (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {TYPE_ICONS[mediaType || 'pdf']}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {TYPE_LABELS[mediaType || 'pdf']} cargado
                </p>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline truncate block"
                >
                  {mediaUrl}
                </a>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
              title="Eliminar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Preview según tipo */}
          <div className="mt-4">
            {mediaType === 'pdf' && (
              <iframe
                src={mediaUrl}
                className="w-full h-64 rounded border"
                title="PDF Preview"
              />
            )}
            {mediaType === 'video' && (
              <video src={mediaUrl} controls className="w-full max-h-64 rounded" />
            )}
            {mediaType === 'audio' && (
              <audio src={mediaUrl} controls className="w-full" />
            )}
            {mediaType === 'image' && (
              <img src={mediaUrl} alt="Preview" className="max-h-64 rounded" />
            )}
            {mediaType === 'embed' && (
              <iframe
                src={mediaUrl}
                className="w-full h-64 rounded border"
                title="Embedded Content"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ) : (
        <>
          {selectedType === 'embed' ? (
            <div className="space-y-3">
              <input
                type="url"
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleEmbedSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('media.saveEmbed', { defaultValue: 'Guardar URL' })}
              </button>
              <p className="text-xs text-gray-500">
                {t('media.embedHint', { defaultValue: 'Ingresa la URL de embed de YouTube, Vimeo, Google Slides, etc.' })}
              </p>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">
                    {t('media.uploading', { defaultValue: 'Subiendo archivo...' })}
                  </p>
                </div>
              ) : (
                <>
                  <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">
                    {t('media.dropHint', { defaultValue: 'Arrastra un archivo aquí o' })}
                  </p>
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                      {t('media.selectFile', { defaultValue: 'Seleccionar archivo' })}
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={getAcceptString()}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    {t('media.maxSize', { defaultValue: 'Máximo 50MB' })} • {TYPE_LABELS[selectedType]}
                  </p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
