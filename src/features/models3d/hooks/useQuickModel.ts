import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import toast from "react-hot-toast";
import { supabase, shouldIgnoreAuthEvent } from "@/shared/lib/supabaseClient";
import { createModeloRA } from "@/features/models3d/services/modelos";
import type { ModeloRAInsert, ModeloRA } from "@/shared/types";

type GenerationMode = "billboard" | "ai3d";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UseQuickModelArgs {
  open: boolean;
  leccionId?: number | null;
  onClose: () => void;
  onCreated: (model: ModeloRA) => void;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useQuickModel({ open, leccionId, onClose, onCreated }: UseQuickModelArgs) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [type, setType] = useState("glb");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdModel, setCreatedModel] = useState<ModeloRA | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>("billboard");
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [meshyApiKey, setMeshyApiKey] = useState("");
  const [meshyApiKeyInput, setMeshyApiKeyInput] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Effects ──────────────────────────────────────────────

  /** Load API key & auth state on mount */
  useEffect(() => {
    const savedKey = localStorage.getItem("meshy_api_key");
    if (savedKey) {
      setMeshyApiKey(savedKey);
      setMeshyApiKeyInput(savedKey);
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!((data as any)?.session));
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (shouldIgnoreAuthEvent()) return;

      if (!session) {
        try {
          let stored = localStorage.getItem("sb-auth-token");
          if (!stored) {
            const storageKey = Object.keys(localStorage).find(
              (k) => k.startsWith("sb-") && k.endsWith("-auth-token")
            );
            if (storageKey) stored = localStorage.getItem(storageKey);
          }
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.access_token && parsed?.user) {
              setIsAuthenticated(true);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      setIsAuthenticated(!!session);
    });

    return () => {
      sub?.subscription.unsubscribe();
    };
  }, []);

  /** Reset form when modal closes */
  useEffect(() => {
    if (!open) {
      setName("");
      setType("glb");
      setDescription("");
      setFile(null);
      setUploading(false);
      setProgress(0);
      setCreatedModel(null);
      setImageFile(null);
      setAiProgress(0);
      setAiStatus("");
      setGenerationMode("billboard");
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

  // ── Helpers ──────────────────────────────────────────────

  const downloadFile = useCallback((url: string, filename?: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const imageToBase64 = useCallback(async (img: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(img);
    });
  }, []);

  const saveApiKey = useCallback(() => {
    if (!meshyApiKeyInput.trim()) {
      toast.error(t("models.quickModel.errors.missingApiKey"));
      return;
    }
    setMeshyApiKey(meshyApiKeyInput.trim());
    localStorage.setItem("meshy_api_key", meshyApiKeyInput.trim());
    setShowApiKeyInput(false);
    toast.success(t("models.quickModel.success.apiKeySaved"));
  }, [meshyApiKeyInput, t]);

  // ── Upload & Create ──────────────────────────────────────

  const uploadAndCreate = useCallback(async () => {
    if (!name.trim()) {
      toast.error(t("models.quickModel.errors.requiredName"));
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = (sessionData as any)?.session?.user?.id;
    if (!userId) {
      toast.error(t("models.quickModel.errors.notAuthenticated"));
      return;
    }
    setUploading(true);
    setProgress(10);
    try {
      let archivo_url = "";
      if (file) {
        const allowed = ["glb", "gltf", "usdz"];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !allowed.includes(ext)) {
          toast.error(t("models.quickModel.errors.invalidFileType"));
          return;
        }
        const MAX_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          toast.error(t("models.quickModel.errors.fileTooLarge"));
          return;
        }
        const filename = `${Date.now()}_${file.name}`;
        const bucket = "modelos-ra";
        const path = `quick/${filename}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: false });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        archivo_url = data.publicUrl;
      }

      const modelPayload: ModeloRAInsert = {
        leccion_id: leccionId ?? null,
        nombre_modelo: name.trim(),
        archivo_url: archivo_url || "",
        tipo: type || null,
        descripcion: description || null,
        created_by: userId || null,
      } as any;

      const created = await createModeloRA(modelPayload);
      setCreatedModel(created);
      toast.success(t("models.quickModel.success.modelCreated"));

      if (created?.archivo_url) {
        try {
          downloadFile(created.archivo_url, `${created.nombre_modelo || "modelo"}.glb`);
        } catch {
          // ignore
        }
      }
      onCreated(created);
    } catch (err: any) {
      console.error("Quick model create error", err);
      const msg = (err?.message || "")?.toLowerCase();
      if (
        msg.includes("row-level security") ||
        msg.includes("row level security") ||
        msg.includes("new row violates")
      ) {
        toast.error(t("models.quickModel.errors.rlsError"));
      } else {
        toast.error(err?.message || t("models.quickModel.errors.createError"));
      }
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 300);
    }
  }, [name, file, type, description, leccionId, downloadFile, onCreated, t]);

  // ── Billboard generation ─────────────────────────────────

  const generateGlbFromImage = useCallback(async () => {
    if (!imageFile) {
      toast.error(t("models.quickModel.errors.missingImage"));
      return;
    }
    setIsGenerating(true);
    try {
      const imageUrl = URL.createObjectURL(imageFile);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageUrl;
      });

      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;

      const aspect = img.width / img.height;
      const height = 1;
      const width = aspect * height;

      const geometry = new THREE.PlaneGeometry(width, height);
      const uvAttr = geometry.attributes.uv;
      for (let i = 0; i < uvAttr.count; i++) {
        uvAttr.setY(i, 1 - uvAttr.getY(i));
      }
      uvAttr.needsUpdate = true;

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "billboard";

      const scene = new THREE.Scene();
      scene.add(mesh);

      const exporter = new GLTFExporter();
      const arrayBuffer: ArrayBuffer = await new Promise((resolve, reject) => {
        exporter.parse(
          scene,
          (result: ArrayBuffer | object) => {
            if (result instanceof ArrayBuffer) resolve(result);
            else reject(new Error("Expected binary output but got JSON"));
          },
          (error: Error) => reject(error),
          { binary: true }
        );
      });

      URL.revokeObjectURL(imageUrl);

      const blob = new Blob([arrayBuffer], { type: "model/gltf-binary" });
      const genFilename = `${Date.now()}_from_image.glb`;
      const genFile = new File([blob], genFilename, { type: "model/gltf-binary" });
      setFile(genFile);
      setType("glb");
      toast.success(t("models.quickModel.success.glbGenerated"));
    } catch (err: any) {
      console.error("Error generando GLB desde imagen", err);
      toast.error(err?.message || t("models.quickModel.errors.createError"));
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile, t]);

  // ── Meshy AI generation ──────────────────────────────────

  const generateWithMeshy = useCallback(async () => {
    if (!imageFile) {
      toast.error(t("models.quickModel.errors.missingImage"));
      return;
    }
    if (!meshyApiKey) {
      setShowApiKeyInput(true);
      toast.error(t("models.quickModel.errors.missingApiKey"));
      return;
    }

    setIsGenerating(true);
    setAiProgress(0);
    setAiStatus(t("models.quickModel.ai.preparing"));

    try {
      setAiStatus(t("models.quickModel.ai.processing"));
      const imageBase64 = await imageToBase64(imageFile);

      if (imageBase64.length > 5000000) {
        throw new Error(t("models.quickModel.errors.fileTooLarge"));
      }

      setAiStatus(t("models.quickModel.ai.creatingTask"));
      setAiProgress(10);

      const { data: createData, error: createError } = await supabase.functions.invoke(
        "meshy-create",
        { body: { imageBase64, apiKey: meshyApiKey } }
      );

      if (createError) throw new Error(`Error creando tarea: ${createError.message}`);

      const taskId = createData?.taskId;
      if (!taskId) throw new Error(createData?.error || "No se obtuvo ID de tarea");

      setAiProgress(20);
      setAiStatus(t("models.quickModel.ai.generating"));

      // Poll for completion
      const modelUrl = await new Promise<string>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 120;

        pollingRef.current = setInterval(async () => {
          attempts++;
          if (attempts > maxAttempts) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            reject(new Error(t("models.quickModel.errors.timeout")));
            return;
          }

          try {
            const { data: statusData, error: statusError } =
              await supabase.functions.invoke("meshy-status", {
                body: { taskId, apiKey: meshyApiKey },
              });

            if (statusError) return;

            const status = statusData?.status;
            const progressValue = statusData?.progress || 0;
            setAiProgress(20 + Math.floor(progressValue * 0.7));

            if (status === "SUCCEEDED") {
              if (pollingRef.current) clearInterval(pollingRef.current);
              const url = statusData?.modelUrl;
              if (url) resolve(url);
              else reject(new Error("No se encontró URL del modelo"));
            } else if (status === "FAILED") {
              if (pollingRef.current) clearInterval(pollingRef.current);
              reject(
                new Error(
                  statusData?.error || "La generación falló en el servidor de Meshy"
                )
              );
            } else {
              const statusMessages: Record<string, string> = {
                PENDING: "En cola...",
                IN_PROGRESS: "Generando modelo 3D...",
              };
              setAiStatus(
                statusMessages[status] ||
                  t("models.quickModel.ai.status", { status })
              );
            }
          } catch {
            // ignore poll errors
          }
        }, 5000);
      });

      setAiProgress(95);
      setAiStatus(t("models.quickModel.ai.downloading"));

      const modelResponse = await fetch(modelUrl);
      if (!modelResponse.ok)
        throw new Error(`Error descargando el modelo: ${modelResponse.status}`);

      const modelBlob = await modelResponse.blob();
      if (modelBlob.size < 1000)
        throw new Error("El modelo descargado parece estar vacío o corrupto");

      const genFilename = `${Date.now()}_meshy.glb`;
      const genFile = new File([modelBlob], genFilename, {
        type: "model/gltf-binary",
      });

      setFile(genFile);
      setType("glb");
      setAiProgress(100);
      setAiStatus(t("models.quickModel.ai.completed"));
      toast.success(t("models.quickModel.success.modelAiCreated"));
    } catch (err: any) {
      console.error("Error final:", err);
      toast.error(err?.message || t("models.quickModel.errors.generationFailed"), {
        duration: 8000,
      });
      setAiStatus("");
      setAiProgress(0);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile, meshyApiKey, imageToBase64, t]);

  // ── Mode handler ─────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    if (generationMode === "billboard") {
      generateGlbFromImage();
    } else {
      generateWithMeshy();
    }
  }, [generationMode, generateGlbFromImage, generateWithMeshy]);

  // ── Return ───────────────────────────────────────────────

  return {
    // State
    name, setName,
    type, setType,
    description, setDescription,
    file, setFile,
    imageFile, setImageFile,
    uploading,
    progress,
    createdModel,
    isGenerating,
    isAuthenticated,
    generationMode, setGenerationMode,
    aiProgress,
    aiStatus,
    meshyApiKey,
    meshyApiKeyInput, setMeshyApiKeyInput,
    showApiKeyInput, setShowApiKeyInput,

    // Handlers
    downloadFile,
    uploadAndCreate,
    generateGlbFromImage,
    saveApiKey,
    handleGenerate,
  };
}
