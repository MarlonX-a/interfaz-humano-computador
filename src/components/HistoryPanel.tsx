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
    toast.success(t('history.cleared') || 'History cleared');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className={`text-xl font-semibold`}>{t('history.title')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={clearHistory} className="p-2 rounded bg-red-600 text-white">{t('history.clear')}</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="all">{t('history.filters.actionAll') || 'All actions'}</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="all">{t('history.filters.authorAll') || 'All authors'}</option>
          {authors.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="all">{t('history.filters.typeAll') || 'All types'}</option>
          {types.map((tpe) => <option key={tpe} value={tpe}>{tpe}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('history.filters.search') || 'Search...'} className="border rounded px-2 py-1" />
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="border rounded px-2 py-1" />
        <input value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" className="border rounded px-2 py-1" />
      </div>

      <div className="overflow-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="p-2">{t('history.table.action') || 'Action'}</th>
              <th className="p-2">{t('history.table.title') || 'Title'}</th>
              <th className="p-2">{t('history.table.author') || 'Author'}</th>
              <th className="p-2">{t('history.table.type') || 'Type'}</th>
              <th className="p-2">{t('history.table.when') || 'When'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={h.id} className={`${i === selectedIndex ? "bg-gray-100" : ""} hover:bg-gray-50 cursor-pointer`} onClick={() => setSelectedIndex(i)}>
                <td className="p-2">{h.action}</td>
                <td className="p-2">{h.snapshot?.title}</td>
                <td className="p-2">{h.snapshot?.author}</td>
                <td className="p-2">{h.snapshot?.type}</td>
                <td className="p-2">{new Date(h.at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
