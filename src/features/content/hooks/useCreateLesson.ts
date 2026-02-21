import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { supabase } from "@/shared/lib/supabaseClient";
import { getProfile } from "@/shared/services/profiles";
import { createLeccion, updateLeccion } from "@/features/lessons/services/lecciones";
import { createModeloRA, updateModeloRA, listModelosByLeccion } from "@/features/models3d/services/modelos";
import { listPruebasByLeccion, deletePrueba } from "@/features/pruebas/services/pruebas";
import {
  uploadFileWithProgress,
  validateModelFile,
  triggerDownload,
} from "@/shared/helpers/uploadHelpers";
import type { Leccion, LeccionInsert, ModeloRA, Prueba, ContentSlide, MediaFile } from "@/shared/types";

// ─────────────────────────────────────────────────────────────
// Tipos internos del hook
// ─────────────────────────────────────────────────────────────

interface UseCreateLessonArgs {
  open: boolean;
  leccion?: Leccion | null;
  onClose: () => void;
  onCreated: (newId: number) => void;
  onUpdated?: (id: number) => void;
}

// ─────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────

export function useCreateLesson({
  open,
  leccion,
  onClose,
  onCreated,
  onUpdated,
}: UseCreateLessonArgs) {
  const { t } = useTranslation();

  // ── Form fields ──────────────────────────────────────────
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nivel, setNivel] = useState("");
  const [thumbnail_url, setThumbnailUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Model upload ─────────────────────────────────────────
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelType, setModelType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [showQuickModelModal, setShowQuickModelModal] = useState(false);
  const [pendingQuickModel, setPendingQuickModel] = useState<ModeloRA | null>(null);

  // ── Pruebas ──────────────────────────────────────────────
  const [pruebas, setPruebas] = useState<Prueba[]>([]);
  const [loadingPruebas, setLoadingPruebas] = useState(false);
  const [editingPruebaId, setEditingPruebaId] = useState<number | null>(null);

  // ── User session ─────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // ── Slides & media ───────────────────────────────────────
  const [slides, setSlides] = useState<ContentSlide[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "slides" | "media" | "model" | "pruebas">("info");
  const [availableModelos, setAvailableModelos] = useState<ModeloRA[]>([]);

  // ── Effects ──────────────────────────────────────────────

  /** Cargar userId al montar */
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = (sessionData as any)?.session?.user?.id;
      setUserId(uid || null);
      try {
        if (uid) {
          const { data: profile } = await getProfile(uid);
          setUserRole(profile?.role || (sessionData as any)?.session?.user?.user_metadata?.role || null);
        }
      } catch {
        setUserRole((sessionData as any)?.session?.user?.user_metadata?.role || null);
      }
    })();
  }, []);

  /** Cargar pruebas al abrir con lección existente */
  useEffect(() => {
    if (open && leccion?.id) {
      setLoadingPruebas(true);
      listPruebasByLeccion(leccion.id)
        .then(setPruebas)
        .catch((err: any) => {
          console.error("Error loading pruebas:", err);
          toast.error(err?.message || "Error al cargar pruebas");
        })
        .finally(() => setLoadingPruebas(false));
    } else {
      setPruebas([]);
    }
  }, [open, leccion]);

  /** Reset / prefill al abrir/cerrar */
  useEffect(() => {
    if (!open) {
      setUploadedModelUrl(null);
      setUploadProgress(0);
      setUploading(false);
      setPendingQuickModel(null);
      setTitulo("");
      setDescripcion("");
      setNivel("");
      setThumbnailUrl("");
      setPruebas([]);
      setEditingPruebaId(null);
      setSlides([]);
      setMediaFiles([]);
      setActiveTab("info");
      setAvailableModelos([]);
      return;
    }
    if (leccion) {
      setTitulo(leccion.titulo || "");
      setDescripcion(leccion.descripcion || "");
      setNivel(leccion.nivel || "");
      setThumbnailUrl(leccion.thumbnail_url || "");
      setSlides(Array.isArray(leccion.slides) ? leccion.slides : []);
      setMediaFiles(Array.isArray(leccion.media_files) ? leccion.media_files : []);
      if (leccion.id) {
        listModelosByLeccion(leccion.id)
          .then(setAvailableModelos)
          .catch(() => {});
      }
    }
  }, [open, leccion]);

  // ── Handlers ─────────────────────────────────────────────

  /** Lógica principal de upload de modelo 3D */
  const uploadModel = useCallback(
    async (targetLeccionId: number) => {
      if (!modelFile) return;
      const validationError = validateModelFile(modelFile);
      if (validationError === "invalidFileType") {
        toast.error(t("createLesson.errors.invalidFileType"));
        return;
      }
      if (validationError === "fileTooLarge") {
        toast.error(t("createLesson.errors.fileTooLarge"));
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      const filename = `${Date.now()}_${modelFile.name}`;
      const path = `lecciones/${targetLeccionId}/${filename}`;

      try {
        const archivo_url = await uploadFileWithProgress(
          modelFile,
          "modelos-ra",
          path,
          setUploadProgress
        );

        const { data: sessionData } = await supabase.auth.getSession();
        const uid = (sessionData as any)?.session?.user?.id;

        await createModeloRA({
          leccion_id: targetLeccionId,
          nombre_modelo: modelName || modelFile.name,
          archivo_url,
          tipo: modelType || null,
          descripcion: null,
          created_by: uid || null,
        } as any);

        toast.success(t("createLesson.success.modelUploadedAndLinked"));
        setUploadProgress(100);
        setUploadedModelUrl(archivo_url);
        triggerDownload(archivo_url, modelName || `modelo_${Date.now()}.glb`);

        setModelFile(null);
        setModelName("");
        setModelType("");
      } catch (err: any) {
        console.error("upload exception", err);
        toast.error(err?.message || t("createLesson.errors.uploadError"));
      } finally {
        setUploading(false);
        setTimeout(() => setUploadProgress(0), 400);
      }
    },
    [modelFile, modelName, modelType, t]
  );

  /** Submit del formulario (crear/actualizar lección) */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!titulo.trim()) {
        toast.error(t("createLesson.errors.titleRequired"));
        return;
      }
      setIsLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = (sessionData as any)?.session?.user?.id;
        const payload: LeccionInsert = {
          titulo: titulo.trim(),
          descripcion: descripcion || null,
          nivel: nivel || null,
          thumbnail_url: thumbnail_url || null,
          created_by: uid || null,
          slides: slides.length > 0 ? slides : null,
          media_files: mediaFiles.length > 0 ? mediaFiles : null,
        };

        let targetLeccionId: number | undefined;
        if (leccion?.id) {
          const updated = await updateLeccion(leccion.id, payload as any);
          targetLeccionId = updated.id;
          toast.success(t("createLesson.success.updated") || t("createLesson.success.created"));
          onUpdated?.(updated.id);
        } else {
          const created = await createLeccion(payload);
          targetLeccionId = created.id;
          toast.success(t("createLesson.success.created"));
          onCreated(created.id);
        }

        // Vincular modelo rápido pendiente
        if (pendingQuickModel && targetLeccionId) {
          try {
            if (!uid) {
              toast.error(t("createLesson.errors.notAuthenticatedToLinkModel"));
            } else {
              await updateModeloRA(pendingQuickModel.id ?? pendingQuickModel, {
                leccion_id: targetLeccionId,
              });
            }
          } catch (err: any) {
            console.warn("Error linking quick model", err);
            toast.error(t("createLesson.errors.linkModelError", { message: err?.message || "" }));
          }
          setPendingQuickModel(null);
        }

        // Subir modelo 3D si hay archivo seleccionado
        if (modelFile && targetLeccionId) {
          await uploadModel(targetLeccionId);
        }

        // Recargar pruebas
        if (targetLeccionId) {
          listPruebasByLeccion(targetLeccionId)
            .then(setPruebas)
            .catch(() => {});
        }

        // Limpiar y cerrar
        setTitulo("");
        setDescripcion("");
        setNivel("");
        setThumbnailUrl("");
        onClose();
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || t("createLesson.errors.createError"));
      } finally {
        setIsLoading(false);
      }
    },
    [
      titulo, descripcion, nivel, thumbnail_url,
      slides, mediaFiles, leccion, modelFile,
      pendingQuickModel, uploadModel,
      onClose, onCreated, onUpdated, t,
    ]
  );

  // ── Prueba handlers ──────────────────────────────────────

  const handleCreatePrueba = useCallback(() => {
    if (!leccion?.id) {
      toast.error(t("teacher.pruebas.saveLessonFirst") || "Debes guardar la lección primero");
      return;
    }
    setEditingPruebaId(0);
  }, [leccion, t]);

  const handleEditPrueba = useCallback((pruebaId: number) => {
    setEditingPruebaId(pruebaId);
  }, []);

  const handleDeletePrueba = useCallback(
    async (pruebaId: number) => {
      if (!confirm(t("teacher.pruebas.confirmDelete") || "¿Estás seguro de eliminar esta prueba?")) return;
      try {
        await deletePrueba(pruebaId);
        toast.success(t("teacher.pruebas.deleted") || "Prueba eliminada");
        if (leccion?.id) {
          const data = await listPruebasByLeccion(leccion.id);
          setPruebas(data);
        }
      } catch (err: any) {
        console.error("Error deleting prueba:", err);
        toast.error(err?.message || "Error al eliminar prueba");
      }
    },
    [leccion, t]
  );

  const handlePruebaUpdated = useCallback(async () => {
    if (leccion?.id) {
      listPruebasByLeccion(leccion.id)
        .then(setPruebas)
        .catch(() => {});
    }
    setEditingPruebaId(null);
  }, [leccion]);

  const handlePruebaModalClose = useCallback(() => {
    setEditingPruebaId(null);
  }, []);

  const handleQuickModelCreated = useCallback((model: ModeloRA) => {
    setPendingQuickModel(model);
    setUploadedModelUrl(model.archivo_url);
    setShowQuickModelModal(false);
  }, []);

  // ── Return ───────────────────────────────────────────────

  return {
    // Form fields
    titulo, setTitulo,
    descripcion, setDescripcion,
    nivel, setNivel,
    thumbnail_url, setThumbnailUrl,
    isLoading,

    // Model upload
    modelFile, setModelFile,
    modelName, setModelName,
    modelType, setModelType,
    uploading, uploadProgress,
    uploadedModelUrl, setUploadedModelUrl,
    showQuickModelModal, setShowQuickModelModal,
    pendingQuickModel, setPendingQuickModel,

    // Pruebas
    pruebas, loadingPruebas,
    editingPruebaId,

    // User
    userId, userRole,

    // Slides & media
    slides, setSlides,
    mediaFiles, setMediaFiles,
    activeTab, setActiveTab,
    availableModelos,

    // Handlers
    handleSubmit,
    handleCreatePrueba,
    handleEditPrueba,
    handleDeletePrueba,
    handlePruebaUpdated,
    handlePruebaModalClose,
    handleQuickModelCreated,
  };
}
