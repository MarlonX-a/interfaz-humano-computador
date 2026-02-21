import React from 'react';
import { Upload, FileText, X, Loader2, ExternalLink, Video, Music, Image, Plus, Trash2 } from 'lucide-react';
import type { MediaFile } from '@/shared/types';
import { useMultiMediaUploader } from '@/shared/hooks/useMultiMediaUploader';

type MediaType = 'pdf' | 'video' | 'audio' | 'image' | 'embed';

interface MultiMediaUploaderProps {
  mediaFiles: MediaFile[];
  onMediaFilesChange: (files: MediaFile[]) => void;
  bucketName?: string;
  maxFiles?: number;
}

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

export default function MultiMediaUploader({
  mediaFiles,
  onMediaFilesChange,
  bucketName = 'contenido-media',
  maxFiles = 10,
}: MultiMediaUploaderProps) {
  const hook = useMultiMediaUploader({ mediaFiles, onMediaFilesChange, bucketName, maxFiles });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          {hook.t('media.title', { defaultValue: 'Documentos / Media' })} ({mediaFiles.length}/{maxFiles})
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
                  {file.size && <span>{hook.formatFileSize(file.size)}</span>}
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
                  onClick={() => hook.removeFile(index)}
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
              hook.uploading ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            {hook.uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={32} className="animate-spin text-blue-600" />
                <p className="text-sm text-gray-600">
                  {hook.t('media.uploading', { defaultValue: 'Subiendo archivos...' })}
                </p>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-2 text-sm">
                  {hook.t('media.dropHint', { defaultValue: 'Arrastra archivos aquí o' })}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <label className="inline-block">
                    <span className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 text-sm">
                      {hook.t('media.selectFiles', { defaultValue: 'Seleccionar archivos' })}
                    </span>
                    <input
                      ref={hook.fileInputRef}
                      type="file"
                      accept={hook.allAccepted}
                      onChange={hook.handleFileSelect}
                      className="hidden"
                      multiple
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => hook.setShowEmbedInput(!hook.showEmbedInput)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    <Plus size={16} className="inline mr-1" />
                    {hook.t('media.addEmbed', { defaultValue: 'Añadir URL/Embed' })}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {hook.t('media.supportedFormats', { defaultValue: 'PDF, Videos, Audio, Imágenes • Máximo 50MB cada uno' })}
                </p>
              </>
            )}
          </div>

          {/* Input para embed URL */}
          {hook.showEmbedInput && (
            <div className="flex gap-2 p-4 bg-gray-50 rounded-lg border">
              <input
                type="url"
                value={hook.embedUrl}
                onChange={(e) => hook.setEmbedUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={hook.handleAddEmbed}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {hook.t('media.add', { defaultValue: 'Añadir' })}
              </button>
              <button
                type="button"
                onClick={() => { hook.setShowEmbedInput(false); hook.setEmbedUrl(''); }}
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
