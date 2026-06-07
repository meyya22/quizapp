import { useQuery } from '@tanstack/react-query';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface TableStat {
  table: string;
  label: string;
  count: number;
}

interface DbInfoResponse {
  tables: TableStat[];
  totalRows: number;
  checkedAt: string;
}

function formatCount(n: number) {
  if (n === -1) return <span className="text-slate-300">—</span>;
  return n.toLocaleString();
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

export default function DbInfo() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useQuery<DbInfoResponse>({
    queryKey: ['db-info'],
    queryFn: () => api.get('/db-info').then((r) => r.data),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-rose-600" />
            DB Info
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Live row counts across all production tables</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-rose-500' : 'text-slate-400'}`} />
          Refresh
        </button>
      </div>

      {/* Last checked */}
      {dataUpdatedAt > 0 && data && (
        <p className="text-xs text-slate-400">
          Last checked: {formatTs(data.checkedAt)}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Failed to fetch database info. Check your connection.
        </div>
      )}

      {/* Table */}
      {data && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Summary bar */}
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-800">
              {data.tables.length} tables
            </span>
            <span className="text-sm font-bold text-rose-700">
              {data.totalRows.toLocaleString()} total rows
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Table</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.tables.map((t, i) => (
                <tr key={t.table} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-400">{t.table}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${t.count > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {formatCount(t.count)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Backups run automatically every 3 hours and are stored locally. Only the 3 most recent backups are kept.
      </p>
    </div>
  );
}
