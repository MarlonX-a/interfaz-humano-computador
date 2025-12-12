import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { updateContenido, getContenido, updateContenidoLecciones } from "../lib/data/contenidos";
import { supabase } from "../lib/supabaseClient";
import type { ContenidoConLecciones, ContenidoUpdate, Leccion } from "../types/db";
import CreateLessonModal from "./CreateLessonModal";
import { listLecciones } from "../lib/data/lecciones";

interface EditContenidoModalProps {
  open: boolean;
  onClose: () => void;
  contenidoId: number | null;
  onUpdated: () => void;
  userId: string;
}

type Difficulty = "fácil" | "media" | "difícil";

export default function EditContenidoModal({
  open,
  onClose,
  contenidoId,
  onUpdated,
  userId,
}: EditContenidoModalProps) {
  const { t } = useTranslation();
  const [contenido, setContenido] = useState<ContenidoConLecciones | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [editingLeccion, setEditingLeccion] = useState<Leccion | null>(null);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);
  const [pendingLecciones, setPendingLecciones] = useState<number[]>([]);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [texto_html, setTextoHtml] = useState("");
  const [type, setType] = useState("molecule");
  const [author, setAuthor] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("fácil");
  const [tags, setTags] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  const [selectedLeccionIds, setSelectedLeccionIds] = useState<number[]>([]);
  const [orden, setOrden] = useState<number | null>(null);

  // Tag input
  const [tagInput, setTagInput] = useState("");
  const [showTagsSuggestions, setShowTagsSuggestions] = useState(false);
  const [tagActiveIndex, setTagActiveIndex] = useState(-1);

  // Author suggestions
  const [authorSuggestions, setAuthorSuggestions] = useState<string[]>([]);
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const [authorActiveIndex, setAuthorActiveIndex] = useState(-1);
  const [filteredAuthorSuggestions, setFilteredAuthorSuggestions] = useState<string[]>([]);

  const modalRef = useRef<HTMLDivElement | null>(null);

  const defaultTags = ["reacción", "agua", "orgánica", "inorgánica", "síntesis", "experimental", "ácido", "base"];
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
    ],
    [t]
  );

  // Load contenido when modal opens
  useEffect(() => {
    if (open && contenidoId) {
      loadContenido();
      loadLecciones();
    }
  }, [open, contenidoId]);

  // Load author suggestions
  useEffect(() => {
    const loadAuthors = async () => {
      try {
        const { data } = await supabase.from('contenido').select('author').not('author', 'is', null);
        if (data) {
          const authors = Array.from(new Set(data.map((c: any) => c.author).filter(Boolean)));
          setAuthorSuggestions(authors as string[]);
        }
      } catch (err) {
        // ignore
      }
    };
    if (open) loadAuthors();
  }, [open]);

  const loadContenido = async () => {
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
      // Cargar IDs de lecciones asociadas
      setSelectedLeccionIds(data.lecciones?.map((l) => l.id) || []);
      setOrden(data.orden);
    } catch (error: any) {
      console.error("Error loading contenido:", error);
      toast.error(error?.message || t('teacher.contents.loadError') || 'Error al cargar contenido');
    } finally {
      setLoading(false);
    }
  };

  const loadLecciones = async () => {
    try {
      const data = await listLecciones();
      // Filter to only show lecciones created by this teacher
      const teacherLecciones = data.filter((l) => l.created_by === userId);
      setLecciones(teacherLecciones);
    } catch (error: any) {
      console.error("Error loading lecciones:", error);
    }
  };

  const handleLessonCreated = (newId: number) => {
    setPendingLecciones((prev) => [...prev, newId]);
    loadLecciones();
    // Agregar la nueva lección a las seleccionadas
    if (!selectedLeccionIds.includes(newId)) {
      setSelectedLeccionIds((prev) => [...prev, newId]);
    }
    const msg = t('createLesson.success.createdAndAssigned') || 'Lección creada y asignada';
    toast.success(msg);
  };

  const toggleLeccion = (leccionId: number) => {
    setSelectedLeccionIds((prev) => {
      if (prev.includes(leccionId)) {
        return prev.filter((id) => id !== leccionId);
      } else {
        return [...prev, leccionId];
      }
    });
  };

  const removeLeccion = (leccionId: number) => {
    setSelectedLeccionIds((prev) => prev.filter((id) => id !== leccionId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || titulo.trim().length < 3) {
      toast.error(t("addcontent.validation.titleRequired") || "El título es requerido");
      return;
    }

    if (selectedLeccionIds.length === 0) {
      toast.error(t("addcontent.validation.selectLessonRequired") || "Selecciona al menos una lección");
      return;
    }

    if (!contenidoId) return;

    setSaving(true);
    try {
      // Actualizar contenido
      const payload: ContenidoUpdate = {
        titulo: titulo.trim(),
        texto_html: texto_html || null,
        type: type || null,
        author: author || null,
        difficulty: difficulty || null,
        tags: tags.length > 0 ? tags : null,
        resources: resources.filter((r) => r.trim()).length > 0 ? resources.filter((r) => r.trim()) : null,
        orden: orden,
      };

      await updateContenido(contenidoId, payload);
      
      // Actualizar lecciones asociadas
      await updateContenidoLecciones(contenidoId, selectedLeccionIds);
      
      toast.success(t('addcontent.toast.updateSuccess') || 'Contenido actualizado correctamente');
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error("Error saving contenido:", error);
      toast.error(error?.message || t('addcontent.toast.updateError') || 'Error al actualizar contenido');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const v = tag.trim();
    if (!v || tags.includes(v)) return;
    setTags((prev) => [...prev, v]);
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const addResource = () => {
    setResources((prev) => [...prev, ""]);
  };

  const removeResource = (idx: number) => {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  };

  const setResource = (idx: number, val: string) => {
    setResources((prev) => prev.map((r, i) => (i === idx ? val : r)));
  };

  const handleTagInputChange = (val: string) => {
    setTagInput(val);
    const q = val.trim().toLowerCase();
    if (!q) {
      setShowTagsSuggestions(false);
      setTagActiveIndex(-1);
      return;
    }
    setShowTagsSuggestions(filteredTagSuggestions.length > 0);
    setTagActiveIndex(0);
  };

  const insertTagSuggestion = (tag: string) => {
    addTag(tag);
    setShowTagsSuggestions(false);
    setTagActiveIndex(-1);
  };

  const handleAuthorChange = (val: string) => {
    setAuthor(val);
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

  const insertAuthorSuggestion = (suggestion: string) => {
    setAuthor(suggestion);
    setShowAuthorSuggestions(false);
    setAuthorActiveIndex(-1);
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
      if (filteredAuthorSuggestions[authorActiveIndex]) {
        insertAuthorSuggestion(filteredAuthorSuggestions[authorActiveIndex]);
      }
    } else if (e.key === "Escape") {
      setShowAuthorSuggestions(false);
    }
  };

  // Reset form when modal closes
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

  // Focus first input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        try {
          modalRef.current?.querySelector<HTMLInputElement>("input")?.focus();
        } catch (e) {}
      }, 50);
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const inputClass = "w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-black";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-contenido-title"
          className="mx-4 w-full max-w-3xl max-h-[90vh] rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h3 id="edit-contenido-title" className="text-xl font-bold text-white">
              ✏️ {t('teacher.contents.editContent') || 'Editar Contenido'}
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              {t('teacher.contents.editContentDescription') || 'Modifica los campos del contenido'}
            </p>
            <button
              aria-label={t('close') || 'Cerrar'}
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                {t('loading') || 'Cargando...'}
              </div>
            ) : (
              <>
                {/* Lecciones (múltiples) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("teacher.contents.lessons") || "Lecciones"} <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Lecciones seleccionadas */}
                  {selectedLeccionIds.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {selectedLeccionIds.map((leccionId) => {
                        const leccion = lecciones.find((l) => l.id === leccionId) || 
                                       contenido?.lecciones?.find((l) => l.id === leccionId);
                        if (!leccion) return null;
                        return (
                          <div
                            key={leccionId}
                            className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {leccion.thumbnail_url && (
                                <img
                                  src={leccion.thumbnail_url}
                                  alt={leccion.titulo}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{leccion.titulo}</h4>
                                {leccion.descripcion && (
                                  <p className="text-sm text-gray-600 line-clamp-1">{leccion.descripcion}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const l = lecciones.find((x) => x.id === leccionId) ?? null;
                                  setEditingLeccion(l);
                                  setShowCreateLessonModal(true);
                                }}
                                className="px-3 py-1.5 text-sm rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                              >
                                {t('teacher.edit') || 'Editar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeLeccion(leccionId)}
                                className="px-3 py-1.5 text-sm rounded bg-red-100 text-red-800 hover:bg-red-200"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selector de lecciones disponibles */}
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                    {lecciones.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {t('teacher.contents.noLessonsAvailable') || 'No hay lecciones disponibles'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {lecciones.map((leccion) => {
                          const isSelected = selectedLeccionIds.includes(leccion.id);
                          return (
                            <label
                              key={leccion.id}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                                isSelected ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLeccion(leccion.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">{leccion.titulo}</span>
                                {leccion.descripcion && (
                                  <p className="text-xs text-gray-500 line-clamp-1">{leccion.descripcion}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Botón crear nueva lección */}
                  <button
                    type="button"
                    onClick={() => { setEditingLeccion(null); setShowCreateLessonModal(true); }}
                    className="mt-3 w-full px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>+</span>
                    <span>{t("addcontent.form.createLesson") || "Crear nueva lección"}</span>
                  </button>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.title") || "Título"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.description") || "Descripción"}
                  </label>
                  <textarea
                    className={inputClass}
                    value={texto_html}
                    onChange={(e) => setTextoHtml(e.target.value)}
                    rows={5}
                  />
                </div>

                {/* Tipo y Autor */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.type") || "Tipo"}
                    </label>
                    <select
                      className={inputClass}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      {typeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.author") || "Autor"}
                    </label>
                    <input
                      className={inputClass}
                      value={author}
                      onChange={(e) => handleAuthorChange(e.target.value)}
                      onKeyDown={handleAuthorKeyDown}
                    />
                    {showAuthorSuggestions && filteredAuthorSuggestions.length > 0 && (
                      <div className="absolute left-0 z-20 bg-white border rounded mt-1 p-2 flex gap-2 max-w-full overflow-auto shadow-lg">
                        {filteredAuthorSuggestions.map((a, i) => (
                          <button
                            key={a}
                            type="button"
                            className={`px-3 py-1 rounded-full ${i === authorActiveIndex ? 'bg-gray-200' : 'bg-gray-100'}`}
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

                {/* Dificultad y Orden */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("addcontent.form.difficulty") || "Dificultad"}
                    </label>
                    <select
                      className={inputClass}
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    >
                      <option value="fácil">{t("addcontent.form.difficultyOptions.easy") || "Fácil"}</option>
                      <option value="media">{t("addcontent.form.difficultyOptions.medium") || "Media"}</option>
                      <option value="difícil">{t("addcontent.form.difficultyOptions.hard") || "Difícil"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('teacher.contents.order') || 'Orden'}
                    </label>
                    <input
                      type="number"
                      className={inputClass}
                      value={orden ?? ""}
                      onChange={(e) => setOrden(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.tags") || "Etiquetas"}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <span key={tag} className="bg-blue-200 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          className="text-xs hover:text-red-600"
                          onClick={() => removeTag(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    className={inputClass}
                    value={tagInput}
                    onChange={(e) => handleTagInputChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (showTagsSuggestions && filteredTagSuggestions[tagActiveIndex]) {
                          insertTagSuggestion(filteredTagSuggestions[tagActiveIndex]);
                        } else {
                          addTag(tagInput);
                        }
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        setTagActiveIndex((i) => Math.min(i + 1, filteredTagSuggestions.length - 1));
                      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        setTagActiveIndex((i) => Math.max(i - 1, 0));
                      }
                    }}
                    placeholder={t('teacher.contents.addTag') || 'Escribe y presiona Enter para agregar'}
                  />
                  {showTagsSuggestions && filteredTagSuggestions.length > 0 && (
                    <div className="mt-2 flex gap-2 items-center flex-wrap">
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

                {/* Recursos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("addcontent.form.resources") || "Recursos"}
                  </label>
                  {resources.map((r, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        className={inputClass}
                        value={r}
                        onChange={(e) => setResource(i, e.target.value)}
                        placeholder="https://..."
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700 px-3"
                        onClick={() => removeResource(i)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                    onClick={addResource}
                  >
                    {t("addcontent.form.addResource") || "+ Agregar recurso"}
                  </button>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                    onClick={onClose}
                  >
                    {t('createLesson.buttons.cancel') || 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        {t('createLesson.buttons.updating') || 'Actualizando...'}
                      </span>
                    ) : (
                      t("addcontent.form.update") || "Actualizar"
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Modal de crear/editar lección */}
      <CreateLessonModal
        open={showCreateLessonModal}
        onClose={() => { setShowCreateLessonModal(false); setEditingLeccion(null); }}
        onCreated={handleLessonCreated}
        onUpdated={() => {
          loadLecciones();
          setEditingLeccion(null);
          const msg = t('createLesson.success.updated') || 'Lección actualizada';
          toast.success(msg);
        }}
        parentLeccionId={selectedLeccionIds.length > 0 ? selectedLeccionIds[0] : null}
        leccion={editingLeccion}
      />
    </>
  );
}

