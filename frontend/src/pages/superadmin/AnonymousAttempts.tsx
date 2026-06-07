import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Trash2, CheckCircle, XCircle, MapPin, Monitor, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface SubjectStat {
  subject: string;
  category: string;
  count: number;
}

interface AnonymousAttempt {
  id: string;
  eventType: string;
  quizId: string | null;
  quizTitle: string | null;
  adminCategory: string | null;
  examCategory: string | null;
  examSubCategory: string | null;
  score: number | null;
  passed: boolean | null;
  city: string | null;
  country: string | null;
  device: string | null;
  createdAt: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AnonymousAttempts() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: statsData } = useQuery<{ stats: SubjectStat[] }>({
    queryKey: ['anonymous-attempts-stats'],
    queryFn: () => api.get('/users/anonymous-attempts/stats').then((r) => r.data),
    staleTime: 60_000,
  });

  const topSubjects = statsData?.stats ?? [];
  const maxCount = topSubjects.length > 0 ? topSubjects[0].count : 1;

  const { data, isLoading } = useQuery<{
    attempts: AnonymousAttempt[];
    total: number;
    pages: number;
    pageSize: number;
  }>({
    queryKey: ['anonymous-attempts', page, pageSize],
    queryFn: () =>
      api.get(`/users/anonymous-attempts?page=${page}&pageSize=${pageSize}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const attempts = data?.attempts ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: (ids?: string[]) =>
      api.delete('/users/anonymous-attempts', { data: ids && ids.length ? { ids } : {} }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anonymous-attempts'] });
      setSelected(new Set());
      toast.success('Deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const allPageSelected = attempts.length > 0 && attempts.every((a) => selected.has(a.id));

  function toggleAll() {
    if (allPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        attempts.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        attempts.forEach((a) => next.add(a.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected record${selected.size !== 1 ? 's' : ''}?`)) return;
    deleteMutation.mutate([...selected]);
  }

  function handleDeleteAll() {
    if (!confirm(`Delete all ${total} anonymous attempt records? This cannot be undone.`)) return;
    deleteMutation.mutate(undefined);
  }

  function handlePageSize(s: number) {
    setPageSize(s);
    setPage(1);
    setSelected(new Set());
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-violet-600" />
          <h1 className="text-xl font-bold text-slate-900">Track Anonymous Attempts</h1>
        </div>
        <p className="text-sm text-slate-500">Quiz attempts by visitors who haven't signed up</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total Attempts</p>
          <p className="text-2xl font-bold text-slate-800">{total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Page</p>
          <p className="text-2xl font-bold text-slate-800">{page} / {pages}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Selected</p>
          <p className="text-2xl font-bold text-slate-800">{selected.size}</p>
        </div>
      </div>

      {/* Top 5 Subjects Chart */}
      {topSubjects.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-700">Top 5 Subjects by Attempts</h2>
          </div>
          <div className="space-y-3">
            {topSubjects.map((s, i) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-800 truncate">{s.subject}</span>
                    <span className="shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{s.category}</span>
                  </div>
                  <span className="text-sm font-bold text-violet-700 ml-3 shrink-0">{s.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${(s.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rows per page:</span>
          {PAGE_SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handlePageSize(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                pageSize === s ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size} selected
            </button>
          )}
          {total > 0 && (
            <button
              onClick={handleDeleteAll}
              disabled={deleteMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : attempts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No anonymous attempts recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="rounded text-violet-600"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quiz</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Device</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((a) => (
                  <tr key={a.id} className={`transition-colors ${selected.has(a.id) ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        onChange={() => toggleOne(a.id)}
                        className="rounded text-violet-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        a.eventType === 'click'
                          ? 'bg-violet-50 text-violet-700 border border-violet-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {a.eventType === 'click' ? 'Unlock clicked' : 'Quiz submitted'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">
                        {a.quizTitle ?? <span className="text-slate-300">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {a.examCategory ?? a.adminCategory ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {a.examSubCategory ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.score !== null ? (
                        <span className={`text-sm font-bold ${a.score >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {a.score.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {a.passed === true ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Passed
                        </span>
                      ) : a.passed === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.city || a.country ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {[a.city, a.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.device ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Monitor className="w-3 h-3 text-slate-400 shrink-0" />
                          {a.device}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            {total === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total} attempts
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-600">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
