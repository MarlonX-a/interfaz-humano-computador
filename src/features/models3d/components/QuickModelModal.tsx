import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Image as ImageIcon, Loader2, Upload, FileUp, Download } from 'lucide-react';
import { useQuickModel } from '@/features/models3d/hooks/useQuickModel';
import type { ModeloRA } from '@/shared/types';

export default function QuickModelModal({ open, onClose, onCreated, leccionId } : { open: boolean; onClose: () => void; onCreated: (model: ModeloRA) => void, leccionId?: number | null }) {
  const { t } = useTranslation();
  const hook = useQuickModel({ open, leccionId, onClose, onCreated });
  const modalRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef} 
        className="relative mx-4 w-full max-w-lg rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} />
            {t('models.quickModel.title')}
          </h3>
          <p className="text-purple-100 text-sm mt-1">{t('models.quickModel.description')}</p>
          <button 
            aria-label={t('close')}
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {leccionId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-sm text-purple-700">
                {t('models.quickModel.attachedToLesson', { id: leccionId })}
              </span>
            </div>
          )}

          {/* Nombre del modelo */}
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('models.quickModel.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
              value={hook.name} 
              onChange={(e) => hook.setName(e.target.value)} 
              placeholder={t('models.quickModel.namePlaceholder')}
            />
          </div>

          {/* Tipo y Archivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('models.quickModel.typeLabel')}</label>
              <select
                className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                value={hook.type}
                onChange={(e) => hook.setType(e.target.value)}
              >
                <option value="glb">GLB</option>
                <option value="gltf">GLTF</option>
                <option value="usdz">USDZ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('models.quickModel.fileLabel')}</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf,.usdz"
                className="hidden"
                onChange={(e) => hook.setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-sm text-gray-600"
              >
                <FileUp size={16} />
                {hook.file ? t('models.quickModel.change') : t('models.quickModel.upload')}
              </button>
            </div>
          </div>

          {hook.file && (
            <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <span className="text-sm text-green-700">✓ {hook.file.name}</span>
              <button 
                type="button" 
                onClick={() => hook.setFile(null)}
                className="text-green-600 hover:text-green-800"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Sección de Generación desde Imagen */}
          <div className="border rounded-xl p-4 bg-gradient-to-br from-gray-50 to-white">
            <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <ImageIcon size={18} className="text-purple-600" />
              {t('models.quickModel.generateFromImage')}
            </label>
            
            {/* Selector de modo */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => hook.setGenerationMode('billboard')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                  hook.generationMode === 'billboard' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={16} />
                <span className="text-sm font-medium">{t('models.quickModel.generateModes.billboard')}</span>
              </button>
              <button
                type="button"
                onClick={() => hook.setGenerationMode('ai3d')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                  hook.generationMode === 'ai3d' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Sparkles size={16} />
                <span className="text-sm font-medium">{t('models.quickModel.generateModes.ai3d')}</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3 px-1">
              {hook.generationMode === 'billboard' 
                ? t('models.quickModel.generateDesc.billboard')
                : t('models.quickModel.generateDesc.ai3d')}
            </p>

            {/* API Key para modo IA */}
            {hook.generationMode === 'ai3d' && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                {hook.showApiKeyInput || !hook.meshyApiKey ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-purple-700">
                      {t('models.quickModel.apiKeyLabel')} (
                      <a href="https://www.meshy.ai/api" target="_blank" rel="noreferrer" className="underline hover:text-purple-900">
                        {t('models.quickModel.apiKeyGet')}
                      </a>
                      )
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="flex-1 border border-purple-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder={t('models.quickModel.apiKeyPlaceholder')}
                        value={hook.meshyApiKeyInput}
                        onChange={(e) => hook.setMeshyApiKeyInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                        onClick={hook.saveApiKey}
                        disabled={!hook.meshyApiKeyInput.trim()}
                      >
                        {t('models.quickModel.save')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                      <span className="text-sm text-purple-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {t('models.quickModel.apiKeyConfigured')}
                    </span>
                      <button
                      type="button"
                      className="text-sm text-purple-600 hover:text-purple-800 underline"
                      onClick={() => {
                        hook.setMeshyApiKeyInput(hook.meshyApiKey);
                        hook.setShowApiKeyInput(true);
                      }}
                    >
                      {t('models.quickModel.change')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Selector de imagen estilizado */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => hook.setImageFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group mb-3"
            >
              <Upload size={20} className="text-gray-400 group-hover:text-purple-500" />
                  <span className="text-gray-600 group-hover:text-purple-600">
                {hook.imageFile ? hook.imageFile.name : t('models.quickModel.selectImage')}
              </span>
            </button>

            {hook.imageFile && (
              <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 mb-3">
                <span className="text-sm text-blue-700">📷 {hook.imageFile.name}</span>
                <button 
                  type="button" 
                  onClick={() => hook.setImageFile(null)}
                  className="text-blue-600 hover:text-blue-800"
                  disabled={hook.isGenerating}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Botón de generación */}
            <button 
              type="button" 
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                hook.generationMode === 'ai3d' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
              onClick={hook.handleGenerate} 
              disabled={!hook.imageFile || hook.isGenerating || (hook.generationMode === 'ai3d' && !hook.meshyApiKey)}
            >
              {hook.isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {hook.generationMode === 'ai3d' ? t('models.quickModel.generatingWithProgress', { progress: hook.aiProgress }) : t('models.quickModel.processing')}
                </>
              ) : (
                <>
                  {hook.generationMode === 'ai3d' ? <Sparkles size={18} /> : <ImageIcon size={18} />}
                  {hook.generationMode === 'ai3d' ? t('models.quickModel.buttons.generateAi') : t('models.quickModel.buttons.generateBillboard')}
                </>
              )}
            </button>

            {/* Barra de progreso para IA */}
            {hook.isGenerating && hook.generationMode === 'ai3d' && (
              <div className="mt-3">
                <div className="h-2.5 rounded-full overflow-hidden bg-gray-200">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${hook.aiProgress}%` }} 
                  />
                </div>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  {hook.aiStatus || t('models.quickModel.processing')}
                </p>
              </div>
            )}

            {/* Archivo GLB generado */}
            {hook.file && !hook.uploading && (
              <div className="mt-3 flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <span className="text-sm text-green-700 font-medium">✓ {t('models.quickModel.success.glbReady')}: {hook.file.name}</span>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('models.quickModel.descriptionLabel')}</label>
            <textarea 
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none" 
              value={hook.description} 
              onChange={(e) => hook.setDescription(e.target.value)} 
              rows={2}
              placeholder={t('models.quickModel.descriptionPlaceholder')}
            />
          </div>

          {/* Barra de progreso de subida */}
          {hook.uploading && (
            <div className="space-y-1">
              <div className="h-2.5 rounded-full overflow-hidden bg-gray-200">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" 
                  style={{ width: `${hook.progress}%` }} 
                />
              </div>
              <p className="text-xs text-gray-500 text-center">{t('common.percentCompleted', { percent: hook.progress })}</p>
            </div>
          )}

          {/* Modelo creado */}
          {hook.createdModel && (
            <div className="border rounded-xl p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">✓ {t('models.quickModel.success.modelCreated')}</span>
                <div className="flex items-center gap-2">
                  {hook.createdModel.archivo_url && (
                    <button 
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium" 
                      onClick={() => hook.downloadFile(hook.createdModel!.archivo_url, `${hook.createdModel!.nombre_modelo}.glb`)}
                    >
                      <Download size={14} />
                      Descargar
                    </button>
                  )}
                </div>
              </div>
              {!hook.isAuthenticated && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ {t('models.quickModel.errors.loginToManageModel')}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <button 
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors" 
              onClick={onClose}
            >
              {t('models.quickModel.buttons.cancel')}
            </button>
            <button 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={hook.uploadAndCreate} 
              disabled={hook.uploading || !hook.name.trim() || !hook.isAuthenticated}
            >
              {hook.uploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {t('models.quickModel.buttons.creating')}
                </span>
              ) : (
                t('models.quickModel.buttons.create')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
