import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { X, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { createModeloRA } from '../lib/data/modelos';
import type { ModeloRAInsert, ModeloRA } from '../types/db';

type GenerationMode = 'billboard' | 'ai3d';

// Meshy.ai API - Using Supabase Edge Functions as proxy
// Direct API calls are blocked by CORS, so we route through our backend

export default function QuickModelModal({ open, onClose, onCreated, leccionId } : { open: boolean; onClose: () => void; onCreated: (model: ModeloRA) => void, leccionId?: number | null }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('glb');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdModel, setCreatedModel] = useState<ModeloRA | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('billboard');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState<string>('');
  const [meshyApiKey, setMeshyApiKey] = useState('');
  const [meshyApiKeyInput, setMeshyApiKeyInput] = useState(''); // Separate state for input field
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('meshy_api_key');
    if (savedKey) {
      setMeshyApiKey(savedKey);
      setMeshyApiKeyInput(savedKey);
    }
    
    // Set initial auth state - only once on mount
    (async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!((data as any)?.session));
    })();
    
    // Subscribe to auth changes - only once on mount
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });
    
    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

  // Reset form state when modal closes
  useEffect(() => {
    if (!open) {
      setName(''); setType('glb'); setDescription(''); setFile(null); setUploading(false); setProgress(0); setCreatedModel(null);
      setImageFile(null); setAiProgress(0); setAiStatus(''); setGenerationMode('billboard');
      // Clear polling interval if any
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open]);

  const downloadFile = (url: string, filename?: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const uploadAndCreate = async () => {
    if (!name.trim()) {
      toast.error('Nombre del modelo requerido');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = (sessionData as any)?.session?.user?.id;
    if (!userId) {
      toast.error('Debes iniciar sesión para crear un modelo');
      return;
    }
    setUploading(true);
    setProgress(10);
    try {
      let archivo_url = '';
      if (file) {
        const allowed = ['glb','gltf','usdz'];
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowed.includes(ext)) {
          toast.error('Tipo de archivo no válido');
          return;
        }
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          toast.error('Archivo demasiado grande (max 50MB)');
          return;
        }
        // reuse xhr uploader from CreateLessonModal for progress
        const filename = `${Date.now()}_${file.name}`;
        const bucket = 'modelos-ra';
        const path = `quick/${filename}`;
        const token = ((await supabase.auth.getSession()).data as any)?.session?.access_token;
        if (!token) throw new Error('No auth token');
        // Prefer using the Supabase SDK which handles authorization and endpoint details
        const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
        if (uploadErr) {
          // On error 400/403/409 we try to surface a helpful message
          console.error('Storage upload error', uploadErr);
          throw uploadErr;
        }
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        archivo_url = data.publicUrl;
      }

      const modelPayload: ModeloRAInsert = {
        leccion_id: leccionId ?? null,
        nombre_modelo: name.trim(),
        archivo_url: archivo_url || '',
        tipo: type || null,
        descripcion: description || null,
        created_by: userId || null,
      } as any;
      let created;
      try {
        console.debug('[QuickModelModal] createModeloRA payload', modelPayload);
        created = await createModeloRA(modelPayload);
        setCreatedModel(created);
        toast.success('Modelo creado');
        // Auto-download the model after successful creation (for quick preview)
        if (created?.archivo_url) {
          try {
            downloadFile(created.archivo_url, `${created.nombre_modelo || 'modelo'}.glb`);
          } catch (err) {
            console.warn('Auto-download failed', err);
          }
        }
        onCreated(created);
      } catch (err: any) {
        console.error('Error creating modelo_ra', err);
        // detect RLS error message and show helpful guidance
        const msg = (err?.message || '')?.toLowerCase();
        if (msg.includes('row-level security') || msg.includes('row level security') || msg.includes('new row violates')) {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = (sessionData as any)?.session?.user?.id;
          console.info('Current user id during failed insert:', userId);
          // Give detailed guidance to the developer/operator
          // Log detailed error info from Supabase (if present)
          const detail = JSON.stringify(err?.details || err, null, 2);
          console.error('RLS insert failure details:', detail);
          toast.error('No se pudo crear el modelo por políticas RLS. Verifica session y políticas en el dashboard.');
        } else {
          toast.error(err?.message || 'Error creando modelo');
        }
        throw err; // rethrow so outer error handler can handle it too
      }
    } catch (err: any) {
      console.error('Quick model create error', err);
      toast.error(err?.message || 'Error creando modelo');
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 300);
    }
  };

  // Generate a simple GLB from a single image by creating a textured plane and exporting with GLTFExporter
  const generateGlbFromImage = async () => {
    if (!imageFile) {
      toast.error('Sube una imagen primero');
      return;
    }
    setIsGenerating(true);
    try {
      // Load image as HTMLImageElement for proper texture handling
      const imageUrl = URL.createObjectURL(imageFile);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      // Create texture from image
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      // Flip Y for correct UV mapping in glTF
      texture.flipY = false;

      // Determine plane size based on aspect ratio
      const aspect = img.width / img.height;
      const height = 1;
      const width = aspect * height;

      // Create geometry with correct UV coordinates for glTF (flip V)
      const geometry = new THREE.PlaneGeometry(width, height);
      // Flip UV coordinates for glTF export
      const uvAttr = geometry.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setY(i, 1 - uvAttr.getY(i));
      }
      uvAttr.needsUpdate = true;

      // Use MeshStandardMaterial for better glTF compatibility
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'billboard';

      const scene = new THREE.Scene();
      scene.add(mesh);

      // Export using GLTFExporter with proper error handling
      const exporter = new GLTFExporter();
      const arrayBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
        exporter.parse(
          scene,
          (result: ArrayBuffer | object) => {
            if (result instanceof ArrayBuffer) {
              resolve(result);
            } else {
              reject(new Error('Expected binary output but got JSON'));
            }
          },
          (error: Error) => {
            reject(error);
          },
          { binary: true }
        );
      });

      // Clean up object URL
      URL.revokeObjectURL(imageUrl);

      const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
      const genFilename = `${Date.now()}_from_image.glb`;
      const genFile = new File([blob], genFilename, { type: 'model/gltf-binary' });
      setFile(genFile);
      setType('glb');
      toast.success('GLB generado correctamente');
    } catch (err: any) {
      console.error('Error generando GLB desde imagen', err);
      toast.error('Error generando el GLB: ' + (err?.message || '')); 
    } finally {
      setIsGenerating(false);
    }
  };

  // Save API key to localStorage
  const saveApiKey = () => {
    if (!meshyApiKeyInput.trim()) {
      toast.error('Ingresa una API Key válida');
      return;
    }
    setMeshyApiKey(meshyApiKeyInput.trim());
    localStorage.setItem('meshy_api_key', meshyApiKeyInput.trim());
    setShowApiKeyInput(false);
    toast.success('API Key guardada');
  };

  // Convert image to base64 data URI
  const imageToBase64 = async (imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  };

  // Generate 3D model using Meshy.ai API via Supabase Edge Functions
  const generateWithMeshy = async () => {
    if (!imageFile) {
      toast.error('Sube una imagen primero');
      return;
    }
    if (!meshyApiKey) {
      setShowApiKeyInput(true);
      toast.error('Necesitas una API Key de Meshy.ai');
      return;
    }

    setIsGenerating(true);
    setAiProgress(0);
    setAiStatus('Preparando imagen...');
    console.log('🚀 Iniciando generación con Meshy.ai via Edge Functions...');

    try {
      // Step 1: Convert image to base64
      setAiStatus('Procesando imagen...');
      console.log('📷 Convirtiendo imagen a base64...');
      const imageBase64 = await imageToBase64(imageFile);
      console.log('✅ Imagen convertida, tamaño base64:', imageBase64.length, 'caracteres');
      
      if (imageBase64.length > 5000000) {
        throw new Error('La imagen es demasiado grande. Usa una imagen menor a 4MB.');
      }
      
      // Step 2: Create task via Edge Function
      setAiStatus('Creando tarea en Meshy.ai...');
      setAiProgress(10);
      console.log('📤 Enviando imagen via Edge Function...');
      
      const { data: createData, error: createError } = await supabase.functions.invoke('meshy-create', {
        body: { imageBase64, apiKey: meshyApiKey },
      });

      if (createError) {
        console.error('❌ Edge Function create error:', createError);
        throw new Error(`Error creando tarea: ${createError.message}`);
      }

      console.log('📥 Create response:', createData);
      const taskId = createData?.taskId;
      
      if (!taskId) {
        console.error('❌ No task ID in response:', createData);
        throw new Error(createData?.error || 'No se obtuvo ID de tarea');
      }

      console.log('🆔 Task ID:', taskId);
      setAiProgress(20);
      setAiStatus('Generando modelo 3D con IA...');

      // Step 3: Poll for task completion
      console.log('⏳ Iniciando polling de estado...');
      const pollTask = async (): Promise<string> => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 120; // 10 minutes max

          pollingRef.current = setInterval(async () => {
            attempts++;
            console.log(`🔄 Poll intento ${attempts}/${maxAttempts}`);
            
            if (attempts > maxAttempts) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              reject(new Error('Tiempo de espera agotado (10 min)'));
              return;
            }

            try {
              const { data: statusData, error: statusError } = await supabase.functions.invoke('meshy-status', {
                body: { taskId, apiKey: meshyApiKey },
              });

              if (statusError) {
                console.error('⚠️ Status check error:', statusError);
                return;
              }

              console.log('📊 Task status:', statusData?.status, 'Progress:', statusData?.progress);
              const status = statusData?.status;
              const progressValue = statusData?.progress || 0;

              setAiProgress(20 + Math.floor(progressValue * 0.7));
              
              if (status === 'SUCCEEDED') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                const modelUrl = statusData?.modelUrl;
                console.log('✅ Model ready! URL:', modelUrl);
                if (modelUrl) {
                  resolve(modelUrl);
                } else {
                  reject(new Error('No se encontró URL del modelo en la respuesta'));
                }
              } else if (status === 'FAILED') {
                if (pollingRef.current) clearInterval(pollingRef.current);
                console.error('❌ Generation failed:', statusData?.error);
                reject(new Error(statusData?.error || 'La generación falló en el servidor de Meshy'));
              } else {
                const statusMessages: Record<string, string> = {
                  'PENDING': 'En cola...',
                  'IN_PROGRESS': 'Generando modelo 3D...',
                };
                setAiStatus(statusMessages[status] || `Estado: ${status}`);
              }
            } catch (pollError: any) {
              console.error('⚠️ Poll error:', pollError.message);
            }
          }, 5000);
        });
      };

      const modelUrl = await pollTask();
      
      setAiProgress(95);
      setAiStatus('Descargando modelo...');
      console.log('📥 Descargando modelo desde:', modelUrl);

      // Step 4: Download the GLB model
      const modelResponse = await fetch(modelUrl);
      
      if (!modelResponse.ok) {
        throw new Error(`Error descargando el modelo: ${modelResponse.status}`);
      }

      const modelBlob = await modelResponse.blob();
      console.log('📦 Modelo descargado, tamaño:', modelBlob.size, 'bytes');
      
      if (modelBlob.size < 1000) {
        throw new Error('El modelo descargado parece estar vacío o corrupto');
      }
      
      const genFilename = `${Date.now()}_meshy.glb`;
      const genFile = new File([modelBlob], genFilename, { type: 'model/gltf-binary' });
      
      setFile(genFile);
      setType('glb');
      setAiProgress(100);
      setAiStatus('¡Completado!');
      console.log('🎉 ¡Modelo generado exitosamente!');
      toast.success('¡Modelo 3D generado con IA exitosamente!');

    } catch (err: any) {
      console.error('❌ Error final:', err);
      const errorMsg = err?.message || 'Falló la generación 3D';
      toast.error(errorMsg, { duration: 8000 });
      setAiStatus('');
      setAiProgress(0);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle generation based on selected mode
  const handleGenerate = () => {
    if (generationMode === 'billboard') {
      generateGlbFromImage();
    } else {
      generateWithMeshy();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div ref={modalRef} className="relative mx-4 w-full max-w-lg rounded-lg p-4 sm:p-6 bg-white shadow-lg overflow-y-auto max-h-[90vh]">
        <button aria-label="Close" onClick={onClose} className="absolute top-3 right-3 p-2 rounded hover:bg-gray-100 z-10"><X size={18} /></button>
        <h3 className="text-lg font-semibold mb-3">Crear Modelo RA rápido</h3>
          <div className="space-y-3">
            {leccionId && (
              <div className="mb-2 text-sm text-gray-700">Adjuntar a la lección actual: <strong>#{leccionId}</strong></div>
            )}
          <div>
            <label className="block mb-1">Nombre</label>
            <input className="w-full border px-3 py-2 rounded" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block mb-1">Tipo</label>
              <input className="w-full border px-3 py-2 rounded" value={type} onChange={(e) => setType(e.target.value)} />
            </div>
            <div>
              <label className="block mb-1">Archivo (opcional)</label>
              <input type="file" accept=".glb,.gltf,.usdz" className="w-full" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>

          {/* Image to 3D Generation Section */}
          <div className="mt-3 p-3 border rounded-lg bg-gray-50">
            <label className="block mb-2 font-medium">Generar desde imagen</label>
            
            {/* Mode selector */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setGenerationMode('billboard')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  generationMode === 'billboard' 
                    ? 'bg-blue-100 border-blue-500 text-blue-700' 
                    : 'bg-white border-gray-300 hover:bg-gray-100'
                }`}
              >
                <ImageIcon size={16} />
                <span className="text-sm">Billboard (rápido)</span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('ai3d')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded border transition-colors ${
                  generationMode === 'ai3d' 
                    ? 'bg-purple-100 border-purple-500 text-purple-700' 
                    : 'bg-white border-gray-300 hover:bg-gray-100'
                }`}
              >
                <Sparkles size={16} />
                <span className="text-sm">3D con IA</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              {generationMode === 'billboard' 
                ? '⚡ Crea un plano texturizado con tu imagen (instantáneo)'
                : '✨ Genera un modelo 3D real usando Meshy.ai (1-3 minutos)'}
            </p>

            {/* API Key section for AI mode */}
            {generationMode === 'ai3d' && (
              <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                {showApiKeyInput || !meshyApiKey ? (
                  <div className="space-y-2">
                    <label className="block text-xs text-purple-700">
                      API Key de Meshy.ai (<a href="https://www.meshy.ai/api" target="_blank" rel="noreferrer" className="underline">obtener aquí</a>)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="flex-1 border px-2 py-1 rounded text-sm"
                        placeholder="msy_..."
                        value={meshyApiKeyInput}
                        onChange={(e) => setMeshyApiKeyInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
                        onClick={saveApiKey}
                        disabled={!meshyApiKeyInput.trim()}
                      >
                        Guardar
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Pega tu API Key y presiona "Guardar" para confirmar</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-700">✓ API Key configurada</span>
                    <button
                      type="button"
                      className="text-xs text-purple-600 underline"
                      onClick={() => {
                        setMeshyApiKeyInput(meshyApiKey);
                        setShowApiKeyInput(true);
                      }}
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              className="w-full mb-2" 
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} 
            />
            
            <div className="flex gap-2">
              <button 
                type="button" 
                className={`flex-1 px-3 py-2 rounded text-white flex items-center justify-center gap-2 disabled:opacity-50 ${
                  generationMode === 'ai3d' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-indigo-500 hover:bg-indigo-600'
                }`}
                onClick={handleGenerate} 
                disabled={!imageFile || isGenerating || (generationMode === 'ai3d' && !meshyApiKey)}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {generationMode === 'ai3d' ? `${aiProgress}%` : 'Procesando...'}
                  </>
                ) : (
                  <>
                    {generationMode === 'ai3d' ? <Sparkles size={16} /> : <ImageIcon size={16} />}
                    {generationMode === 'ai3d' ? 'Generar Modelo 3D' : 'Generar Billboard'}
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300" 
                onClick={() => { setImageFile(null); }}
                disabled={isGenerating}
              >
                Limpiar
              </button>
            </div>

            {/* Progress bar for AI generation */}
            {isGenerating && generationMode === 'ai3d' && (
              <div className="mt-3">
                <div className="h-2 rounded overflow-hidden bg-gray-200">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-500" 
                    style={{ width: `${aiProgress}%` }} 
                  />
                </div>
                <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" />
                  {aiStatus || 'Procesando...'}
                </p>
              </div>
            )}

            {imageFile && (
              <div className="mt-2 text-sm text-gray-700">📷 {imageFile.name}</div>
            )}
            {file && (
              <div className="mt-2 text-sm text-green-700 font-medium">
                ✓ GLB listo: {file.name}
              </div>
            )}
          </div>

          <div>
            <label className="block mb-1">Descripción</label>
            <textarea className="w-full border px-3 py-2 rounded" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {uploading && (
            <div className="mt-2 h-2 rounded overflow-hidden bg-gray-200">
              <div className="h-full bg-green-600" style={{ width: `${progress}%` }} />
            </div>
          )}

          {createdModel && (
            <div className="border rounded p-2 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Modelo creado</div>
                <div className="flex items-center gap-2">
                    {createdModel.archivo_url && (
                    <button className="text-sm text-blue-600 underline" onClick={() => downloadFile(createdModel.archivo_url, `${createdModel.nombre_modelo}.glb`)}>
                      Descargar
                    </button>
                  )}
                    {isAuthenticated ? null : (
                      <div className="text-xs text-yellow-700 ml-2">Inicia sesión para gestionar / asociar el modelo</div>
                    )}
                </div>
              </div>
            </div>
          )}

            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-2 rounded bg-gray-200" onClick={onClose}>Cancelar</button>
              <button className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50" onClick={uploadAndCreate} disabled={uploading || !name.trim() || !isAuthenticated}>{uploading ? 'Creando...' : 'Crear modelo'}</button>
            </div>
        </div>
      </div>
    </div>
  );
}
