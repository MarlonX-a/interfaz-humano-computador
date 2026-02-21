import React from 'react';
import { Upload, FileText, X, Loader2, ExternalLink, Video, Music, Image } from 'lucide-react';
import { useMediaUploader } from '@/shared/hooks/useMediaUploader';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

interface MediaUploaderProps {
  mediaUrl: string | null;
  mediaType: MediaType | null;
  onMediaChange: (url: string | null, type: MediaType | null) => void;
  bucketName?: string;
}

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
  const hook = useMediaUploader({ mediaUrl, mediaType, onMediaChange, bucketName });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {hook.t('media.title', { defaultValue: 'Documento / Media' })}
        </h3>
      </div>

      {/* Selector de tipo */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as MediaType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => hook.setSelectedType(type)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              hook.selectedType === type
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
              onClick={hook.handleClear}
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
          {hook.selectedType === 'embed' ? (
            <div className="space-y-3">
              <input
                type="url"
                value={hook.embedUrl}
                onChange={(e) => hook.setEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={hook.handleEmbedSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {hook.t('media.saveEmbed', { defaultValue: 'Guardar URL' })}
              </button>
              <p className="text-xs text-gray-500">
                {hook.t('media.embedHint', { defaultValue: 'Ingresa la URL de embed de YouTube, Vimeo, Google Slides, etc.' })}
              </p>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                hook.uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              {hook.uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={40} className="animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600">
                    {hook.t('media.uploading', { defaultValue: 'Subiendo archivo...' })}
                  </p>
                </div>
              ) : (
                <>
                  <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">
                    {hook.t('media.dropHint', { defaultValue: 'Arrastra un archivo aquí o' })}
                  </p>
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                      {hook.t('media.selectFile', { defaultValue: 'Seleccionar archivo' })}
                    </span>
                    <input
                      ref={hook.fileInputRef}
                      type="file"
                      accept={hook.getAcceptString()}
                      onChange={hook.handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-3">
                    {hook.t('media.maxSize', { defaultValue: 'Máximo 50MB' })} • {TYPE_LABELS[hook.selectedType]}
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
