import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

type HistoryItem = {
  id: string;
  action: string;
  at: string;
  snapshot: any;
};

export default function HistoryPanel() {
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
    setHistory(h.reverse()); // show latest first
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

  const clearHistory = () => {
    if (!confirm(t('history.confirmClear') || 'Clear history?')) return;
    localStorage.removeItem('tabla_maestra_history');
    setHistory([]);
    const msg = t('history.cleared') || 'History cleared';
    toast.success(msg);
    try { (window as any).triggerVisualAlert?.({ message: msg }); } catch (_) {}
    try { (window as any).speak?.(msg); } catch (_) {}
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-md shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v4a1 1 0 001 1h3m10 0h3a1 1 0 001-1V7m-5 10l4 4m0 0l-4-4m4 4H7" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-semibold`}>{t('history.title')}</h2>
            <p className="text-sm text-gray-500">{t('history.subtitle') || 'All changes and actions in your content'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500 mr-2">{filtered.length} {t('history.items') || 'items'}</div>
          <button onClick={() => { setActionFilter('all'); setAuthorFilter('all'); setTypeFilter('all'); setQuery(''); setStartDate(''); setEndDate(''); setSelectedIndex(-1); }} className="px-3 py-1 border rounded bg-white text-sm text-gray-700 hover:bg-gray-50">{t('history.resetFilters') || 'Reset'}</button>
          <button onClick={clearHistory} className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {t('history.clear')}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border bg-white shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mb-4">
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{t('history.filters.actionAll') || 'All actions'}</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{t('history.filters.authorAll') || 'All authors'}</option>
              {authors.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{t('history.filters.typeAll') || 'All types'}</option>
              {types.map((tpe) => <option key={tpe} value={tpe}>{tpe}</option>)}
            </select>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('history.filters.search') || 'Search...'} className="border rounded px-3 py-2 text-sm col-span-2 md:col-span-1" />
            <div className="flex gap-2">
              <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="border rounded px-3 py-2 text-sm" />
              <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="overflow-auto max-h-96">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{t('history.table.action') || 'Action'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{t('history.table.title') || 'Title'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{t('history.table.author') || 'Author'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{t('history.table.type') || 'Type'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{t('history.table.when') || 'When'}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">{t('history.noItems') || 'No history items found'}</td>
                  </tr>
                )}
                {filtered.map((h, i) => (
                  <tr
                    id={`history-row-${h.id}`}
                    key={h.id}
                    className={`cursor-pointer transition-colors duration-150 ${i === selectedIndex ? 'bg-indigo-50 border-l-4 border-indigo-400' : 'hover:bg-gray-50'} `}
                    onClick={() => { setSelectedIndex(i); try { (window as any).speak?.(`${h.action}: ${h.snapshot?.title}. ${h.snapshot?.description ?? ''}`); } catch (_) {} try { (window as any).triggerVisualAlert?.({ message: `${h.action}: ${h.snapshot?.title}`, highlightSelector: `#history-row-${h.id}` }); } catch (e) {} }}
                    title={h.snapshot?.description || h.snapshot?.title}
                  >
                    <td className="p-3 align-top text-sm text-indigo-700">{h.action}</td>
                    <td className="p-3 align-top text-sm font-medium">{h.snapshot?.title}</td>
                    <td className="p-3 align-top text-sm text-gray-600">{h.snapshot?.author}</td>
                    <td className="p-3 align-top text-sm text-gray-500">{h.snapshot?.type}</td>
                    <td className="p-3 align-top text-sm text-gray-500">{new Date(h.at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-80 rounded-lg border bg-white shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('history.preview') || 'Preview'}</h3>
          {selectedIndex === -1 || !filtered[selectedIndex] ? (
            <div className="text-sm text-gray-500">{t('history.previewEmpty') || 'Select an item to see details'}</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-indigo-600 font-semibold">{filtered[selectedIndex].action}</div>
              <div className="text-md font-bold">{filtered[selectedIndex].snapshot?.title}</div>
              <div className="text-sm text-gray-600">{filtered[selectedIndex].snapshot?.description}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="bg-gray-100 px-2 py-1 rounded">{filtered[selectedIndex].snapshot?.type}</div>
                <div className="bg-gray-100 px-2 py-1 rounded">{filtered[selectedIndex].snapshot?.author}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date(filtered[selectedIndex].at).toLocaleString()}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { const snapshot = filtered[selectedIndex].snapshot; toast(JSON.stringify(snapshot, null, 2), { duration: 4000 }); }} className="px-3 py-1 rounded border text-sm bg-indigo-600 text-white">{t('history.open') || 'Open'}</button>
                <button onClick={() => { const snapshot = filtered[selectedIndex].snapshot; try { (window as any).speak?.(`${snapshot?.title}. ${snapshot?.description ?? ''}`); } catch (_) {}; toast.success(t('history.reading') || 'Reading...'); }} className="px-3 py-1 rounded border text-sm bg-white">{t('history.read') || 'Read'}</button>
                <button onClick={() => { navigator.clipboard?.writeText(JSON.stringify(filtered[selectedIndex].snapshot, null, 2)); toast.success(t('history.copied') || 'Copied to clipboard'); }} className="px-3 py-1 rounded border text-sm bg-white">{t('history.copy') || 'Copy'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
