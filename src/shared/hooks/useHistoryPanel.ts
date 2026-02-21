import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

type HistoryItem = {
  id: string;
  action: string;
  at: string;
  snapshot: any;
};

export function useHistoryPanel() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Filter state
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    const h = JSON.parse(localStorage.getItem('tabla_maestra_history') || '[]');
    setHistory(h.reverse());
  }, []);

  const authors = useMemo(() => Array.from(new Set(history.map((h) => h.snapshot?.author).filter(Boolean))), [history]);
  const types = useMemo(() => Array.from(new Set(history.map((h) => h.snapshot?.type).filter(Boolean))), [history]);
  const actions = useMemo(() => Array.from(new Set(history.map((h) => h.action).filter(Boolean))), [history]);

  const filtered = useMemo(() => {
    return history.filter((h) => {
      if (actionFilter !== 'all' && h.action !== actionFilter) return false;
      if (authorFilter !== 'all' && h.snapshot?.author !== authorFilter) return false;
      if (typeFilter !== 'all' && h.snapshot?.type !== typeFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!h.snapshot?.title?.toLowerCase().includes(q) && !h.snapshot?.description?.toLowerCase().includes(q)) return false;
      }
      if (startDate) {
        if (new Date(h.at) < new Date(startDate)) return false;
      }
      if (endDate) {
        if (new Date(h.at) > new Date(endDate)) return false;
      }
      return true;
    });
  }, [history, actionFilter, authorFilter, typeFilter, query, startDate, endDate]);

  // Keyboard nav for the table
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (filtered[selectedIndex]) {
          const snapshot = filtered[selectedIndex].snapshot;
          toast(JSON.stringify(snapshot, null, 2), { duration: 4000 });
          try { (window as any).speak?.(`${filtered[selectedIndex].action}: ${filtered[selectedIndex].snapshot?.title}. ${filtered[selectedIndex].snapshot?.description ?? ''}`); } catch (_) {}
          try { (window as any).triggerVisualAlert?.({ message: `${filtered[selectedIndex].action}: ${filtered[selectedIndex].snapshot?.title}`, highlightSelector: `#history-row-${filtered[selectedIndex].id}` }); } catch (e) {}
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selectedIndex]);

  const clearHistory = useCallback(() => {
    if (!confirm(t('history.confirmClear') || 'Clear history?')) return;
    localStorage.removeItem('tabla_maestra_history');
    setHistory([]);
    const msg = t('history.cleared') || 'History cleared';
    toast.success(msg);
    try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
    try { (window as any).speak?.(msg); } catch (_) {}
  }, [t]);

  const resetFilters = useCallback(() => {
    setActionFilter('all');
    setAuthorFilter('all');
    setTypeFilter('all');
    setQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedIndex(-1);
  }, []);

  const openSnapshot = useCallback((index: number) => {
    if (!filtered[index]) return;
    const snapshot = filtered[index].snapshot;
    toast(JSON.stringify(snapshot, null, 2), { duration: 4000 });
  }, [filtered]);

  const readSnapshot = useCallback((index: number) => {
    if (!filtered[index]) return;
    const snapshot = filtered[index].snapshot;
    try { (window as any).speak?.(`${snapshot?.title}. ${snapshot?.description ?? ''}`); } catch (_) {}
    toast.success(t('history.reading') || 'Reading...');
  }, [filtered, t]);

  const copySnapshot = useCallback((index: number) => {
    if (!filtered[index]) return;
    navigator.clipboard?.writeText(JSON.stringify(filtered[index].snapshot, null, 2));
    toast.success(t('history.copied') || 'Copied to clipboard');
  }, [filtered, t]);

  const selectRow = useCallback((index: number) => {
    setSelectedIndex(index);
    const h = filtered[index];
    if (!h) return;
    try { (window as any).speak?.(`${h.action}: ${h.snapshot?.title}. ${h.snapshot?.description ?? ''}`); } catch (_) {}
    try { (window as any).triggerVisualAlert?.({ message: `${h.action}: ${h.snapshot?.title}`, highlightSelector: `#history-row-${h.id}` }); } catch (e) {}
  }, [filtered]);

  return {
    t,
    history,
    actionFilter, setActionFilter,
    authorFilter, setAuthorFilter,
    typeFilter, setTypeFilter,
    query, setQuery,
    startDate, setStartDate,
    endDate, setEndDate,
    selectedIndex, setSelectedIndex,
    authors,
    types,
    actions,
    filtered,
    clearHistory,
    resetFilters,
    openSnapshot,
    readSnapshot,
    copySnapshot,
    selectRow,
  };
}
