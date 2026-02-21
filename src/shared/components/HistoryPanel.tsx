import { useHistoryPanel } from '@/shared/hooks/useHistoryPanel';

export default function HistoryPanel() {
  const hook = useHistoryPanel();

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
            <h2 className={`text-xl font-semibold`}>{hook.t('history.title')}</h2>
            <p className="text-sm text-gray-500">{hook.t('history.subtitle') || 'All changes and actions in your content'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500 mr-2">{hook.filtered.length} {hook.t('history.items') || 'items'}</div>
          <button onClick={hook.resetFilters} className="px-3 py-1 border rounded bg-white text-sm text-gray-700 hover:bg-gray-50">{hook.t('history.resetFilters') || 'Reset'}</button>
          <button onClick={hook.clearHistory} className="px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            {hook.t('history.clear')}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 rounded-lg border bg-white shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center mb-4">
            <select value={hook.actionFilter} onChange={(e) => hook.setActionFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{hook.t('history.filters.actionAll') || 'All actions'}</option>
              {hook.actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={hook.authorFilter} onChange={(e) => hook.setAuthorFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{hook.t('history.filters.authorAll') || 'All authors'}</option>
              {hook.authors.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={hook.typeFilter} onChange={(e) => hook.setTypeFilter(e.target.value)} className="border rounded px-3 py-2 text-sm">
              <option value="all">{hook.t('history.filters.typeAll') || 'All types'}</option>
              {hook.types.map((tpe) => <option key={tpe} value={tpe}>{tpe}</option>)}
            </select>
            <input value={hook.query} onChange={(e) => hook.setQuery(e.target.value)} placeholder={hook.t('history.filters.search') || 'Search...'} className="border rounded px-3 py-2 text-sm col-span-2 md:col-span-1" />
            <div className="flex gap-2">
              <input value={hook.startDate} onChange={(e) => hook.setStartDate(e.target.value)} type="date" className="border rounded px-3 py-2 text-sm" />
              <input value={hook.endDate} onChange={(e) => hook.setEndDate(e.target.value)} type="date" className="border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="overflow-auto max-h-96">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{hook.t('history.table.action') || 'Action'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{hook.t('history.table.title') || 'Title'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{hook.t('history.table.author') || 'Author'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{hook.t('history.table.type') || 'Type'}</th>
                  <th className="p-3 text-xs font-medium text-gray-600 uppercase">{hook.t('history.table.when') || 'When'}</th>
                </tr>
              </thead>
              <tbody>
                {hook.filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">{hook.t('history.noItems') || 'No history items found'}</td>
                  </tr>
                )}
                {hook.filtered.map((h, i) => (
                  <tr
                    id={`history-row-${h.id}`}
                    key={h.id}
                    className={`cursor-pointer transition-colors duration-150 ${i === hook.selectedIndex ? 'bg-indigo-50 border-l-4 border-indigo-400' : 'hover:bg-gray-50'} `}
                    onClick={() => hook.selectRow(i)}
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
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{hook.t('history.preview') || 'Preview'}</h3>
          {hook.selectedIndex === -1 || !hook.filtered[hook.selectedIndex] ? (
            <div className="text-sm text-gray-500">{hook.t('history.previewEmpty') || 'Select an item to see details'}</div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-indigo-600 font-semibold">{hook.filtered[hook.selectedIndex].action}</div>
              <div className="text-md font-bold">{hook.filtered[hook.selectedIndex].snapshot?.title}</div>
              <div className="text-sm text-gray-600">{hook.filtered[hook.selectedIndex].snapshot?.description}</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="bg-gray-100 px-2 py-1 rounded">{hook.filtered[hook.selectedIndex].snapshot?.type}</div>
                <div className="bg-gray-100 px-2 py-1 rounded">{hook.filtered[hook.selectedIndex].snapshot?.author}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date(hook.filtered[hook.selectedIndex].at).toLocaleString()}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => hook.openSnapshot(hook.selectedIndex)} className="px-3 py-1 rounded border text-sm bg-indigo-600 text-white">{hook.t('history.open') || 'Open'}</button>
                <button onClick={() => hook.readSnapshot(hook.selectedIndex)} className="px-3 py-1 rounded border text-sm bg-white">{hook.t('history.read') || 'Read'}</button>
                <button onClick={() => hook.copySnapshot(hook.selectedIndex)} className="px-3 py-1 rounded border text-sm bg-white">{hook.t('history.copy') || 'Copy'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
