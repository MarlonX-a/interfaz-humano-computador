import { useHistoryPanel } from '@/shared/hooks/useHistoryPanel';
import {
  Clock,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  Eye,
  Volume2,
  Copy,
  Calendar,
  User,
  Tag,
  Zap,
  FileText,
  ChevronRight,
  Inbox,
} from 'lucide-react';

const actionColors: Record<string, { bg: string; text: string; dot: string }> = {
  create: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  update: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  delete: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  publish: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  archive: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

function getActionStyle(action: string) {
  const key = Object.keys(actionColors).find((k) => action?.toLowerCase().includes(k));
  return key ? actionColors[key] : { bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HistoryPanel() {
  const hook = useHistoryPanel();
  const selected = hook.selectedIndex >= 0 ? hook.filtered[hook.selectedIndex] : null;

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-200">
            <Clock size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{hook.t('history.title')}</h1>
            <p className="text-sm text-gray-500">{hook.t('history.subtitle') || 'Track all changes and actions in your content'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            {hook.filtered.length} {hook.t('history.items') || 'items'}
          </span>
          <button
            onClick={hook.resetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <RotateCcw size={14} />
            {hook.t('history.resetFilters') || 'Reset'}
          </button>
          <button
            onClick={hook.clearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 border border-red-200 transition-colors"
          >
            <Trash2 size={14} />
            {hook.t('history.clear')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-600">{hook.t('history.filters.title') || 'Filters'}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={hook.query}
              onChange={(e) => hook.setQuery(e.target.value)}
              placeholder={hook.t('history.filters.search') || 'Search by title or description...'}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
            />
          </div>
          {/* Action */}
          <div className="relative">
            <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={hook.actionFilter}
              onChange={(e) => hook.setActionFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{hook.t('history.filters.actionAll') || 'All actions'}</option>
              {hook.actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Author */}
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={hook.authorFilter}
              onChange={(e) => hook.setAuthorFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{hook.t('history.filters.authorAll') || 'All authors'}</option>
              {hook.authors.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {/* Type */}
          <div className="relative">
            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={hook.typeFilter}
              onChange={(e) => hook.setTypeFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{hook.t('history.filters.typeAll') || 'All types'}</option>
              {hook.types.map((tpe) => <option key={tpe} value={tpe}>{tpe}</option>)}
            </select>
          </div>
          {/* Date range */}
          <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
            <div className="relative flex-1">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={hook.startDate}
                onChange={(e) => hook.setStartDate(e.target.value)}
                type="date"
                className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <span className="self-center text-gray-400 text-xs">—</span>
            <div className="relative flex-1">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={hook.endDate}
                onChange={(e) => hook.setEndDate(e.target.value)}
                type="date"
                className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content area: Table + Preview */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[520px]">
            {hook.filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Inbox size={48} strokeWidth={1.5} className="mb-3 text-gray-300" />
                <p className="text-base font-medium text-gray-500">{hook.t('history.noItems') || 'No history items found'}</p>
                <p className="text-sm text-gray-400 mt-1">{hook.t('history.noItemsHint') || 'Try adjusting your filters'}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{hook.t('history.table.action') || 'Action'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{hook.t('history.table.title') || 'Title'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">{hook.t('history.table.author') || 'Author'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">{hook.t('history.table.type') || 'Type'}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{hook.t('history.table.when') || 'When'}</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hook.filtered.map((h, i) => {
                    const style = getActionStyle(h.action);
                    const isSelected = i === hook.selectedIndex;
                    return (
                      <tr
                        id={`history-row-${h.id}`}
                        key={h.id}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                            : 'border-l-4 border-l-transparent hover:bg-gray-50'
                        }`}
                        onClick={() => hook.selectRow(i)}
                      >
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                            {h.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{h.snapshot?.title}</div>
                          {h.snapshot?.description && (
                            <div className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">{h.snapshot.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                              {h.snapshot?.author?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="text-sm text-gray-600">{h.snapshot?.author}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-600 font-medium">
                            <FileText size={12} />
                            {h.snapshot?.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-500" title={new Date(h.at).toLocaleString()}>
                            {formatRelativeTime(h.at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight size={16} className={`transition-colors ${isSelected ? 'text-indigo-500' : 'text-gray-300'}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:w-80 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Eye size={16} className="text-indigo-500" />
              {hook.t('history.preview') || 'Preview'}
            </h3>

            {!selected ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                  <FileText size={24} className="text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">{hook.t('history.previewEmpty') || 'Select an item to see details'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action badge */}
                {(() => {
                  const style = getActionStyle(selected.action);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                      <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                      {selected.action}
                    </span>
                  );
                })()}

                {/* Title */}
                <h4 className="text-lg font-bold text-gray-900 leading-tight">{selected.snapshot?.title}</h4>

                {/* Description */}
                {selected.snapshot?.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{selected.snapshot.description}</p>
                )}

                {/* Meta tags */}
                <div className="flex flex-wrap gap-2">
                  {selected.snapshot?.type && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-600">
                      <Tag size={12} />
                      {selected.snapshot.type}
                    </span>
                  )}
                  {selected.snapshot?.author && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-xs font-medium text-gray-600">
                      <User size={12} />
                      {selected.snapshot.author}
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock size={12} />
                  {new Date(selected.at).toLocaleString(undefined, {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => hook.openSnapshot(hook.selectedIndex)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Eye size={14} />
                    {hook.t('history.open') || 'Open'}
                  </button>
                  <button
                    onClick={() => hook.readSnapshot(hook.selectedIndex)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    title={hook.t('history.read') || 'Read aloud'}
                  >
                    <Volume2 size={14} />
                  </button>
                  <button
                    onClick={() => hook.copySnapshot(hook.selectedIndex)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    title={hook.t('history.copy') || 'Copy'}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
