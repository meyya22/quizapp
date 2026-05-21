import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, BarChart3, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Trophy, Users, CheckCircle, ChevronRight as ViewIcon,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import api from '../../services/api';
import { Quiz, QuizAttempt } from '../../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

interface PagedAttempts {
  attempts: QuizAttempt[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

interface QuizSummary {
  quizId: string;
  title: string;
  attempts: number;
  avgScore: number;
  passRate: number;
  passCount: number;
  lastAt: string;
}

type SortDir = 'asc' | 'desc' | null;
type ViewMode = 'flat' | 'grouped';

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active || !dir) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
  return dir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | '...')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) nums.push(i);
    else if (nums[nums.length - 1] !== '...') nums.push('...');
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {nums.map((n, i) =>
        n === '...'
          ? <span key={`e${i}`} className="px-1 text-slate-400 text-sm">…</span>
          : <button key={n} onClick={() => onChange(n as number)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${n === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {n}
            </button>
      )}
      <button onClick={() => onChange(page + 1)} disabled={page === pages}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Reports() {
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [search, setSearch] = useState('');
  const [quizFilter, setQuizFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortScore, setSortScore] = useState<SortDir>(null);
  const [sortDate, setSortDate] = useState<SortDir>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setPage(1); }, [quizFilter, search, sortScore, sortDate]);

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: pagedData, isLoading } = useQuery<PagedAttempts>({
    queryKey: ['all-attempts', quizFilter, search, page, pageSize, sortScore, sortDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (quizFilter) params.append('quizId', quizFilter);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (sortScore) { params.append('sortBy', 'score'); params.append('sortOrder', sortScore); }
      else if (sortDate) { params.append('sortBy', 'date'); params.append('sortOrder', sortDate); }
      return api.get(`/attempts/all?${params}`).then((r) => r.data);
    },
    enabled: viewMode === 'flat',
  });

  const { data: summary = [], isLoading: summaryLoading } = useQuery<QuizSummary[]>({
    queryKey: ['attempts-summary'],
    queryFn: () => api.get('/attempts/summary').then((r) => r.data),
    enabled: viewMode === 'grouped',
  });

  const attempts = pagedData?.attempts ?? [];
  const total = pagedData?.total ?? 0;
  const totalPages = pagedData?.pages ?? 1;

  const quizOptions = [
    { value: '', label: 'All Quizzes' },
    ...quizzes.map((q) => ({ value: q.id, label: q.title })),
  ];

  function toggleSortScore() {
    setSortDate(null);
    setSortScore((s) => s === null ? 'desc' : s === 'desc' ? 'asc' : null);
  }

  function toggleSortDate() {
    setSortScore(null);
    setSortDate((s) => s === null ? 'desc' : s === 'desc' ? 'asc' : null);
  }

  function drillIntoQuiz(quizId: string) {
    setQuizFilter(quizId);
    setViewMode('flat');
    setPage(1);
  }

  async function fetchAllForExport(): Promise<QuizAttempt[]> {
    const params = new URLSearchParams();
    if (quizFilter) params.append('quizId', quizFilter);
    if (search) params.append('search', search);
    if (sortScore) { params.append('sortBy', 'score'); params.append('sortOrder', sortScore); }
    else if (sortDate) { params.append('sortBy', 'date'); params.append('sortOrder', sortDate); }
    params.append('download', 'true');
    const { data } = await api.get(`/attempts/all?${params}`);
    return data as QuizAttempt[];
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      const rows = all.map((a) => ({
        'Participant': a.user?.name ?? a.participantName ?? '—',
        'Email': a.user?.email ?? a.participantEmail ?? '',
        'Quiz': a.quiz?.title ?? '',
        'Score': `${a.score.toFixed(1)}%`,
        'Status': a.passed ? 'Passed' : 'Failed',
        'Time Taken': formatTime(a.timeTaken),
        'Date': formatDate(a.completedAt),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reports');
      XLSX.writeFile(wb, 'quiz-reports.xlsx');
    } finally { setExporting(false); }
  }

  async function exportPDF() {
    setExporting(true);
    try {
      const all = await fetchAllForExport();
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Quiz Reports', 14, 15);
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`Generated ${new Date().toLocaleDateString()}  ·  ${all.length} records`, 14, 22);
      autoTable(doc, {
        startY: 28,
        head: [['Participant', 'Email', 'Quiz', 'Score', 'Status', 'Time', 'Date']],
        body: all.map((a) => [
          a.user?.name ?? a.participantName ?? '—',
          a.user?.email ?? a.participantEmail ?? '',
          a.quiz?.title ?? '',
          `${a.score.toFixed(1)}%`,
          a.passed ? 'Passed' : 'Failed',
          formatTime(a.timeTaken),
          formatDate(a.completedAt),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });
      doc.save('quiz-reports.pdf');
    } finally { setExporting(false); }
  }

  function exportSummaryExcel() {
    const rows = summary.map((s) => ({
      Quiz: s.title,
      'Total Attempts': s.attempts,
      'Avg Score (%)': s.avgScore,
      'Pass Rate (%)': s.passRate,
      'Passed': s.passCount,
      'Failed': s.attempts - s.passCount,
      'Last Activity': formatDate(s.lastAt),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'By Quiz');
    XLSX.writeFile(wb, 'quiz-summary.xlsx');
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">View all participant quiz attempts</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'flat' ? (
            <>
              <button onClick={exportExcel} disabled={exporting || total === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
              </button>
              <button onClick={exportPDF} disabled={exporting || total === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                <FileText className="w-4 h-4 text-red-500" /> PDF
              </button>
            </>
          ) : (
            <button onClick={exportSummaryExcel} disabled={summary.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
            </button>
          )}
          {exporting && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        {(['flat', 'grouped'] as ViewMode[]).map((m) => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              viewMode === m
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {m === 'flat' ? 'All Attempts' : 'By Quiz'}
          </button>
        ))}
      </div>

      {/* ── FLAT VIEW ── */}
      {viewMode === 'flat' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by participant name or email..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="w-full sm:w-56">
              <Select options={quizOptions} value={quizFilter} onChange={(e) => setQuizFilter(e.target.value)} />
            </div>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {[10, 20, 30].map((n) => <option key={n} value={n}>Show {n}</option>)}
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No attempts found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Participant</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Quiz</th>
                      <th className="px-5 py-3">
                        <button onClick={toggleSortScore}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                          Score <SortIcon active={sortScore !== null} dir={sortScore} />
                        </button>
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                      <th className="px-5 py-3">
                        <button onClick={toggleSortDate}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                          Date <SortIcon active={sortDate !== null} dir={sortDate} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900 text-sm">{attempt.user?.name ?? attempt.participantName ?? '—'}</p>
                          <p className="text-xs text-slate-500">{attempt.user?.email ?? attempt.participantEmail ?? ''}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">{attempt.quiz?.title}</td>
                        <td className="px-5 py-4">
                          <span className={`text-sm font-semibold ${sortScore ? 'text-blue-700' : 'text-slate-900'}`}>
                            {attempt.score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={attempt.passed ? 'success' : 'danger'}>
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatTime(attempt.timeTaken)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDate(attempt.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-xs text-slate-500">{total} attempt{total !== 1 ? 's' : ''} total — page {page} of {totalPages}</p>
                <Pagination page={page} pages={totalPages} onChange={setPage} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── GROUPED / BY QUIZ VIEW ── */}
      {viewMode === 'grouped' && (
        <>
          {summaryLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : summary.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No attempts yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Quiz</th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        <span className="flex items-center justify-center gap-1"><Users className="w-3.5 h-3.5" /> Attempts</span>
                      </th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        <span className="flex items-center justify-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Avg Score</span>
                      </th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        <span className="flex items-center justify-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Pass Rate</span>
                      </th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        <span className="flex items-center justify-center gap-1"><Trophy className="w-3.5 h-3.5" /> Passed</span>
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Last Activity</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.map((s, idx) => {
                      const passColor = s.passRate >= 70 ? 'text-emerald-600' : s.passRate >= 40 ? 'text-amber-600' : 'text-red-500';
                      const scoreColor = s.avgScore >= 70 ? 'text-emerald-600' : s.avgScore >= 40 ? 'text-amber-600' : 'text-red-500';
                      return (
                        <tr key={s.quizId} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-sm font-bold text-slate-800">{s.attempts}</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-sm font-bold ${scoreColor}`}>{s.avgScore.toFixed(1)}%</span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-sm font-bold ${passColor}`}>{s.passRate}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${s.passRate >= 70 ? 'bg-emerald-400' : s.passRate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                                  style={{ width: `${s.passRate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-slate-600">
                            {s.passCount} / {s.attempts}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatDate(s.lastAt)}</td>
                          <td className="px-4 py-4">
                            <button onClick={() => drillIntoQuiz(s.quizId)}
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap">
                              View <ViewIcon className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                {summary.length} quiz{summary.length !== 1 ? 'zes' : ''} with attempts
                &nbsp;·&nbsp; {summary.reduce((sum, s) => sum + s.attempts, 0)} total attempts
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
