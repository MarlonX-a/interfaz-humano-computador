import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { getPruebaCompleta } from "@/features/pruebas/services/pruebas";
import { createResultadoPrueba } from "@/features/pruebas/services/resultados";
import { supabase } from "@/shared/lib/supabaseClient";
import type { PruebaCompleta } from "@/shared/types";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Format seconds into H:MM:SS or MM:SS */
export const formatTime = (seconds: number | null): string => {
  if (seconds === null || isNaN(seconds as any)) return "0:00";
  let s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  s = s % 3600;
  const minutes = Math.floor(s / 60);
  const secs = s % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface UseTakePruebaArgs {
  open: boolean;
  pruebaId: number;
  leccionId: number;
  seccionId?: number;
  onClose: () => void;
}

export interface ResultadoInfo {
  puntaje: number;
  total: number;
  aprobado: boolean;
  tiempoEmpleado: number;
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────

export function useTakePrueba({
  open,
  pruebaId,
  leccionId,
  seccionId,
  onClose,
}: UseTakePruebaArgs) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [prueba, setPrueba] = useState<PruebaCompleta | null>(null);
  const [respuestas, setRespuestas] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultado, setResultado] = useState<ResultadoInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Effects ──────────────────────────────────────────────

  useEffect(() => {
    if (open && pruebaId) {
      loadPrueba();
    }
  }, [open, pruebaId]);

  /** Timer countdown */
  useEffect(() => {
    if (open && prueba && prueba.tiempo_limite && startedAt && !submitted) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
        const remaining = prueba.tiempo_limite! * 60 - elapsed;

        if (remaining <= 0) {
          handleSubmit(true);
          return;
        }
        setTimeRemaining(remaining);
      };

      updateTimer();
      intervalRef.current = setInterval(updateTimer, 1000);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [open, prueba, startedAt, submitted]);

  /** Keyboard navigation */
  useEffect(() => {
    if (!open || submitted) return;

    const handler = (e: KeyboardEvent) => {
      if (reviewMode) return;
      if (e.key === "ArrowLeft") {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((i) =>
          prueba ? Math.min(prueba.preguntas.length - 1, i + 1) : i + 1
        );
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, submitted, reviewMode, prueba]);

  /** Reset on close */
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPrueba(null);
      setRespuestas({});
      setStartedAt(null);
      setTimeRemaining(null);
      setSubmitted(false);
      setResultado(null);
    }
  }, [open]);

  // ── Loaders ──────────────────────────────────────────────

  const loadPrueba = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPruebaCompleta(pruebaId);
      if (!data.activa) {
        toast.error(t("teacher.pruebas.notActive") || "Esta prueba no está activa");
        onClose();
        return;
      }
      if (!data.preguntas || data.preguntas.length === 0) {
        toast.error(t("teacher.pruebas.noQuestions") || "Esta prueba no tiene preguntas");
        onClose();
        return;
      }
      setPrueba(data);
      setStartedAt(new Date());
      setRespuestas({});
      setSubmitted(false);
      setResultado(null);
      if (data.tiempo_limite) {
        setTimeRemaining(data.tiempo_limite * 60);
      }
    } catch (error: any) {
      console.error("Error loading prueba:", error);
      toast.error(error?.message || t("teacher.pruebas.loadError") || "Error al cargar prueba");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [pruebaId, onClose, t]);

  // ── Helpers ──────────────────────────────────────────────

  const calculateScore = useCallback(() => {
    if (!prueba) return { correctas: 0, total: 0, porcentaje: 0 };
    let correctas = 0;
    const total = prueba.preguntas.length;

    prueba.preguntas.forEach((pregunta) => {
      const respuestaSeleccionada = respuestas[pregunta.id];
      if (respuestaSeleccionada) {
        const resp = pregunta.respuestas.find((r) => r.id === respuestaSeleccionada);
        if (resp?.es_correcta) correctas++;
      }
    });

    const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;
    return { correctas, total, porcentaje };
  }, [prueba, respuestas]);

  const handleAnswerChange = useCallback((preguntaId: number, respuestaId: number) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: respuestaId }));
  }, []);

  const allAnswered = useCallback(() => {
    if (!prueba) return false;
    return prueba.preguntas.every(
      (p) => respuestas[p.id] !== undefined && respuestas[p.id] !== null
    );
  }, [prueba, respuestas]);

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (submitted) return;
      if (!autoSubmit) {
        if (!prueba) return;
        if (!allAnswered()) {
          toast.error(
            t("teacher.pruebas.mustAnswerAll") ||
              "Debes responder todas las preguntas antes de enviar"
          );
          return;
        }
      }

      if (intervalRef.current) clearInterval(intervalRef.current);

      setSubmitted(true);
      const score = calculateScore();
      const tiempoEmpleado = startedAt
        ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
        : 0;
      const aprobado = score.porcentaje >= (prueba?.puntaje_minimo || 60);

      setResultado({ puntaje: score.porcentaje, total: score.total, aprobado, tiempoEmpleado });

      // Guardar resultado
      setSaving(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const usuarioId = (sessionData as any)?.session?.user?.id;

        if (usuarioId) {
          await createResultadoPrueba({
            prueba_id: pruebaId,
            usuario_id: usuarioId,
            puntaje_obtenido: score.porcentaje,
            puntaje_total: score.total,
            aprobado,
            tiempo_empleado: tiempoEmpleado,
            respuestas,
            started_at: startedAt?.toISOString() || null,
            completed_at: new Date().toISOString(),
          });

          // Marcar sección como completada
          if (aprobado && seccionId) {
            try {
              await supabase.from("progreso_seccion").upsert(
                {
                  user_id: usuarioId,
                  leccion_seccion_id: seccionId,
                  completado: true,
                  puntuacion: score.porcentaje,
                  intentos: 1,
                  fecha_completado: new Date().toISOString(),
                },
                { onConflict: "user_id,leccion_seccion_id" }
              );
            } catch (e) {
              console.error("Error updating progreso_seccion:", e);
            }
          } else if (seccionId) {
            try {
              const { data: progresoSeccion } = await supabase
                .from("progreso_seccion")
                .select("intentos")
                .eq("user_id", usuarioId)
                .eq("leccion_seccion_id", seccionId)
                .maybeSingle();

              await supabase.from("progreso_seccion").upsert(
                {
                  user_id: usuarioId,
                  leccion_seccion_id: seccionId,
                  completado: false,
                  puntuacion: score.porcentaje,
                  intentos: (progresoSeccion?.intentos || 0) + 1,
                },
                { onConflict: "user_id,leccion_seccion_id" }
              );
            } catch (e) {
              console.error("Error updating progreso_seccion intentos:", e);
            }
          }

          // Actualizar progreso de la lección
          const { data: progresoData } = await supabase
            .from("progreso")
            .select("id, puntaje")
            .eq("usuario_id", usuarioId)
            .eq("leccion_id", leccionId)
            .maybeSingle();

          if (progresoData) {
            await supabase
              .from("progreso")
              .update({
                puntaje: Math.max(progresoData.puntaje || 0, score.porcentaje),
                completado:
                  aprobado || progresoData.puntaje >= (prueba?.puntaje_minimo || 60),
              })
              .eq("id", progresoData.id);
          } else {
            await supabase.from("progreso").insert({
              usuario_id: usuarioId,
              leccion_id: leccionId,
              puntaje: score.porcentaje,
              completado: aprobado,
            });
          }
        }
      } catch (error: any) {
        console.error("Error saving resultado:", error);
        toast.error(
          error?.message ||
            t("teacher.pruebas.saveResultError") ||
            "Error al guardar resultado"
        );
      } finally {
        setSaving(false);
      }
    },
    [
      submitted, prueba, allAnswered, calculateScore, startedAt,
      respuestas, pruebaId, leccionId, seccionId, t,
    ]
  );

  // ── Return ───────────────────────────────────────────────

  return {
    loading,
    saving,
    prueba,
    respuestas,
    currentIndex,
    setCurrentIndex,
    reviewMode,
    setReviewMode,
    timeRemaining,
    submitted,
    resultado,

    // Handlers
    handleAnswerChange,
    allAnswered,
    handleSubmit,
    calculateScore,
  };
}
