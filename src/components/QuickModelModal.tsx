import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { X, Sparkles, Image as ImageIcon, Loader2, Upload, FileUp, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, shouldIgnoreAuthEvent } from '../lib/supabaseClient';
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
    // DEFENSIVE: Ignore events when page is not visible to prevent session loss when changing windows
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ignore ALL events when page is hidden or recently became visible
      if (shouldIgnoreAuthEvent()) {
        console.debug('[QuickModelModal] Ignoring auth event - page not ready for auth events');
        return;
      }

      // SUPER DEFENSIVE: Before reacting to null session, check if there's still a valid token in localStorage
      // If there is, the user didn't actually sign out - Supabase just failed to refresh
      if (!session) {
        try {
          // First try the consistent key we use
          let stored = localStorage.getItem('sb-auth-token');
          // Fallback to legacy pattern if not found
          if (!stored) {
            const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
            if (storageKey) {
              stored = localStorage.getItem(storageKey);
            }
          }
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.access_token && parsed?.user) {
              console.warn('[QuickModelModal] Ignoring null session - valid token still in localStorage');
              setIsAuthenticated(true);
              return; // Keep authenticated state
            }
          }
        } catch (e) {
          // ignore localStorage errors
        }
      }

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef} 
        className="relative mx-4 w-full max-w-lg rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={22} />
            Crear Modelo RA
          </h3>
          <p className="text-purple-100 text-sm mt-1">Genera modelos 3D rápidamente</p>
          <button 
            aria-label="Cerrar" 
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
                📚 Se adjuntará a la lección <strong>#{leccionId}</strong>
              </span>
            </div>
          )}

          {/* Nombre del modelo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del modelo <span className="text-red-500">*</span>
            </label>
            <input 
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej: Molécula de agua"
            />
          </div>

          {/* Tipo y Archivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="glb">GLB</option>
                <option value="gltf">GLTF</option>
                <option value="usdz">USDZ</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo (opcional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf,.usdz"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all text-sm text-gray-600"
              >
                <FileUp size={16} />
                {file ? 'Cambiar' : 'Subir'}
              </button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
              <span className="text-sm text-green-700">✓ {file.name}</span>
              <button 
                type="button" 
                onClick={() => setFile(null)}
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
              Generar desde imagen
            </label>
            
            {/* Selector de modo */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setGenerationMode('billboard')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                  generationMode === 'billboard' 
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <ImageIcon size={16} />
                <span className="text-sm font-medium">Billboard</span>
              </button>
              <button
                type="button"
                onClick={() => setGenerationMode('ai3d')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 transition-all ${
                  generationMode === 'ai3d' 
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Sparkles size={16} />
                <span className="text-sm font-medium">3D con IA</span>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3 px-1">
              {generationMode === 'billboard' 
                ? '⚡ Crea un plano texturizado con tu imagen (instantáneo)'
                : '✨ Genera un modelo 3D real usando Meshy.ai (1-3 minutos)'}
            </p>

            {/* API Key para modo IA */}
            {generationMode === 'ai3d' && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                {showApiKeyInput || !meshyApiKey ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-purple-700">
                      API Key de Meshy.ai (
                      <a href="https://www.meshy.ai/api" target="_blank" rel="noreferrer" className="underline hover:text-purple-900">
                        obtener aquí
                      </a>
                      )
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="flex-1 border border-purple-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        placeholder="msy_..."
                        value={meshyApiKeyInput}
                        onChange={(e) => setMeshyApiKeyInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                        onClick={saveApiKey}
                        disabled={!meshyApiKeyInput.trim()}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-purple-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      API Key configurada
                    </span>
                    <button
                      type="button"
                      className="text-sm text-purple-600 hover:text-purple-800 underline"
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

            {/* Selector de imagen estilizado */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group mb-3"
            >
              <Upload size={20} className="text-gray-400 group-hover:text-purple-500" />
              <span className="text-gray-600 group-hover:text-purple-600">
                {imageFile ? imageFile.name : "Seleccionar imagen"}
              </span>
            </button>

            {imageFile && (
              <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 mb-3">
                <span className="text-sm text-blue-700">📷 {imageFile.name}</span>
                <button 
                  type="button" 
                  onClick={() => setImageFile(null)}
                  className="text-blue-600 hover:text-blue-800"
                  disabled={isGenerating}
                >
                  <X size={16} />
                </button>
              </div>
            )}
            
            {/* Botón de generación */}
            <button 
              type="button" 
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                generationMode === 'ai3d' 
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
              }`}
              onClick={handleGenerate} 
              disabled={!imageFile || isGenerating || (generationMode === 'ai3d' && !meshyApiKey)}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {generationMode === 'ai3d' ? `Generando... ${aiProgress}%` : 'Procesando...'}
                </>
              ) : (
                <>
                  {generationMode === 'ai3d' ? <Sparkles size={18} /> : <ImageIcon size={18} />}
                  {generationMode === 'ai3d' ? 'Generar Modelo 3D' : 'Generar Billboard'}
                </>
              )}
            </button>

            {/* Barra de progreso para IA */}
            {isGenerating && generationMode === 'ai3d' && (
              <div className="mt-3">
                <div className="h-2.5 rounded-full overflow-hidden bg-gray-200">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                    style={{ width: `${aiProgress}%` }} 
                  />
                </div>
                <p className="text-xs text-purple-600 mt-2 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" />
                  {aiStatus || 'Procesando...'}
                </p>
              </div>
            )}

            {/* Archivo GLB generado */}
            {file && !uploading && (
              <div className="mt-3 flex items-center justify-between bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <span className="text-sm text-green-700 font-medium">✓ GLB listo: {file.name}</span>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea 
              className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={2}
              placeholder="Descripción opcional del modelo..."
            />
          </div>

          {/* Barra de progreso de subida */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-2.5 rounded-full overflow-hidden bg-gray-200">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="text-xs text-gray-500 text-center">{progress}% completado</p>
            </div>
          )}

          {/* Modelo creado */}
          {createdModel && (
            <div className="border rounded-xl p-4 bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-700">✓ Modelo creado exitosamente</span>
                <div className="flex items-center gap-2">
                  {createdModel.archivo_url && (
                    <button 
                      className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800 font-medium" 
                      onClick={() => downloadFile(createdModel.archivo_url, `${createdModel.nombre_modelo}.glb`)}
                    >
                      <Download size={14} />
                      Descargar
                    </button>
                  )}
                </div>
              </div>
              {!isAuthenticated && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Inicia sesión para gestionar el modelo
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
              Cancelar
            </button>
            <button 
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={uploadAndCreate} 
              disabled={uploading || !name.trim() || !isAuthenticated}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creando...
                </span>
              ) : (
                "Crear Modelo"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
