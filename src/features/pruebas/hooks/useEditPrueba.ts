import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { getPruebaCompleta, createPrueba, updatePrueba } from "@/features/pruebas/services/pruebas";
import { createPregunta, updatePregunta, deletePregunta } from "@/features/pruebas/services/preguntas";
import { createRespuesta, updateRespuesta, deleteRespuesta, createRespuestas } from "@/features/pruebas/services/respuestas";
import { supabase } from "@/shared/lib/supabaseClient";
import { listLecciones } from "@/features/lessons/services/lecciones";
import type {
  PruebaCompleta,
  PruebaInsert,
  PruebaUpdate,
  RespuestaInsert,
  Leccion,
} from "@/shared/types";

// ─────────────────────────────────────────────────────────────
// Tipos internos
// ─────────────────────────────────────────────────────────────

export interface PreguntaForm {
  id?: number;
  texto: string;
  tipo: string;
  orden: number;
  respuestas: RespuestaForm[];
}

export interface RespuestaForm {
  id?: number;
  texto: string;
  es_correcta: boolean;
  orden: number;
}

interface UseEditPruebaArgs {
  open: boolean;
  pruebaId: number | null;
  userId: string;
  defaultLeccionId?: number | null;
  onClose: () => void;
  onUpdated: () => void;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useEditPrueba({
  open,
  pruebaId,
  userId,
  defaultLeccionId,
  onClose,
  onUpdated,
}: UseEditPruebaArgs) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prueba, setPrueba] = useState<PruebaCompleta | null>(null);
  const [lecciones, setLecciones] = useState<Leccion[]>([]);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [leccion_id, setLeccionId] = useState<number | null>(null);
  const [tiempo_limite, setTiempoLimite] = useState<number | null>(null);
  const [puntaje_minimo, setPuntajeMinimo] = useState<number>(60);
  const [activa, setActiva] = useState(true);
  const [orden, setOrden] = useState<number>(0);

  // Preguntas state
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>([]);

  // ── Effects ──────────────────────────────────────────────

  useEffect(() => {
    if (open && pruebaId) {
      loadPrueba();
    } else if (open && !pruebaId) {
      resetForm();
      if (defaultLeccionId) {
        setLeccionId(defaultLeccionId);
      }
    }
    if (open) {
      loadLecciones();
    }
  }, [open, pruebaId, defaultLeccionId]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // ── Loaders ──────────────────────────────────────────────

  const loadPrueba = useCallback(async () => {
    if (!pruebaId) return;
    setLoading(true);
    try {
      const data = await getPruebaCompleta(pruebaId);
      setPrueba(data);
      setTitulo(data.titulo || "");
      setDescripcion(data.descripcion || "");
      setLeccionId(data.leccion_id);
      setTiempoLimite(data.tiempo_limite);
      setPuntajeMinimo(data.puntaje_minimo || 60);
      setActiva(data.activa ?? true);
      setOrden(data.orden || 0);

      setPreguntas(
        data.preguntas.map((p) => ({
          id: p.id,
          texto: p.texto,
          tipo: p.tipo || "opcion_multiple",
          orden: p.orden || 0,
          respuestas: p.respuestas.map((r) => ({
            id: r.id,
            texto: r.texto,
            es_correcta: r.es_correcta || false,
            orden: r.orden || 0,
          })),
        }))
      );
    } catch (error: any) {
      console.error("Error loading prueba:", error);
      toast.error(error?.message || t("teacher.pruebas.loadError") || "Error al cargar prueba");
    } finally {
      setLoading(false);
    }
  }, [pruebaId, t]);

  const loadLecciones = useCallback(async () => {
    try {
      const data = await listLecciones();
      const teacherLecciones = data.filter((l) => l.created_by === userId);
      setLecciones(teacherLecciones);
    } catch (error: any) {
      console.error("Error loading lecciones:", error);
    }
  }, [userId]);

  const resetForm = useCallback(() => {
    setTitulo("");
    setDescripcion("");
    setLeccionId(null);
    setTiempoLimite(null);
    setPuntajeMinimo(60);
    setActiva(true);
    setOrden(0);
    setPreguntas([]);
    setPrueba(null);
  }, []);

  // ── Pregunta handlers ────────────────────────────────────

  const addPregunta = useCallback(() => {
    setPreguntas((prev) => [
      ...prev,
      {
        texto: "",
        tipo: "opcion_multiple",
        orden: prev.length,
        respuestas: [
          { texto: "", es_correcta: false, orden: 0 },
          { texto: "", es_correcta: false, orden: 1 },
        ],
      },
    ]);
  }, []);

  const removePregunta = useCallback((index: number) => {
    setPreguntas((prev) => {
      const pregunta = prev[index];
      if (pregunta.id) {
        deletePregunta(pregunta.id).catch(console.error);
      }
      return prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, orden: i }));
    });
  }, []);

  const updatePreguntaField = useCallback(
    (index: number, field: string, value: any) => {
      setPreguntas((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const addRespuesta = useCallback((preguntaIndex: number) => {
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i === preguntaIndex
          ? {
              ...p,
              respuestas: [
                ...p.respuestas,
                { texto: "", es_correcta: false, orden: p.respuestas.length },
              ],
            }
          : p
      )
    );
  }, []);

  const removeRespuesta = useCallback(
    (preguntaIndex: number, respuestaIndex: number) => {
      setPreguntas((prev) => {
        const respuesta = prev[preguntaIndex]?.respuestas[respuestaIndex];
        if (respuesta?.id) {
          deleteRespuesta(respuesta.id).catch(console.error);
        }
        return prev.map((p, i) =>
          i === preguntaIndex
            ? {
                ...p,
                respuestas: p.respuestas
                  .filter((_, ri) => ri !== respuestaIndex)
                  .map((r, ri) => ({ ...r, orden: ri })),
              }
            : p
        );
      });
    },
    []
  );

  const updateRespuestaField = useCallback(
    (preguntaIndex: number, respuestaIndex: number, field: string, value: any) => {
      setPreguntas((prev) =>
        prev.map((p, i) =>
          i === preguntaIndex
            ? {
                ...p,
                respuestas: p.respuestas.map((r, ri) =>
                  ri === respuestaIndex ? { ...r, [field]: value } : r
                ),
              }
            : p
        )
      );
    },
    []
  );

  // ── Save handler ─────────────────────────────────────────

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!titulo.trim()) {
        toast.error(t("teacher.pruebas.validation.titleRequired") || "El título es requerido");
        return;
      }
      if (!leccion_id) {
        toast.error(t("teacher.pruebas.validation.leccionRequired") || "Selecciona una lección");
        return;
      }
      if (preguntas.length === 0) {
        toast.error(
          t("teacher.pruebas.validation.preguntasRequired") || "Agrega al menos una pregunta"
        );
        return;
      }

      // Validar preguntas
      for (let i = 0; i < preguntas.length; i++) {
        const p = preguntas[i];
        if (!p.texto.trim()) {
          toast.error(
            t("teacher.pruebas.validation.preguntaTextRequired", { num: i + 1 }) ||
              `La pregunta ${i + 1} debe tener texto`
          );
          return;
        }
        if (p.respuestas.length < 2) {
          toast.error(
            t("teacher.pruebas.validation.minRespuestas", { num: i + 1 }) ||
              `La pregunta ${i + 1} debe tener al menos 2 respuestas`
          );
          return;
        }
        if (!p.respuestas.some((r) => r.es_correcta)) {
          toast.error(
            t("teacher.pruebas.validation.correctaRequired", { num: i + 1 }) ||
              `La pregunta ${i + 1} debe tener al menos una respuesta correcta`
          );
          return;
        }
        for (let j = 0; j < p.respuestas.length; j++) {
          if (!p.respuestas[j].texto.trim()) {
            toast.error(
              t("teacher.pruebas.validation.respuestaTextRequired", {
                num: i + 1,
                resp: j + 1,
              }) || `La respuesta ${j + 1} de la pregunta ${i + 1} debe tener texto`
            );
            return;
          }
        }
      }

      setSaving(true);
      try {
        let currentPruebaId: number;

        if (pruebaId && pruebaId !== 0) {
          const payload: PruebaUpdate = {
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
            leccion_id,
            tiempo_limite: tiempo_limite || null,
            puntaje_minimo,
            activa,
            orden,
          };
          const updated = await updatePrueba(pruebaId, payload);
          currentPruebaId = updated.id;
        } else {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = (sessionData as any)?.session?.user?.id;
          const payload: PruebaInsert = {
            titulo: titulo.trim(),
            descripcion: descripcion.trim() || null,
            leccion_id: leccion_id!,
            tiempo_limite: tiempo_limite || null,
            puntaje_minimo,
            activa,
            orden,
            created_by: uid || null,
          };
          const created = await createPrueba(payload);
          currentPruebaId = created.id;
        }

        // Guardar preguntas y respuestas
        for (let i = 0; i < preguntas.length; i++) {
          const pregunta = preguntas[i];
          let preguntaId: number;

          if (pregunta.id) {
            const updated = await updatePregunta(pregunta.id, {
              texto: pregunta.texto.trim(),
              tipo: pregunta.tipo,
              prueba_id: currentPruebaId,
              orden: i,
            });
            preguntaId = updated.id;

            const existingRespuestas =
              prueba?.preguntas.find((p) => p.id === pregunta.id)?.respuestas || [];
            const currentRespuestaIds = pregunta.respuestas
              .filter((r) => r.id)
              .map((r) => r.id!);
            const respuestasToDelete = existingRespuestas.filter(
              (r) => !currentRespuestaIds.includes(r.id)
            );
            for (const r of respuestasToDelete) {
              await deleteRespuesta(r.id);
            }
          } else {
            const created = await createPregunta({
              texto: pregunta.texto.trim(),
              tipo: pregunta.tipo,
              prueba_id: currentPruebaId,
              leccion_id: null,
              orden: i,
            });
            preguntaId = created.id;
          }

          const respuestasToCreate: RespuestaInsert[] = [];
          for (let j = 0; j < pregunta.respuestas.length; j++) {
            const respuesta = pregunta.respuestas[j];
            if (respuesta.id) {
              await updateRespuesta(respuesta.id, {
                texto: respuesta.texto.trim(),
                es_correcta: respuesta.es_correcta,
                orden: j,
              });
            } else {
              respuestasToCreate.push({
                pregunta_id: preguntaId,
                texto: respuesta.texto.trim(),
                es_correcta: respuesta.es_correcta,
                orden: j,
              });
            }
          }
          if (respuestasToCreate.length > 0) {
            await createRespuestas(respuestasToCreate);
          }
        }

        toast.success(t("teacher.pruebas.saveSuccess") || "Prueba guardada correctamente");
        onUpdated();
        onClose();
      } catch (error: any) {
        console.error("Error saving prueba:", error);
        toast.error(
          error?.message || t("teacher.pruebas.saveError") || "Error al guardar prueba"
        );
      } finally {
        setSaving(false);
      }
    },
    [
      titulo, descripcion, leccion_id, tiempo_limite, puntaje_minimo,
      activa, orden, preguntas, pruebaId, prueba,
      onUpdated, onClose, t,
    ]
  );

  // ── Return ───────────────────────────────────────────────

  return {
    loading,
    saving,
    lecciones,
    prueba,

    // Form
    titulo, setTitulo,
    descripcion, setDescripcion,
    leccion_id, setLeccionId,
    tiempo_limite, setTiempoLimite,
    puntaje_minimo, setPuntajeMinimo,
    activa, setActiva,
    orden, setOrden,

    // Preguntas
    preguntas,
    addPregunta,
    removePregunta,
    updatePreguntaField,
    addRespuesta,
    removeRespuesta,
    updateRespuestaField,

    // Actions
    handleSave,
  };
}
