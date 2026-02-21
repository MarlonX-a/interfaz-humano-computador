import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { updateContenido, getContenido, updateContenidoLecciones } from "@/features/content/services/contenidos";
import { supabase } from "@/shared/lib/supabaseClient";
import { listLecciones } from "@/features/lessons/services/lecciones";
import { listModelosByLeccion } from "@/features/models3d/services/modelos";
import type {
  ContenidoConLecciones,
  ContenidoUpdate,
  Leccion,
  ContentSlide,
  ModeloRA,
  MediaFile,
} from "@/shared/types";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

type Difficulty = "fácil" | "media" | "difícil";

interface UseEditContenidoArgs {
  open: boolean;
  contenidoId: number | null;
  userId: string;
  onClose: () => void;
  onUpdated: () => void;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useEditContenido({
  open,
  contenidoId,
  userId,
  onClose,
  onUpdated,
}: UseEditContenidoArgs) {
  const { t } = useTranslation();

  // ── Core state ───────────────────────────────────────────
  const [contenido, setContenido] = useState<ContenidoConLecciones | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [editingLeccion, setEditingLeccion] = useState<Leccion | null>(null);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [pendingLecciones, setPendingLecciones] = useState<number[]>([]);

  // ── Form fields ──────────────────────────────────────────
  const [titulo, setTitulo] = useState("");
  const [texto_html, setTextoHtml] = useState("");
  const [type, setType] = useState("molecule");
  const [author, setAuthor] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("fácil");
  const [tags, setTags] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [selectedLeccionIds, setSelectedLeccionIds] = useState<number[]>([]);
  const [orden, setOrden] = useState<number | null>(null);

  // ── Slides & media ───────────────────────────────────────
  const [slides, setSlides] = useState<ContentSlide[]>([]);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [availableModelos, setAvailableModelos] = useState<ModeloRA[]>([]);
  const [activeTab, setActiveTab] = useState<"content" | "slides" | "media">("content");

  // ── Tag input ────────────────────────────────────────────
  const [tagInput, setTagInput] = useState("");
  const [showTagsSuggestions, setShowTagsSuggestions] = useState(false);
  const [tagActiveIndex, setTagActiveIndex] = useState(-1);

  // ── Author suggestions ───────────────────────────────────
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([]);
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const [authorActiveIndex, setAuthorActiveIndex] = useState(-1);
  const [filteredAuthorSuggestions, setFilteredAuthorSuggestions] = useState<string[]>([]);

  // ── Derived / memos ──────────────────────────────────────

  const defaultTags = [
    "reacción",
    "agua",
    "orgánica",
    "inorgánica",
    "síntesis",
    "experimental",
    "ácido",
    "base",
  ];

  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.toLowerCase();
    return defaultTags.filter((s) => s.toLowerCase().includes(q) && !tags.includes(s));
  }, [tagInput, tags]);

  const typeOptions = useMemo(
    () => [
      { value: "molecule", label: t("addcontent.form.typeOptions.molecule") },
      { value: "atom", label: t("addcontent.form.typeOptions.atom") },
      { value: "experiment", label: t("addcontent.form.typeOptions.experiment") },
      { value: "chemical-reaction", label: t("addcontent.form.typeOptions.chemicalReactions") },
      { value: "periodic-table", label: t("addcontent.form.typeOptions.periodicTable") },
      { value: "article", label: t("addcontent.form.typeOptions.article") },
      {
        value: "slide",
        label: t("addcontent.form.typeOptions.slide", { defaultValue: "Presentación/Slides" }),
      },
      {
        value: "document",
        label: t("addcontent.form.typeOptions.document", { defaultValue: "Documento" }),
      },
      {
        value: "video",
        label: t("addcontent.form.typeOptions.video", { defaultValue: "Video" }),
      },
    ],
    [t]
  );

  // ── Effects ──────────────────────────────────────────────

  /** Load contenido when modal opens */
  useEffect(() => {
    if (open && contenidoId) {
      loadContenido();
      loadLecciones();
    }
  }, [open, contenidoId]);

  /** Load author suggestions */
  useEffect(() => {
    const loadAuthors = async () => {
      try {
        const { data } = await supabase
          .from("contenido")
          .select("author")
          .not("author", "is", null);
        if (data) {
          const authors = Array.from(
            new Set(data.map((c: any) => c.author).filter(Boolean))
          );
          setAuthorSuggestions(authors as string[]);
        }
      } catch {
        // ignore
      }
    };
    if (open) loadAuthors();
  }, [open]);

  /** Load available 3D models when selected lessons change */
  useEffect(() => {
    const loadModelos = async () => {
      if (selectedLeccionIds.length === 0) {
        setAvailableModelos([]);
        return;
      }
      try {
        const modelos = await listModelosByLeccion(selectedLeccionIds[0]);
        setAvailableModelos(modelos);
      } catch {
        setAvailableModelos([]);
      }
    };
    loadModelos();
  }, [selectedLeccionIds]);

  /** Reset form when modal closes */
  useEffect(() => {
    if (!open) {
      setTitulo("");
      setTextoHtml("");
      setType("molecule");
      setAuthor("");
      setDifficulty("fácil");
      setTags([]);
      setResources([""]);
      setSelectedLeccionIds([]);
      setOrden(null);
      setTagInput("");
      setContenido(null);
    }
  }, [open]);

  // ── Loaders ──────────────────────────────────────────────

  const loadContenido = useCallback(async () => {
    if (!contenidoId) return;
    setLoading(true);
    try {
      const data = await getContenido(contenidoId);
      setContenido(data);
      setTitulo(data.titulo || "");
      setTextoHtml(data.texto_html || "");
      setType(data.type || "molecule");
      setAuthor(data.author || "");
      setDifficulty((data.difficulty as Difficulty) || "fácil");
      setTags(Array.isArray(data.tags) ? data.tags : []);
      setResources(Array.isArray(data.resources) ? data.resources : [""]);
      setSelectedLeccionIds(data.lecciones?.map((l) => l.id) || []);
      setOrden(data.orden);
      setSlides(Array.isArray(data.slides) ? data.slides : []);

      if (Array.isArray(data.media_files) && data.media_files.length > 0) {
        setMediaFiles(data.media_files);
      } else if (data.media_url && data.media_type) {
        setMediaFiles([{ url: data.media_url, type: data.media_type, name: "Archivo" }]);
      } else {
        setMediaFiles([]);
      }

      if (data.slides && data.slides.length > 0) {
        setActiveTab("slides");
      } else if ((data.media_files && data.media_files.length > 0) || data.media_url) {
        setActiveTab("media");
      } else {
        setActiveTab("content");
      }
    } catch (error: any) {
      console.error("Error loading contenido:", error);
      toast.error(
        error?.message || t("teacher.contents.loadError") || "Error al cargar contenido"
      );
    } finally {
      setLoading(false);
    }
  }, [contenidoId, t]);

  const loadLecciones = useCallback(async () => {
    try {
      const data = await listLecciones();
      const teacherLecciones = data.filter((l) => l.created_by === userId);
      setLecciones(teacherLecciones);
    } catch (error: any) {
      console.error("Error loading lecciones:", error);
    }
  }, [userId]);

  // ── Handlers ─────────────────────────────────────────────

  const handleLessonCreated = useCallback(
    (newId: number) => {
      setPendingLecciones((prev) => [...prev, newId]);
      loadLecciones();
      if (!selectedLeccionIds.includes(newId)) {
        setSelectedLeccionIds((prev) => [...prev, newId]);
      }
      toast.success(
        t("createLesson.success.createdAndAssigned") || "Lección creada y asignada"
      );
    },
    [selectedLeccionIds, loadLecciones, t]
  );

  const toggleLeccion = useCallback((leccionId: number) => {
    setSelectedLeccionIds((prev) =>
      prev.includes(leccionId)
        ? prev.filter((id) => id !== leccionId)
        : [...prev, leccionId]
    );
  }, []);

  const removeLeccion = useCallback((leccionId: number) => {
    setSelectedLeccionIds((prev) => prev.filter((id) => id !== leccionId));
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!titulo.trim() || titulo.trim().length < 3) {
        toast.error(
          t("addcontent.validation.titleRequired") || "El título es requerido"
        );
        return;
      }
      if (selectedLeccionIds.length === 0) {
        toast.error(
          t("addcontent.validation.selectLessonRequired") ||
            "Selecciona al menos una lección"
        );
        return;
      }
      if (!contenidoId) return;

      setSaving(true);
      try {
        const payload: ContenidoUpdate = {
          titulo: titulo.trim(),
          texto_html: texto_html || null,
          type: type || null,
          author: author || null,
          difficulty: difficulty || null,
          tags: tags.length > 0 ? tags : null,
          resources:
            resources.filter((r) => r.trim()).length > 0
              ? resources.filter((r) => r.trim())
              : null,
          orden,
          slides: slides.length > 0 ? slides : null,
          media_files: mediaFiles.length > 0 ? mediaFiles : null,
          media_url: mediaFiles.length > 0 ? mediaFiles[0].url : null,
          media_type: mediaFiles.length > 0 ? mediaFiles[0].type : null,
        };

        await updateContenido(contenidoId, payload);
        await updateContenidoLecciones(contenidoId, selectedLeccionIds);

        toast.success(
          t("addcontent.toast.updateSuccess") || "Contenido actualizado correctamente"
        );
        onUpdated();
        onClose();
      } catch (error: any) {
        console.error("Error saving contenido:", error);
        toast.error(
          error?.message ||
            t("addcontent.toast.updateError") ||
            "Error al actualizar contenido"
        );
      } finally {
        setSaving(false);
      }
    },
    [
      titulo,
      texto_html,
      type,
      author,
      difficulty,
      tags,
      resources,
      selectedLeccionIds,
      orden,
      slides,
      mediaFiles,
      contenidoId,
      onUpdated,
      onClose,
      t,
    ]
  );

  // ── Tag helpers ──────────────────────────────────────────

  const addTag = useCallback(
    (tag: string) => {
      const v = tag.trim();
      if (!v || tags.includes(v)) return;
      setTags((prev) => [...prev, v]);
      setTagInput("");
    },
    [tags]
  );

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleTagInputChange = useCallback(
    (val: string) => {
      setTagInput(val);
      const q = val.trim().toLowerCase();
      if (!q) {
        setShowTagsSuggestions(false);
        setTagActiveIndex(-1);
        return;
      }
      setShowTagsSuggestions(filteredTagSuggestions.length > 0);
      setTagActiveIndex(0);
    },
    [filteredTagSuggestions]
  );

  const insertTagSuggestion = useCallback(
    (tag: string) => {
      addTag(tag);
      setShowTagsSuggestions(false);
      setTagActiveIndex(-1);
    },
    [addTag]
  );

  // ── Resource helpers ─────────────────────────────────────

  const addResource = useCallback(() => {
    setResources((prev) => [...prev, ""]);
  }, []);

  const removeResource = useCallback((idx: number) => {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const setResource = useCallback((idx: number, val: string) => {
    setResources((prev) => prev.map((r, i) => (i === idx ? val : r)));
  }, []);

  // ── Author helpers ───────────────────────────────────────

  const handleAuthorChange = useCallback(
    (val: string) => {
      setAuthor(val);
      const q = val.trim().toLowerCase();
      if (!q) {
        setFilteredAuthorSuggestions([]);
        setShowAuthorSuggestions(false);
        return;
      }
      const filtered = authorSuggestions.filter((a) =>
        a.toLowerCase().includes(q)
      );
      setFilteredAuthorSuggestions(filtered);
      setShowAuthorSuggestions(filtered.length > 0);
      setAuthorActiveIndex(0);
    },
    [authorSuggestions]
  );

  const insertAuthorSuggestion = useCallback((suggestion: string) => {
    setAuthor(suggestion);
    setShowAuthorSuggestions(false);
    setAuthorActiveIndex(-1);
  }, []);

  const handleAuthorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showAuthorSuggestions) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setAuthorActiveIndex((i) =>
          Math.min(i + 1, filteredAuthorSuggestions.length - 1)
        );
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setAuthorActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredAuthorSuggestions[authorActiveIndex]) {
          insertAuthorSuggestion(filteredAuthorSuggestions[authorActiveIndex]);
        }
      } else if (e.key === "Escape") {
        setShowAuthorSuggestions(false);
      }
    },
    [showAuthorSuggestions, filteredAuthorSuggestions, authorActiveIndex, insertAuthorSuggestion]
  );

  // ── Lesson modal helpers ─────────────────────────────────

  const openCreateLessonModal = useCallback((leccion?: Leccion | null) => {
    setEditingLeccion(leccion ?? null);
    setShowCreateLessonModal(true);
  }, []);

  const closeCreateLessonModal = useCallback(() => {
    setShowCreateLessonModal(false);
    setEditingLeccion(null);
  }, []);

  const handleLessonUpdated = useCallback(() => {
    loadLecciones();
    setEditingLeccion(null);
    toast.success(t("createLesson.success.updated") || "Lección actualizada");
  }, [loadLecciones, t]);

  // ── Return ───────────────────────────────────────────────

  return {
    // Core state
    contenido,
    loading,
    saving,
    lecciones,
    showCreateLessonModal,
    editingLeccion,

    // Form fields
    titulo, setTitulo,
    texto_html, setTextoHtml,
    type, setType,
    author,
    difficulty, setDifficulty,
    tags,
    resources,
    selectedLeccionIds,
    orden, setOrden,

    // Slides & media
    slides, setSlides,
    mediaFiles, setMediaFiles,
    availableModelos,
    activeTab, setActiveTab,

    // Tag input
    tagInput,
    showTagsSuggestions,
    tagActiveIndex, setTagActiveIndex,
    filteredTagSuggestions,

    // Author suggestions
    showAuthorSuggestions,
    authorActiveIndex, setAuthorActiveIndex,
    filteredAuthorSuggestions,

    // Memos
    typeOptions,

    // Handlers
    handleSave,
    handleLessonCreated,
    toggleLeccion,
    removeLeccion,
    addTag,
    removeTag,
    handleTagInputChange,
    insertTagSuggestion,
    addResource,
    removeResource,
    setResource,
    handleAuthorChange,
    handleAuthorKeyDown,
    insertAuthorSuggestion,
    openCreateLessonModal,
    closeCreateLessonModal,
    handleLessonUpdated,
  };
}
