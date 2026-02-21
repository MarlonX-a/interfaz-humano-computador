import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import type { ReactNode } from "react";

export default function HelpModal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children?: ReactNode }) {
  const { t } = useTranslation();
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
          <h3 className="text-lg font-semibold">{title ?? t('help') + ' / ' + t('shortcuts')}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">✕</button>
        </div>
        <div className="space-y-3 text-sm">{children ?? (
          <>
            <p className="font-medium">{t('shortcuts')}</p>
            <ul className="list-disc ml-5">
              <li><strong>Ctrl + B</strong>: {t('shortcut.openSidebar') ?? 'Abrir / cerrar la barra lateral'}</li>
              <li><strong>Ctrl + H</strong>: {t('shortcut.toggleHighContrast') ?? 'Alternar modo alto contraste'}</li>
              <li><strong>Ctrl + + / Ctrl + -</strong>: {t('shortcut.adjustTextSize') ?? 'Aumentar / reducir tamaño de texto'}</li>
              <li><strong>Ctrl + R</strong>: {t('shortcut.reload') ?? 'Recargar'}</li>
            </ul>

            <p className="font-medium">{t('journey.navigation') ?? 'Navegación'}</p>
            <ul className="list-disc ml-5">
              <li><strong>Escape</strong>: {t('shortcut.closeModal') ?? 'Cerrar modales / overlays'}</li>
              <li><strong>Tab</strong>: {t('shortcut.tabNavigate') ?? 'Navegar entre controles'}</li>
            </ul>
          </>
        )}</div>
      </div>
    </div>
  );
}
