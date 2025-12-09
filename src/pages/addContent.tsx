// src/pages/addContent.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";
import heroImage from "../img/quimica1.png";
import { useTranslation } from "react-i18next";
import type { Leccion } from "../types/db"; // asegúrate de haber creado src/types/db.ts
import CreateLessonModal from "../components/CreateLessonModal";
import HelpModal from "../components/HelpModal";

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
}

type Difficulty = "fácil" | "media" | "difícil";

export default function AddContentPage({ textSizeLarge, highContrast, }: { textSizeLarge: boolean; highContrast: boolean; }) {
  const { t } = useTranslation();

  const [lecciones, setLecciones] = useState<Leccion[]>([]);
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
  });
  const [records, setRecords] = useState<RecordType[]>([]);
  const [filter, setFilter] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
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

  const inputClass = "w-full border px-3 py-2 rounded text-black";

  const typeOptions = useMemo(
    () => [
      { value: "molecule", label: t("addcontent.form.typeOptions.molecule") },
      { value: "atom", label: t("addcontent.form.typeOptions.atom") },
      { value: "experiment", label: t("addcontent.form.typeOptions.experiment") },
      { value: "article", label: t("addcontent.form.typeOptions.article") },
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
    fetchLecciones();
    fetchRecords();

    // If we were navigated with ?lessonId=x, preselect
    const params = new URLSearchParams(window.location.search);
    const lessonIdParam = params.get("lessonId");
    if (lessonIdParam) {
      setForm((s) => ({ ...s, leccion_id: Number(lessonIdParam) }));
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

  const fetchLecciones = async () => {
    const { data, error } = await supabase
      .from("leccion")
      .select("id,titulo,descripcion,nivel,thumbnail_url")
      .order("titulo");

    if (error) {
      console.error("❌ Error al obtener lecciones:", error);
      toast.error("Error al cargar lecciones");
    } else {
      // casteo seguro a Leccion[]
      setLecciones((data ?? []) as Leccion[]);
    }
  };

  const fetchRecords = async () => {
    // Traemos los campos de la tabla 'contenido'
    const { data, error } = await supabase
      .from("contenido")
      .select("id,leccion_id,titulo,texto_html,orden,type,author,difficulty,tags,resources")
      .order("orden", { ascending: true });
    if (error) {
      console.error("❌ Error al obtener registros:", error);
      toast.error("Error al cargar contenidos");
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
    }));
      setRecords(mapped);
    }
  };

  //Funcion nueva para crear lecciones Inline
  const handleLessonCreated = (newId: number) => {
    // ponemos la nueva lección seleccionada en el formulario
    setForm((f) => ({ ...f, leccion_id: newId }));
    // refrescamos lecciones
    fetchLecciones();
    toast.success("Lección creada y asignada");
  };

  const addTag = (tag: string) => {
    const v = tag.trim();
    if (!v || form.tags.includes(v)) return;
    setForm((f) => ({ ...f, tags: [...f.tags, v] }));
    setTagInput("");
  };
  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

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
    });
    setErrors({});
    setIsEditing(false);
    setTagInput("");
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
      toast.error(Object.values(e)[0]);
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
      resources: form.resources // [] array
    };

    setSaving(true);
    setSaveProgress(10);
    setTimeout(() => setSaveProgress(50), 200);

    if (isEditing && form.id) {
      const { error } = await supabase
        .from("contenido")
        .update(payload)
        .eq("id", form.id);

      if (error) {
        console.error("❌ Error al actualizar:", error);
        toast.error(`Error al actualizar: ${error.message}`);
      } else {
        toast.success("✅ Registro actualizado correctamente");
        fetchRecords();
        clearForm();
      }
    } else {
      const { data, error } = await supabase
        .from("contenido")
        .insert([payload])
        .select("id");

      console.log("🟣 Respuesta Supabase (insert):", { data, error });

      if (error) {
        console.error("❌ Error al guardar:", error);
        toast.error(`Error guardando dato: ${error.message}`);
      } else {
        toast.success("✅ Registro guardado correctamente");
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
        // After inserted, the data variable contains the inserted id(s)
        const insertedId = (data && data[0] && data[0].id) ? data[0].id : null;
        if (insertedId) {
          // Provide undo toast that removes the DB record
          toast(({ id: toastId }) => (
            <div className="flex items-center justify-between">
              <div>Contenido guardado</div>
              <button className="ml-3 underline" onClick={async () => {
                // Undo: delete the newly inserted content
                const { error } = await supabase.from('contenido').delete().eq('id', insertedId);
                if (!error) {
                  toast.dismiss(toastId);
                  toast.success('Deshecho');
                  fetchRecords();
                } else {
                  toast.error('Error deshaciendo: ' + error.message);
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
    });
    setIsEditing(true);
  };

  const deleteRecord = async (id: number | undefined) => {
    if (!id) return;
    const { error } = await supabase.from("contenido").delete().eq("id", id);
    if (error) toast.error(`Error al eliminar: ${error.message}`);
    else {
      toast.success("🗑️ Dato eliminado correctamente");
      fetchRecords();
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

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-start">
      <img src={heroImage} alt="Fondo" className="absolute inset-0 w-full h-full object-cover opacity-70" />
      <div className={`absolute inset-0 ${highContrast ? "bg-black/50" : "bg-white/20"}`}></div>

      <div className="relative z-10 w-full max-w-4xl p-6 mt-12 space-y-8">
        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div ref={modalRef} className="flex items-center justify-between">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">{t("addcontent.formTitle")}</h2>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-2 rounded bg-gray-200 text-black" onClick={() => setHelpOpen(true)}>{t('help') || 'Ayuda'}</button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveRecord(); }}>
            {/* Selector de lección + botón crear */}
            <div className={`${textSizeLarge ? 'text-lg' : 'text-sm'}`}>
              <label className="block mb-1">Lección</label>
              <div className="flex items-center gap-2">
                <select
                  className={inputClass}
                  value={form.leccion_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, leccion_id: e.target.value ? Number(e.target.value) : undefined }))
                  }
                >
                  <option value="">{t("addcontent.form.selectLesson") ?? "Selecciona una lección"}</option>
                  {lecciones.map((l) => (
                    <option key={String(l.id)} value={String(l.id)}>
                      {l.titulo}
                    </option>
                  ))}
                </select>

                {/* Botón para abrir modal de creación de lección */}
                <button
                  type="button"
                  onClick={() => setShowCreateLessonModal(true)}
                  className="px-3 py-2 rounded bg-green-500 text-white hover:bg-green-600"
                >
                  + {t("addcontent.form.createLesson") ?? "Nueva lección"}
                </button>
              </div>
              {errors.leccion_id && <p className="text-red-600 text-sm mt-1">{errors.leccion_id}</p>}
            </div>

            {/* Campos de formulario */}
            <div>
              <label className="block mb-1">{t("addcontent.form.title")}</label>
              <input className={inputClass} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block mb-1">{t("addcontent.form.description")}</label>
              <textarea className={inputClass} value={form.description} rows={3} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Mantengo inputs UI extra no persistidos en DB */}
            <div>
              <label className="block mb-1">{t("addcontent.form.type")}</label>
              <select className={inputClass} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {typeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            <div className="relative">
              <label className="block mb-1">{t("addcontent.form.author")}</label>
              <input
                className={inputClass}
                value={form.author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                onKeyDown={(e) => handleAuthorKeyDown(e)}
              />
              {showAuthorSuggestions && filteredAuthorSuggestions.length > 0 && (
                <div className="absolute left-0 z-20 bg-white border rounded mt-1 p-2 flex gap-2 max-w-full overflow-auto">
                  {filteredAuthorSuggestions.map((a, i) => (
                    <button key={a} type="button" className={`px-3 py-1 rounded-full ${i === authorActiveIndex ? 'bg-gray-200' : 'bg-gray-100'}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setAuthorActiveIndex(i)} onClick={() => insertAuthorSuggestion(a)}>
                      {a}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1">{t("addcontent.form.difficulty")}</label>
              <select className={inputClass} value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as Difficulty }))}>
                <option value="fácil">{t("addcontent.form.difficultyOptions.easy")}</option>
                <option value="media">{t("addcontent.form.difficultyOptions.medium")}</option>
                <option value="difícil">{t("addcontent.form.difficultyOptions.hard")}</option>
              </select>
            </div>

            <div>
              <label className="block mb-1">{t("addcontent.form.tags")}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {tag} <button type="button" className="ml-1 text-xs" onClick={() => removeTag(tag)}>×</button>
                  </span>
                ))}
              </div>
              <input className={inputClass} value={tagInput} onChange={(e) => handleTagInputChange(e.target.value)} onKeyDown={(e) => {
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
              }} />
              {showTagsSuggestions && filteredTagSuggestions.length > 0 && (
                <div className="mt-2 flex gap-2 items-center">
                  {filteredTagSuggestions.map((t, i) => (
                    <button
                      key={t}
                      type="button"
                      className={`px-2 py-1 rounded-full text-xs ${i === tagActiveIndex ? 'bg-gray-200' : 'bg-gray-100'}`}
                      onMouseEnter={() => setTagActiveIndex(i)}
                      onClick={() => insertTagSuggestion(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block mb-1">{t("addcontent.form.resources")}</label>
              {form.resources.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className={inputClass} value={r} onChange={(e) => setResource(i, e.target.value)} />
                  <button type="button" className="text-red-500" onClick={() => removeResource(i)}>×</button>
                </div>
              ))}
              <button type="button" className="underline text-sm" onClick={addResource}>{t("addcontent.form.addResource")}</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-4">
              <button type="button" className="w-full sm:w-auto px-3 py-3 sm:py-2 rounded bg-gray-200 text-black" onClick={clearForm}>{t("addcontent.form.clear")}</button>
                <div className="flex-1">
                  {saving && (
                    <div className="mb-2 h-2 bg-gray-200 rounded overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${saveProgress}%` }} />
                    </div>
                  )}
                  <button type="submit" className="w-full sm:w-auto px-3 py-3 sm:py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                {isEditing ? t("addcontent.form.update") : t("addcontent.form.save")}
                  </button>
                </div>
            </div>
          </form>
        </div>

        {/* Tabla de registros */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {/* Mobile: stacked cards */}
          <div className="sm:hidden space-y-3 mb-4">
            {filteredRecords.length === 0 ? (
              <div className="border p-3 rounded-md text-center">{t("addcontent.table.noRecords")}</div>
            ) : (
              filteredRecords.map((r) => (
                <div key={r.id} className="border p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{r.title}</h4>
                      <p className="text-xs text-gray-500">{r.type} • {r.author}</p>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${difficultyColor(r.difficulty)}`}>{r.difficulty}</div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-yellow-200 rounded text-sm" onClick={() => editRecord(r)}>{t("addcontent.table.actions.edit")}</button>
                    <button className="flex-1 px-3 py-2 bg-red-400 rounded text-sm text-white" onClick={() => deleteRecord(r.id)}>{t("addcontent.table.actions.delete")}</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <input type="text" placeholder={t("addcontent.table.filter")} className="mb-4 w-full border px-3 py-2 rounded" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <table className="min-w-full border-collapse border text-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">{t("addcontent.table.columns.title")}</th>
                  <th className="border p-2">{t("addcontent.table.columns.type")}</th>
                  <th className="border p-2">{t("addcontent.table.columns.difficulty")}</th>
                  <th className="border p-2">{t("addcontent.table.columns.tags")}</th>
                  <th className="border p-2">{t("addcontent.table.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr><td colSpan={5} className="border p-2 text-center">{t("addcontent.table.noRecords")}</td></tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-100">
                      <td className="border p-2">{r.title}</td>
                      <td className="border p-2">{r.type}</td>
                      <td className={`border p-2 ${difficultyColor(r.difficulty)}`}>{r.difficulty}</td>
                      <td className="border p-2">{r.tags.join(", ")}</td>
                      <td className="border p-2 flex gap-2">
                        <button className="px-2 py-1 bg-yellow-200 rounded text-sm" onClick={() => editRecord(r)}>
                          {t("addcontent.table.actions.edit")}
                        </button>
                        <button className="px-2 py-1 bg-red-400 rounded text-sm text-white" onClick={() => deleteRecord(r.id)}>
                          {t("addcontent.table.actions.delete")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
      {/* Modal de crear lección (renderiza dentro del JSX) */}
      <CreateLessonModal
        open={showCreateLessonModal}
        onClose={() => setShowCreateLessonModal(false)}
        onCreated={handleLessonCreated}
        parentLeccionId={form.leccion_id}
      />
      {/* Help modal for the page */}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} title={t('addContentHelpTitle') || 'Ayuda - Añadir Contenido'}>
        <div>
          <p><strong>{t('shortcuts') || 'Atajos'}</strong></p>
          <ul className="list-disc ml-5">
            <li><strong>Ctrl/Cmd + S</strong>: {t('shortcut.save') || 'Guardar'}</li>
            <li><strong>Escape</strong>: {t('shortcut.close') || 'Cerrar modal/ayuda'}</li>
            <li><strong>Arrow Up/Down</strong>: {t('shortcut.navigateSuggestions') || 'Navegar sugerencias'}</li>
            <li><strong>Enter</strong>: {t('shortcut.applySuggestion') || 'Aplicar sugerencia'}</li>
            <li><strong>Tab</strong>: {t('shortcut.tabNavigate') || 'Tab: Aceptar sugerencia y avanzar'}</li>
          </ul>
        </div>
      </HelpModal>
    </main>
  );
}