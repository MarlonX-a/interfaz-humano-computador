import React, { useEffect } from 'react';

interface Props {
  message: string;
  onDone?: () => void;
  highlightSelector?: string;
}

export default function VisualAlert({ message, onDone, highlightSelector }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => { onDone && onDone(); }, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  useEffect(() => {
    if (!highlightSelector) return;
    try {
      const el = document.querySelector(highlightSelector) as HTMLElement | null;
      if (!el) return;
      const originalTransition = el.style.transition || '';
      el.classList.add('ring-4', 'ring-indigo-400', 'bg-indigo-50');
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const t = setTimeout(() => {
        el.classList.remove('ring-4', 'ring-indigo-400', 'bg-indigo-50');
        el.style.transition = originalTransition;
      }, 1500);
      return () => clearTimeout(t);
    } catch (e) {
      // ignore
    }
  }, [highlightSelector]);

  return (
    <div className="fixed top-4 right-4 z-50 p-3 bg-amber-100 border border-amber-300 text-amber-800 rounded-lg shadow-lg animate-pulse">
      {message}
    </div>
  );
}
