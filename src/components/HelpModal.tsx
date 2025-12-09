import { useEffect } from "react";
import type { ReactNode } from "react";

export default function HelpModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-20 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title ?? "Ayuda / Atajos"}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">✕</button>
        </div>
        <div className="space-y-3 text-sm">{children ?? (
          <>
            <p className="font-medium">Atajos de teclado generales</p>
            <ul className="list-disc ml-5">
              <li><strong>Ctrl + B</strong>: Abrir / cerrar la barra lateral</li>
              <li><strong>Ctrl + H</strong>: Alternar modo alto contraste</li>
              <li><strong>Ctrl + + / Ctrl + -</strong>: Aumentar / reducir tamaño de texto</li>
              <li><strong>Ctrl + R</strong>: Recargar</li>
            </ul>

            <p className="font-medium">Navegación</p>
            <ul className="list-disc ml-5">
              <li><strong>Escape</strong>: Cerrar modales / overlays</li>
              <li><strong>Tab</strong>: Navegar entre controles</li>
            </ul>
          </>
        )}</div>
      </div>
    </div>
  );
}
