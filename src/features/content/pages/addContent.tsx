// src/pages/addContent.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/shared/lib/supabaseClient";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Leccion, ContentSlide, ModeloRA, MediaFile } from "@/shared/types";
import CreateLessonModal from "@/features/content/components/CreateLessonModal";
import HelpModal from "@/features/content/components/HelpModal";
import SlideEditor from "@/features/content/components/SlideEditor";
import MultiMediaUploader from "@/shared/components/MultiMediaUploader";
import { parseId } from '@/shared/lib/parseId';
import { listModelosByLeccion } from "@/features/models3d/services/modelos";

interface RecordType {
  id?: number;
  leccion_id?: number | null;
  title: string;
  type: string;
  author: string;
  difficulty: string;
  tags: string[];
  description: string;
  resources: string[];
  orden?: number | null;
  slides?: ContentSlide[] | null;
  media_files?: MediaFile[] | null;
  // Legacy fields for backwards compatibility
  media_url?: string | null;
  media_type?: 'video' | 'audio' | 'pdf' | 'embed' | 'image' | null;
}

type Difficulty = "fácil" | "media" | "difícil";

export default function AddContentPage({ textSizeLarge, highContrast, }: { textSizeLarge: boolean; highContrast: boolean; }) {
  const { t } = useTranslation();

  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [pendingLecciones, setPendingLecciones] = useState<number[]>([]);
  const [form, setForm] = useState<RecordType>({
    id: undefined,
    leccion_id: undefined,
    title: "",
    type: "molecule",
    author: "",
    difficulty: "fácil",
    tags: [],
    description: "",
    resources: [""],
    orden: undefined,
    slides: [],
    media_files: [],
    media_url: null,
    media_type: null,
  });
  
  // Estados para multimedia
  const [activeTab, setActiveTab] = useState<'content' | 'slides' | 'media'>('content');
  const [availableModelos, setAvailableModelos] = useState<ModeloRA[]>([]);
  const [records, setRecords] = useState<RecordType[]>([]);
  const [filter, setFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [editingLeccion, setEditingLeccion] = useState<Leccion | null>(null);
  // Modal removed: integrating features directly into form
  const [helpOpen, setHelpOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Save progress & state
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Suggestions/Autocomplete for tags / authors
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([]);
  const [tagsSuggestions, setTagsSuggestions] = useState<string[]>([]);
  const [showTagsSuggestions, setShowTagsSuggestions] = useState(false);
  const [tagActiveIndex, setTagActiveIndex] = useState<number>(-1);
  // We use the useMemo derived `filteredTagSuggestions` below (based on tagInput) — avoid duplicate state.
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const [authorActiveIndex, setAuthorActiveIndex] = useState<number>(-1);
  const [filteredAuthorSuggestions, setFilteredAuthorSuggestions] = useState<string[]>([]);

  const typeOptions = useMemo(
    () => [
      { value: "molecule", label: t("addcontent.form.typeOptions.molecule") },
      { value: "atom", label: t("addcontent.form.typeOptions.atom") },
      { value: "experiment", label: t("addcontent.form.typeOptions.experiment") },
      { value: "chemical-reaction", label: t("addcontent.form.typeOptions.chemicalReactions") },
      { value: "periodic-table", label: t("addcontent.form.typeOptions.periodicTable") },
      { value: "article", label: t("addcontent.form.typeOptions.article") },
      { value: "slide", label: t("addcontent.form.typeOptions.slide", { defaultValue: "Presentación/Slides" }) },
      { value: "document", label: t("addcontent.form.typeOptions.document", { defaultValue: "Documento" }) },
      { value: "video", label: t("addcontent.form.typeOptions.video", { defaultValue: "Video" }) },
    ],
    [t]
  );

  const defaultTags = ["reacción", "agua", "orgánica", "inorgánica", "síntesis", "experimental", "ácido", "base"];
  const filteredTagSuggestions = useMemo(() => {
    const q = tagInput.toLowerCase();
    return defaultTags.filter((s) => s.toLowerCase().includes(q) && !form.tags.includes(s));
  }, [tagInput, form.tags, tagsSuggestions]);

  const handleTagInputChange = (val: string) => {
    setTagInput(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setShowTagsSuggestions(false);
      setTagActiveIndex(-1);
      return;
    }
    const filtered = tagsSuggestions.filter((t) => t.toLowerCase().startsWith(q) && !form.tags.includes(t));
    // filteredTagSuggestions (useMemo) is updated by tagInput and tagsSuggestions.
    setShowTagsSuggestions(filtered.length > 0);
    setTagActiveIndex(0);
  };

  const insertTagSuggestion = (suggestion: string) => {
    const v = suggestion.trim();
    if (!v) return;
    if (form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
    setShowTagsSuggestions(false);
    setTagActiveIndex(-1);
  };

  useEffect(() => {
    // fetch records first to determine which lessons are already used
    // then fetch available lessons (unused ones) for selection
    (async () => {
      await fetchRecords();
      await fetchLeccionesAvailable();
    })();

    // If we were navigated with ?lessonId=x, preselect
    const params = new URLSearchParams(window.location.search);
    const lessonIdParam = params.get("lessonId");
    if (lessonIdParam) {
      setForm((s) => ({ ...s, leccion_id: parseId(lessonIdParam) ?? undefined }));
    }
  }, []);

  // If a contentId is present in the URL, prefill form for editing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contentId = params.get('contentId');
    if (contentId) {
      (async () => {
        const contentNum = parseId(contentId);
        if (contentNum == null) return;
        const { data, error } = await supabase.from('contenido').select('id,leccion_id,titulo,texto_html,type,author,difficulty,tags,resources,orden,slides,media_files,media_url,media_type').eq('id', contentNum).single();
        if (!error && data) {
          editRecord({
            id: data.id,
            leccion_id: data.leccion_id,
            title: data.titulo ?? '',
            description: data.texto_html ?? '',
            type: data.type ?? 'article',
            author: data.author ?? '',
            difficulty: data.difficulty ?? 'fácil',
            tags: Array.isArray(data.tags) ? data.tags : [],
            resources: Array.isArray(data.resources) ? data.resources : [],
            orden: data.orden ?? undefined,
            slides: Array.isArray(data.slides) ? data.slides : [],
            media_files: Array.isArray(data.media_files) ? data.media_files : [],
            media_url: data.media_url ?? null,
            media_type: data.media_type ?? null,
          });
        }
      })();
    }
  }, []);

  // populate suggestions from DB records
  useEffect(() => {
    try {
      const authors = new Set<string>();
      const tagsSet = new Set<string>();
      records.forEach((r) => {
        if (r.author) authors.add(r.author);
        (r.tags || []).forEach((t) => tagsSet.add(t));
      });
      setAuthorSuggestions(Array.from(authors));
      // merge defaultTags and tagsSet
      setTagsSuggestions(Array.from(new Set([...defaultTags, ...Array.from(tagsSet)])));
    } catch (err) {
      // ignore
    }
  }, [records]);

  // Global keyboard shortcut: Ctrl/Cmd + S to save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRecord();
      }
      if (e.key === 'Escape') {
        // close help or create lesson modal (contextual)
        if (helpOpen) setHelpOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [form, helpOpen]);

  // helper: move focus to next element in form
  const focusNextField = (current: HTMLElement | null) => {
    if (!modalRef.current || !current) return;
    const selector = "input, select, textarea, button, a[href], [tabindex]:not([tabindex='-1'])";
    const all = Array.from(modalRef.current.querySelectorAll<HTMLElement>(selector))
      .filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
    const idx = all.indexOf(current);
    if (idx >= 0 && idx + 1 < all.length) {
      all[idx + 1].focus();
    }
  };

  const fetchLeccionesAvailable = async () => {
    // get used lesson ids from contenidos
    const { data: contenidoData, error: contenidoError } = await supabase.from('contenido').select('leccion_id');
    if (contenidoError) {
      console.error('Error fetching contenido for filtering lecciones', contenidoError);
    }
    const usedLessonIds = new Set((contenidoData ?? []).map((c: any) => c.leccion_id).filter(Boolean));
    // add locally created/pending lesson ids to used set so they are not selectable elsewhere
    pendingLecciones.forEach((id) => usedLessonIds.add(id));

    const { data, error } = await supabase
      .from("leccion")
      .select("id,titulo,descripcion,nivel,thumbnail_url")
      .order("titulo");

    if (error) {
      console.error("❌ Error al obtener lecciones:", error);
      const msg = t('addcontent.toast.loadLessonsError') || 'Error al cargar lecciones';
      toast.error(msg);
      try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
      try { (window as any).speak?.(msg); } catch (_) {}
    } else {
      // casteo seguro a Leccion[]
      // Filter out lecciones that are used by other contenidos. Keep the current one (if editing) selectable.
      const currentLeccionId = form.leccion_id;
      const filtered = (data ?? []) as Leccion[];
      const available = filtered.filter(l => !usedLessonIds.has(l.id) || l.id === currentLeccionId);
      setLecciones(available);
    }
  };

  const fetchRecords = async () => {
    // Traemos los campos de la tabla 'contenido'
    const { data, error } = await supabase
      .from("contenido")
      .select("id,leccion_id,titulo,texto_html,orden,type,author,difficulty,tags,resources,slides,media_url,media_type")
      .order("orden", { ascending: true });
    if (error) {
      console.error("❌ Error al obtener registros:", error);
      const msg = t('addcontent.toast.loadRecordsError') || 'Error al cargar contenidos';
      toast.error(msg);
      try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
      try { (window as any).speak?.(msg); } catch (_) {}
    } else {
      // mapeo DB -> UI
    const mapped: RecordType[] = (data ?? []).map((c: any) => ({
      id: c.id,
      leccion_id: c.leccion_id,
      title: c.titulo ?? "",
      description: c.texto_html ?? "",
      type: c.type ?? "article",
      author: c.author ?? "",
      difficulty: c.difficulty ?? "fácil",
      tags: Array.isArray(c.tags) ? c.tags : [],
      resources: Array.isArray(c.resources) ? c.resources : [],
      orden: c.orden ?? undefined,
      slides: Array.isArray(c.slides) ? c.slides : [],
      media_url: c.media_url ?? null,
      media_type: c.media_type ?? null,
    }));
      setRecords(mapped);
    }
  };

  //Funcion nueva para crear lecciones Inline
  const handleLessonCreated = (newId: number) => {
    // ponemos la nueva lección seleccionada en el formulario
    setForm((f) => ({ ...f, leccion_id: newId }));
    // refrescamos lecciones y marcar la nueva lección como pendiente (no reutilizable)
    setPendingLecciones((prev) => [...prev, newId]);
    fetchLeccionesAvailable();
    const lmsg = t('createLesson.success.createdAndAssigned');
    toast.success(lmsg);
    try { (window as any).triggerVisualAlert?.({ message: lmsg }); } catch (_) {}
    try { (window as any).speak?.(lmsg); } catch (_) {}
  };

  const addTag = (tag: string) => {
    const v = tag.trim();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  // Cargar modelos disponibles cuando cambia la lección seleccionada
  useEffect(() => {
    const loadModelos = async () => {
      if (!form.leccion_id) {
        setAvailableModelos([]);
        return;
      }
      try {
        const modelos = await listModelosByLeccion(form.leccion_id);
        setAvailableModelos(modelos);
      } catch (error) {
        console.error("Error loading modelos:", error);
        setAvailableModelos([]);
      }
    };
    loadModelos();
  }, [form.leccion_id]);

  const addResource = () => setForm((f) => ({ ...f, resources: [...f.resources, ""] }));
  const removeResource = (idx: number) => setForm((f) => ({ ...f, resources: f.resources.filter((_, i) => i !== idx) }));
  const setResource = (idx: number, val: string) =>
    setForm((f) => ({ ...f, resources: f.resources.map((r, i) => (i === idx ? val : r)) }));

  const clearForm = () => {
    setForm({
      id: undefined,
      leccion_id: undefined,
      title: "",
      type: "molecule",
      author: "",
      difficulty: "fácil",
      tags: [],
      description: "",
      resources: [""],
      orden: undefined,
      slides: [],
      media_files: [],
      media_url: null,
      media_type: null,
    });
    setErrors({});
    setIsEditing(false);
    setTagInput("");
    setActiveTab('content');
    setAvailableModelos([]);
  };

  const validateFields = () => {
    const e: Record<string, string> = {};

    if (!form.title || form.title.trim().length < 3) {
      e.title = t("addcontent.validation.titleRequired");
    }
    if (!form.leccion_id) {
      e.leccion_id = t("addcontent.form.selectLessonRequired") ?? "Selecciona una lección";
    }

    setErrors(e);
    return e;
  };

  const getNextOrder = () => {
    const maxOrden = Math.max(...records.map(r => r.orden ?? 0), 0);
    return maxOrden + 1;
  }

  // 🔧 GUARDAR / ACTUALIZAR REGISTRO
  const saveRecord = async () => {
    const e = validateFields();
    if (Object.keys(e).length > 0) {
      const errMsg = Object.values(e)[0] as string;
      toast.error(errMsg);
      try { (window as any).triggerVisualAlert?.({ message: errMsg }); } catch (_) {}
      try { (window as any).speak?.(errMsg); } catch (_) {}
      return;
    }

    console.log("🟢 Intentando guardar:", form);

    const payload = {
      leccion_id: form.leccion_id,
      titulo: form.title,
      texto_html: form.description,
      orden: form.orden ?? getNextOrder(),
      type: form.type,
      author: form.author,
      difficulty: form.difficulty,
      tags: form.tags,         // [] array
      resources: form.resources, // [] array
      slides: form.slides && form.slides.length > 0 ? form.slides : null,
      media_files: form.media_files && form.media_files.length > 0 ? form.media_files : null,
      // Mantener compatibilidad con campos legacy
      media_url: form.media_files && form.media_files.length > 0 ? form.media_files[0].url : null,
      media_type: form.media_files && form.media_files.length > 0 ? form.media_files[0].type : null,
    };

    // Añadir created_by en inserciones nuevas
    const sessionData = await supabase.auth.getSession();
    const currentUserId = sessionData.data?.session?.user?.id;

    setSaving(true);
    setSaveProgress(10);
    setTimeout(() => setSaveProgress(50), 200);

    if (isEditing && form.id) {
        // When editing, ensure the selected leccion isn't used by a different content
        if (form.leccion_id) {
          const { data: existing, error: checkErr } = await supabase.from('contenido').select('id').eq('leccion_id', form.leccion_id).neq('id', form.id).limit(1).single();
          if (!checkErr && existing) {
            const msg = t('addcontent.errors.lessonAlreadyAssigned') || 'La lección ya está asociada a otro contenido';
            toast.error(msg);
            setSaving(false);
            setSaveProgress(0);
            return;
          }
        }
      const { error } = await supabase
        .from("contenido")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        console.error("❌ Error al actualizar:", error);
        const msg = `Error al actualizar: ${error.message}`;
        toast.error(msg);
        try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
        try { (window as any).speak?.(msg); } catch (_) {}
      } else {
        const msg = t('addcontent.toast.updateSuccess') || 'Registro actualizado';
        toast.success(msg);
        try { (window as any).triggerVisualAlert?.({ message: 'Registro actualizado' }); } catch (_) {}
        try { (window as any).speak?.(msg); } catch (_) {}
        fetchRecords();
        // update available lessons list so the used lesson gets excluded
        fetchLeccionesAvailable();
        clearForm();
      }
    } else {
      // Enforce uniqueness: do not allow creating a content using a leccion that's already used
      if (form.leccion_id) {
        const { data: existing, error: checkErr } = await supabase.from('contenido').select('id').eq('leccion_id', form.leccion_id).limit(1).single();
        if (!checkErr && existing) {
          const msg = t('addcontent.errors.lessonAlreadyAssigned') || 'La lección ya está asociada a otro contenido';
          toast.error(msg);
          setSaving(false);
          setSaveProgress(0);
          return;
        }
      }
      const { data, error } = await supabase
        .from("contenido")
        .insert([{ ...payload, created_by: currentUserId || null }])
        .select("id");

      console.log("🟣 Respuesta Supabase (insert):", { data, error });

      if (error) {
        console.error("❌ Error al guardar:", error);
        const msg = `Error guardando dato: ${error.message}`;
        toast.error(msg);
        try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
        try { (window as any).speak?.(msg); } catch (_) {}
      } else {
        const insertedId = (data && data[0] && data[0].id) ? data[0].id : null;

        // Crear relaciones en contenido_leccion y leccion_seccion
        if (insertedId && form.leccion_id) {
          try {
            // 1) Crear registro en contenido_leccion (join table)
            await supabase.from("contenido_leccion").insert([{
              contenido_id: insertedId,
              leccion_id: form.leccion_id,
              orden: form.orden ?? 1,
            }]);

            // 2) Obtener el siguiente orden disponible para leccion_seccion
            const { data: maxOrdenData } = await supabase
              .from("leccion_seccion")
              .select("orden")
              .eq("leccion_id", form.leccion_id)
              .order("orden", { ascending: false })
              .limit(1);
            const nextOrden = (maxOrdenData?.[0]?.orden ?? 0) + 10;

            // 3) Crear registro en leccion_seccion para que el estudiante pueda ver el contenido
            await supabase.from("leccion_seccion").insert([{
              leccion_id: form.leccion_id,
              tipo: "contenido",
              contenido_id: insertedId,
              prueba_id: null,
              modelo_id: null,
              orden: nextOrden,
              es_obligatorio: true,
              requisitos: [],
              titulo_seccion: form.title || null,
              descripcion_seccion: form.description || null,
            }]);
          } catch (relErr) {
            console.warn("Error creando relaciones contenido_leccion/leccion_seccion:", relErr);
          }
        }

        const msg = t('addcontent.toast.saveSuccess') || 'Registro guardado correctamente';
        toast.success(msg);
        try { (window as any).triggerVisualAlert?.({ message: 'Registro guardado' }); } catch (_) {}
        try { (window as any).speak?.(msg); } catch (_) {}
        // history record for local undo + analytics
        try {
          const historyKey = 'tabla_maestra_history';
          const key = 'tabla_maestra';
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          const item = { id: String(data?.[0]?.id ?? Date.now().toString()), title: form.title, type: form.type, tags: form.tags, description: form.description, resources: form.resources, safety: 'low', author: form.author, createdAt: new Date().toISOString() };
          stored.push(item);
          localStorage.setItem(key, JSON.stringify(stored));
          const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
          history.push({ id: item.id, action: 'create', at: new Date().toISOString(), snapshot: item });
          localStorage.setItem(historyKey, JSON.stringify(history));
        } catch (err) {
          // ignore
        }
        fetchRecords();
        clearForm();
        // refresh available lessons and clear pending if saved successfully
        await fetchLeccionesAvailable();
        // remove saved leccion from pending (because it's now referenced by saved content)
        setPendingLecciones((prev) => prev.filter((x) => x !== (form.leccion_id ?? -1)));
        if (insertedId) {
          // Provide undo toast that removes the DB record
          toast(({ id: toastId }) => (
            <div className="flex items-center justify-between">
              <div>Contenido guardado</div>
              <button className="ml-3 underline" onClick={async () => {
                // Undo: delete the newly inserted content (CASCADE deletes contenido_leccion)
                const { error } = await supabase.from('contenido').delete().eq('id', insertedId);
                if (!error) {
                  // Also clean up leccion_seccion
                  await supabase.from('leccion_seccion').delete().eq('contenido_id', insertedId);
                  toast.dismiss(toastId);
                  toast.success(t('undoSuccess') || 'Deshecho');
                  try { (window as any).triggerVisualAlert?.({ message: t('undoSuccess') }); } catch (_) {}
                  try { (window as any).speak?.(t('undoSuccess')); } catch (_) {}
                  fetchRecords();
                } else {
                  toast.error(t('addcontent.toast.undoError', { message: error.message }) || ('Error deshaciendo: ' + error.message));
                }
              }}>Deshacer</button>
            </div>
          ));
        }
      }
    }

    setTimeout(() => setSaveProgress(100), 120);
    setTimeout(() => { setSaving(false); setSaveProgress(0); }, 400);
  };

  // Modal removed — save is handled directly by saveRecord; keep function removed

  const insertAuthorSuggestion = (suggestion: string) => {
    setForm((f) => ({ ...f, author: suggestion }));
    setShowAuthorSuggestions(false);
    setAuthorActiveIndex(-1);
  };

  const handleAuthorChange = (val: string) => {
    setForm((f) => ({ ...f, author: val }));
    const q = val.trim().toLowerCase();
    if (!q) {
      setFilteredAuthorSuggestions([]);
      setShowAuthorSuggestions(false);
      return;
    }
    const filtered = authorSuggestions.filter((a) => a.toLowerCase().includes(q));
    setFilteredAuthorSuggestions(filtered);
    setShowAuthorSuggestions(filtered.length > 0);
    setAuthorActiveIndex(0);
  };

  const handleAuthorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAuthorSuggestions) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      setAuthorActiveIndex((i) => Math.min(i + 1, filteredAuthorSuggestions.length - 1));
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      setAuthorActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredAuthorSuggestions[authorActiveIndex]) insertAuthorSuggestion(filteredAuthorSuggestions[authorActiveIndex]);
    } else if (e.key === "Tab") {
      if (filteredAuthorSuggestions[authorActiveIndex]) {
        e.preventDefault();
        insertAuthorSuggestion(filteredAuthorSuggestions[authorActiveIndex]);
        focusNextField(e.currentTarget as HTMLElement);
      }
    } else if (e.key === "Escape") {
      setShowAuthorSuggestions(false);
    }
  };

  const editRecord = (r: RecordType) => {
    // Cargar media_files o migrar desde legacy media_url/media_type
    let mediaFiles: MediaFile[] = [];
    if (r.media_files && r.media_files.length > 0) {
      mediaFiles = r.media_files;
    } else if (r.media_url && r.media_type) {
      mediaFiles = [{ url: r.media_url, type: r.media_type, name: 'Archivo' }];
    }
    
    setForm({
      id: r.id,
      leccion_id: r.leccion_id,
      title: r.title,
      description: r.description,
      type: r.type,
      author: r.author,
      difficulty: r.difficulty,
      tags: r.tags,
      resources: r.resources,
      orden: r.orden,
      slides: r.slides || [],
      media_files: mediaFiles,
      media_url: r.media_url || null,
      media_type: r.media_type || null,
    });
    setIsEditing(true);
    // Determinar tab activo según contenido
    if (r.slides && r.slides.length > 0) {
      setActiveTab('slides');
    } else if (mediaFiles.length > 0) {
      setActiveTab('media');
    } else {
      setActiveTab('content');
    }
  };

  const deleteRecord = async (id: number | undefined) => {
    if (!id) return;
    const { error } = await supabase.from("contenido").delete().eq("id", id);
    if (error) {
      const msg = `Error al eliminar: ${error.message}`;
      toast.error(msg);
      try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
      try { (window as any).speak?.(msg); } catch (_) {}
    } else {
      toast.success(t('addcontent.toast.deleteSuccess') || '🗑️ Dato eliminado correctamente');
      try { (window as any).triggerVisualAlert?.({ message: t('addcontent.toast.deleteSuccess') }); } catch (_) {}
      try { (window as any).speak?.(t('addcontent.toast.deleteSuccess')); } catch (_) {}
      fetchRecords();
      // After deletion, the lesson referenced by this content might become available again
      fetchLeccionesAvailable();
    }
  };

  const difficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "fácil":
        return "bg-green-200 text-green-800";
      case "media":
        return "bg-yellow-200 text-yellow-800";
      case "difícil":
        return "bg-red-200 text-red-800";
      default:
        return "";
    }
  };

  const filteredRecords = useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return records;

    return records.filter((r) => {
      const textMatch =
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.difficulty.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q));

      const tagMatch = Array.isArray(r.tags)
        ? r.tags.some((t) => t.toLowerCase().includes(q))
        : false;

      const resourceMatch = Array.isArray(r.resources)
        ? r.resources.some((res) => res.toLowerCase().includes(q))
        : false;

      return textMatch || tagMatch || resourceMatch;
    });
  }, [filter, records]);

  const getTypeLabel = (typeVal: string) => {
    switch (typeVal) {
      case 'molecule': return t('addcontent.form.typeOptions.molecule');
      case 'atom': return t('addcontent.form.typeOptions.atom');
      case 'experiment': return t('addcontent.form.typeOptions.experiment');
      case 'chemical-reaction': return t('addcontent.form.typeOptions.chemicalReactions');
      case 'periodic-table': return t('addcontent.form.typeOptions.periodicTable');
      case 'article': return t('addcontent.form.typeOptions.article');
      default: return typeVal;
    }
  };

  const styledInput = "w-full border border-gray-300 px-4 py-2.5 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400";
  const styledSelect = `${styledInput} appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px] bg-[right_12px_center] bg-no-repeat pr-10`;

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-20 w-60 h-60 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 ${highContrast ? '[&_*]:!border-gray-900' : ''}`}>

        {/* ═══════════════════════════════════════════════════════
            HEADER
        ═══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${textSizeLarge ? 'text-3xl' : 'text-2xl'} font-bold text-gray-900 tracking-tight`}>
              {t("addcontent.formTitle")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t("addcontent.form.headerSubtitle") || "Crea y organiza contenido educativo para tus lecciones"}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all text-sm font-medium"
            onClick={() => setHelpOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t('help') || 'Ayuda'}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            FORMULARIO
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 border border-white/60 overflow-hidden">
          <form ref={modalRef} onSubmit={(e) => { e.preventDefault(); saveRecord(); }}>

            {/* ── Sección 1: Lección ───────────────────────── */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h3 className={`${textSizeLarge ? 'text-lg' : 'text-base'} font-semibold text-gray-800`}>
                  {t("addcontent.form.lessonSection") || "Lección asociada"}
                </h3>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1">
                  <select
                    className={styledSelect}
                    value={form.leccion_id ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, leccion_id: e.target.value ? parseId(e.target.value) ?? undefined : undefined }))
                    }
                  >
                    <option value="">{t("addcontent.form.selectLesson") ?? "Selecciona una lección"}</option>
                    {lecciones.map((l) => (
                      <option key={String(l.id)} value={String(l.id)}>
                        {l.titulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingLeccion(null); setShowCreateLessonModal(true); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all text-sm font-medium whitespace-nowrap"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t("addcontent.form.createLesson") ?? "Nueva lección"}
                  </button>
                  {form.leccion_id && (
                    <button
                      type="button"
                      onClick={() => {
                        const l = lecciones.find((x) => x.id === form.leccion_id) ?? null;
                        setEditingLeccion(l);
                        setShowCreateLessonModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 transition-all text-sm font-medium whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      {t('teacher.edit') || 'Editar'}
                    </button>
                  )}
                </div>
              </div>
              {errors.leccion_id && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.leccion_id}
                </p>
              )}
            </div>

            {/* ── Sección 2: Información básica ───────────── */}
            <div className="px-6 pt-5 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className={`${textSizeLarge ? 'text-lg' : 'text-base'} font-semibold text-gray-800`}>
                  {t("addcontent.form.basicInfo") || "Información básica"}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.title")}</label>
                  <input
                    className={styledInput}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t("addcontent.form.titlePlaceholder") || "Ej: Estructura molecular del agua"}
                  />
                  {errors.title && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.description")}</label>
                  <textarea
                    className={`${styledInput} resize-none`}
                    value={form.description}
                    rows={3}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t("addcontent.form.descriptionPlaceholder") || "Describe el contenido de forma breve..."}
                  />
                </div>

                {/* Tipo + Dificultad (side by side) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.type")}</label>
                    <select className={styledSelect} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.difficulty")}</label>
                    <select className={styledSelect} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}>
                      <option value="fácil">{t("addcontent.form.difficultyOptions.easy")}</option>
                      <option value="media">{t("addcontent.form.difficultyOptions.medium")}</option>
                      <option value="difícil">{t("addcontent.form.difficultyOptions.hard")}</option>
                    </select>
                  </div>
                </div>

                {/* Autor */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.author")}</label>
                  <input
                    className={styledInput}
                    value={form.author}
                    onChange={(e) => handleAuthorChange(e.target.value)}
                    onKeyDown={(e) => handleAuthorKeyDown(e)}
                    placeholder={t("addcontent.form.authorPlaceholder") || "Nombre del autor"}
                  />
                  {showAuthorSuggestions && filteredAuthorSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex flex-wrap gap-1.5">
                      {filteredAuthorSuggestions.map((a, i) => (
                        <button
                          key={a}
                          type="button"
                          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${i === authorActiveIndex ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseEnter={() => setAuthorActiveIndex(i)}
                          onClick={() => insertAuthorSuggestion(a)}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Sección 3: Etiquetas y Recursos ─────────── */}
            <div className="px-6 pt-5 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
                <h3 className={`${textSizeLarge ? 'text-lg' : 'text-base'} font-semibold text-gray-800`}>
                  {t("addcontent.form.tagsAndResources") || "Etiquetas y recursos"}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.tags")}</label>
                  {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-medium">
                          {tag}
                          <button type="button" className="text-blue-400 hover:text-blue-600 transition-colors" onClick={() => removeTag(tag)}>
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    className={styledInput}
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    placeholder={t("addcontent.form.tagPlaceholder") || "Escribe y presiona Enter para agregar..."}
                    onKeyDown={(e) => {
                      if (showTagsSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowRight')) {
                        e.preventDefault();
                        setTagActiveIndex((i) => Math.min(i + 1, filteredTagSuggestions.length - 1));
                        return;
                      }
                      if (showTagsSuggestions && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')) {
                        e.preventDefault();
                        setTagActiveIndex((i) => Math.max(i - 1, 0));
                        return;
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (showTagsSuggestions && filteredTagSuggestions[tagActiveIndex]) {
                          insertTagSuggestion(filteredTagSuggestions[tagActiveIndex]);
                        } else {
                          addTag(tagInput);
                        }
                        return;
                      }
                      if (e.key === 'Tab') {
                        if (showTagsSuggestions && filteredTagSuggestions[tagActiveIndex]) {
                          e.preventDefault();
                          insertTagSuggestion(filteredTagSuggestions[tagActiveIndex]);
                          focusNextField(e.currentTarget as HTMLElement);
                        }
                      }
                    }}
                  />
                  {showTagsSuggestions && filteredTagSuggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {filteredTagSuggestions.map((tg, i) => (
                        <button
                          key={tg}
                          type="button"
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${i === tagActiveIndex ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                          onMouseEnter={() => setTagActiveIndex(i)}
                          onClick={() => insertTagSuggestion(tg)}
                        >
                          + {tg}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resources */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("addcontent.form.resources")}</label>
                  <div className="space-y-2">
                    {form.resources.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <div className="relative flex-1">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                          <input
                            className={`${styledInput} pl-10`}
                            value={r}
                            onChange={(e) => setResource(i, e.target.value)}
                            placeholder="https://..."
                          />
                        </div>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          onClick={() => removeResource(i)}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    onClick={addResource}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {t("addcontent.form.addResource")}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Sección 4: Contenido Multimedia ─────────── */}
            <div className="px-6 pt-5 pb-5 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className={`${textSizeLarge ? 'text-lg' : 'text-base'} font-semibold text-gray-800`}>
                  {t("addcontent.form.multimediaContent") || "Contenido Multimedia"}
                </h3>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('content')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'content'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  {t("addcontent.tabs.text") || "Texto"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('slides')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'slides'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  {t("addcontent.tabs.slides") || "Diapositivas"}
                  {(form.slides?.length ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">{form.slides?.length}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('media')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'media'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  {t("addcontent.tabs.media") || "Media"}
                  {(form.media_files?.length ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">{form.media_files?.length}</span>
                  )}
                </button>
              </div>

              {/* Tab content */}
              {activeTab === 'content' && (
                <div className="p-5 bg-gray-50/80 rounded-xl border border-gray-100 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm text-gray-500">
                    {t("addcontent.tabs.textDescription") || "El texto descriptivo se edita arriba en el campo 'Descripción'."}
                  </p>
                </div>
              )}

              {activeTab === 'slides' && (
                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                  <SlideEditor
                    slides={form.slides || []}
                    onChange={(newSlides) => setForm(f => ({ ...f, slides: newSlides }))}
                    availableModelos={availableModelos}
                  />
                </div>
              )}

              {activeTab === 'media' && (
                <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100">
                  <MultiMediaUploader
                    mediaFiles={form.media_files || []}
                    onMediaFilesChange={(files) => setForm(f => ({ ...f, media_files: files }))}
                    bucketName="contenidos"
                  />
                </div>
              )}
            </div>

            {/* ── Footer: Acciones ────────────────────────── */}
            <div className="px-6 py-4 bg-gray-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-all text-sm font-medium"
                  onClick={clearForm}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  {t("addcontent.form.clear")}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium"
                  onClick={() => { try { (window as any).speak?.(`${form.title}. ${form.description ?? ''}`); } catch (e) {}; toast.success(t('addcontent.form.reading') || 'Reading...'); }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  {t('addcontent.read') || 'Leer'}
                </button>
              </div>

              <div className="flex items-center gap-3">
                {saving && (
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${saveProgress}%` }} />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-200 transition-all text-sm font-semibold"
                >
                  {saving ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {isEditing ? t("addcontent.form.update") : t("addcontent.form.save")}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ═══════════════════════════════════════════════════════
            TABLA DE REGISTROS
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-gray-200/50 border border-white/60 overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-gray-100">
            <h3 className={`${textSizeLarge ? 'text-lg' : 'text-base'} font-semibold text-gray-800 mb-3`}>
              {t("addcontent.table.title") || "Contenidos existentes"}
            </h3>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder={t("addcontent.table.filter")}
                className={`${styledInput} pl-10`}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          {/* Mobile: stacked cards */}
          <div className="sm:hidden p-4 space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">{t("addcontent.table.noRecords")}</div>
            ) : (
              filteredRecords.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{r.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{getTypeLabel(r.type)} • {r.author}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${difficultyColor(r.difficulty)}`}>{r.difficulty}</span>
                  </div>
                  {r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                      {r.tags.length > 3 && <span className="text-xs text-gray-400">+{r.tags.length - 3}</span>}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors" onClick={() => editRecord(r)}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      {t("addcontent.table.actions.edit")}
                    </button>
                    <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors" onClick={() => deleteRecord(r.id)}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      {t("addcontent.table.actions.delete")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("addcontent.table.columns.title")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("addcontent.table.columns.type")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("addcontent.table.columns.difficulty")}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("addcontent.table.columns.tags")}</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("addcontent.table.columns.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">{t("addcontent.table.noRecords")}</td></tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-6 py-3.5">
                        <span className="font-medium text-gray-900 text-sm">{r.title}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-600">{getTypeLabel(r.type)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${difficultyColor(r.difficulty)}`}>{r.difficulty}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {r.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                          {r.tags.length > 3 && <span className="text-xs text-gray-400">+{r.tags.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex gap-1.5 justify-end opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                            onClick={() => editRecord(r)}
                            title={t("addcontent.table.actions.edit")}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            onClick={() => deleteRecord(r.id)}
                            title={t("addcontent.table.actions.delete")}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal de crear lección */}
      <CreateLessonModal
        open={showCreateLessonModal}
        onClose={() => { setShowCreateLessonModal(false); setEditingLeccion(null); }}
        onCreated={(id) => { handleLessonCreated(id); setEditingLeccion(null); }}
        onUpdated={() => { fetchLeccionesAvailable(); setEditingLeccion(null); const msg = t('createLesson.success.updated') || 'Lección actualizada'; toast.success(msg); }}
        parentLeccionId={form.leccion_id}
        leccion={editingLeccion}
      />
      {/* Help modal */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('addContentHelpTitle') || 'Ayuda - Añadir Contenido'}>
        <div className="space-y-3">
          <p className="font-semibold text-gray-800">{t('shortcuts') || 'Atajos'}</p>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Ctrl+S</kbd> {t('shortcut.save') || 'Guardar'}</li>
            <li className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Esc</kbd> {t('shortcut.close') || 'Cerrar modal/ayuda'}</li>
            <li className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">↑ ↓</kbd> {t('shortcut.navigateSuggestions') || 'Navegar sugerencias'}</li>
            <li className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Enter</kbd> {t('shortcut.applySuggestion') || 'Aplicar sugerencia'}</li>
            <li className="flex items-center gap-2"><kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs font-mono">Tab</kbd> {t('shortcut.tabNavigate') || 'Aceptar sugerencia y avanzar'}</li>
          </ul>
        </div>
      </HelpModal>
    </main>
  );
}