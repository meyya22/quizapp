import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeOff, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight, MapPin, Monitor } from 'lucide-react';
import api from '../../services/api';
import { UserRecord } from '../../types';

interface PreviewSession {
  id: string;
  topic: string;
  score: number;
  passed: boolean;
  city: string | null;
  country: string | null;
  device: string | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

export default function AnonymousQuizTracker() {
  const [search, setSearch] = useState('');
  const [filterPassed, setFilterPassed] = useState<'all' | 'passed' | 'failed'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['preview-sessions'],
    queryFn: () => api.get('/users/preview-sessions').then((r) => r.data),
    staleTime: 30_000,
  });

  const sessions: PreviewSession[] = data?.sessions ?? [];

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.topic.toLowerCase().includes(q) ||
      (s.country ?? '').toLowerCase().includes(q) ||
      (s.city ?? '').toLowerCase().includes(q) ||
      (s.device ?? '').toLowerCase().includes(q);
    const matchPassed =
      filterPassed === 'all' ||
      (filterPassed === 'passed' && s.passed) ||
      (filterPassed === 'failed' && !s.passed);
    return matchSearch && matchPassed;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalPassed = sessions.filter((s) => s.passed).length;
  const totalFailed = sessions.length - totalPassed;
  const avgScore =
    sessions.length > 0
      ? (sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length).toFixed(1)
      : '—';

  const { data: usersData = [] } = useQuery<UserRecord[]>({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
    staleTime: 60_000,
  });

  const top5AnonCountries = (() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const c = s.country?.trim() || 'Unknown';
      counts[c] = (counts[c] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));
  })();

  const top5UserCountries = (() => {
    const counts: Record<string, number> = {};
    usersData
      .filter((u) => u.role === 'ADMIN' || u.role === 'PARTICIPANT')
      .forEach((u) => {
        const c = u.country?.trim() || 'Unknown';
        counts[c] = (counts[c] ?? 0) + 1;
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country, count]) => ({ country, count }));
  })();

  const maxAnon = Math.max(1, ...top5AnonCountries.map((d) => d.count));
  const maxUsers = Math.max(1, ...top5UserCountries.map((d) => d.count));

  const deviceCounts = (() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const d = s.device?.trim() || 'Unknown';
      counts[d] = (counts[d] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => ({ device, count }));
  })();

  const maxDevice = Math.max(1, ...deviceCounts.map((d) => d.count));

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleFilterChange(val: typeof filterPassed) {
    setFilterPassed(val);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <EyeOff className="w-5 h-5 text-rose-600" />
          <h1 className="text-xl font-bold text-slate-900">Track Anonymous Quiz</h1>
        </div>
        <p className="text-sm text-slate-500">XamGeni preview sessions completed by non-registered visitors</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sessions', value: sessions.length },
          { label: 'Passed', value: totalPassed },
          { label: 'Failed', value: totalFailed },
          { label: 'Avg Score', value: sessions.length ? `${avgScore}%` : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search topic, country, city, device…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'passed', 'failed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                filterPassed === f
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No sessions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Topic</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Device</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-slate-800">{s.topic}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`text-sm font-bold ${s.score >= 60 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {s.score.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {s.passed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {s.city || s.country ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {[s.city, s.country].filter(Boolean).join(', ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {s.device ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Monitor className="w-3 h-3 text-slate-400 shrink-0" />
                          {s.device}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString()}{' '}
                        {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {filtered.length} session{filtered.length !== 1 ? 's' : ''} · page {safePage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Country + device charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Anonymous quiz takers — Top 5 Countries */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Anonymous Quiz Takers</p>
              <p className="text-xs text-slate-400 mt-0.5">Top 5 Countries</p>
            </div>
            <EyeOff className="w-4 h-4 text-rose-400" />
          </div>
          {top5AnonCountries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {top5AnonCountries.map(({ country, count }) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-24 shrink-0 truncate">{country}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxAnon) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registered Users — Top 5 Countries */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Registered Users</p>
              <p className="text-xs text-slate-400 mt-0.5">Top 5 Countries (Admins + Participants)</p>
            </div>
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          {top5UserCountries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {top5UserCountries.map(({ country, count }) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-24 shrink-0 truncate">{country}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxUsers) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">Device Breakdown</p>
              <p className="text-xs text-slate-400 mt-0.5">Anonymous quiz sessions by device</p>
            </div>
            <Monitor className="w-4 h-4 text-emerald-400" />
          </div>
          {deviceCounts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
          ) : (
            <div className="space-y-3">
              {deviceCounts.map(({ device, count }) => (
                <div key={device} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{device}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${(count / maxDevice) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
