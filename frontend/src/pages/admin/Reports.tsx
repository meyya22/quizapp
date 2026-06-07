import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, BarChart3, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Trophy, Users, CheckCircle, ChevronRight as ViewIcon,
  X, CheckCircle2, XCircle, ClipboardList,
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import api from '../../services/api';
import { Quiz, QuizAttempt } from '../../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AttemptDetail {
  id: string;
  score: number;
  passed: boolean;
  timeTaken: number;
  completedAt: string;
  quiz: { title: string; passingScore: number };
  answers: {
    questionId: string;
    questionText: string;
    questionType: string;
    options: string[] | null;
    explanation: string | null;
    userAnswer: unknown;
    correctAnswer: unknown;
    isCorrect: boolean;
  }[];
}

function formatAnswer(value: unknown, type: string, options: string[] | null): string {
  if (value === null || value === undefined) return '— (no answer)';
  if (type === 'TRUE_FALSE') return String(value) === 'true' ? 'True' : 'False';
  if (type === 'MCQ' && options && typeof value === 'number') return options[value] ?? String(value);
  if (Array.isArray(value)) return value.map((v) => (options ? options[v as number] ?? v : v)).join(', ');
  return String(value);
}

function ReviewModal({ attemptId, participantName, onClose }: {
  attemptId: string;
  participantName: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useQuery<AttemptDetail>({
    queryKey: ['attempt-detail', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}`).then((r) => r.data),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Question Review</h2>
              <p className="text-xs text-slate-500">{participantName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {isLoading && (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isError && (
            <p className="text-center text-red-500 py-8">Could not load attempt details.</p>
          )}
          {data && (
            <>
              {/* Summary strip */}
              <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                <span className="text-slate-500">Quiz: <strong className="text-slate-800">{data.quiz.title}</strong></span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">Score: <strong className={data.passed ? 'text-emerald-600' : 'text-red-500'}>{data.score.toFixed(1)}%</strong></span>
                <span className="text-slate-400">·</span>
                <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${data.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {data.passed ? 'Passed' : 'Failed'}
                </span>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {data.answers.map((a, i) => (
                  <div key={a.questionId} className={`rounded-xl border p-4 ${a.isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/40'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${a.isCorrect ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {a.isCorrect
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <XCircle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Q{i + 1}</p>
                        <p className="text-sm font-medium text-slate-800 mb-3">{a.questionText}</p>

                        <div className="space-y-1.5 text-sm">
                          <div className={`flex items-start gap-2 px-3 py-2 rounded-lg ${a.isCorrect ? 'bg-emerald-100/60' : 'bg-red-100/60'}`}>
                            <span className="text-xs font-semibold text-slate-500 mt-0.5 w-24 flex-shrink-0">Their answer:</span>
                            <span className={`font-medium ${a.isCorrect ? 'text-emerald-800' : 'text-red-700'}`}>
                              {formatAnswer(a.userAnswer, a.questionType, a.options)}
                            </span>
                          </div>
                          {!a.isCorrect && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-slate-100/80">
                              <span className="text-xs font-semibold text-slate-500 mt-0.5 w-24 flex-shrink-0">Correct answer:</span>
                              <span className="font-medium text-slate-700">
                                {formatAnswer(a.correctAnswer, a.questionType, a.options)}
                              </span>
                            </div>
                          )}
                        </div>

                        {a.explanation && (
                          <div className="mt-2.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                            <p className="text-xs font-semibold text-amber-700 mb-0.5">Explanation</p>
                            <p className="text-xs text-amber-800 leading-relaxed">{a.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 flex-shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
  categoryName: string;
  attempts: number;
  avgScore: number;
  passRate: number;
  passCount: number;
  lastAt: string;
}

function TopQuizzesChart({ summary }: { summary: QuizSummary[] }) {
  const top8 = [...summary].sort((a, b) => b.attempts - a.attempts).slice(0, 8);
  if (top8.length === 0) return null;
  const max = Math.max(...top8.map((q) => q.attempts), 1);
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500',
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        Top 8 Quizzes by Attempts
      </h2>
      <div className="space-y-3">
        {top8.map((q, i) => {
          const pct = Math.round((q.attempts / max) * 100);
          const label = [q.categoryName, q.title].filter(Boolean).join(', ');
          return (
            <div key={q.quizId} className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 w-4 shrink-0 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-xs text-slate-700 truncate">{label}</span>
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    {q.attempts} attempt{q.attempts !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${colors[i]} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const [reviewAttempt, setReviewAttempt] = useState<{ id: string; name: string } | null>(null);

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
        'Category': a.quiz?.category?.name ?? '—',
        'Score': `${a.score.toFixed(1)}%`,
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
        head: [['Participant', 'Email', 'Quiz', 'Category', 'Score', 'Time', 'Date']],
        body: all.map((a) => [
          a.user?.name ?? a.participantName ?? '—',
          a.user?.email ?? a.participantEmail ?? '',
          a.quiz?.title ?? '',
          a.quiz?.category?.name ?? '—',
          `${a.score.toFixed(1)}%`,
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

      {/* Top 8 bar chart — always visible */}
      {summary.length > 0 && <TopQuizzesChart summary={summary} />}

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
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Category</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                      <th className="px-5 py-3">
                        <button onClick={toggleSortDate}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-800 transition-colors">
                          Date <SortIcon active={sortDate !== null} dir={sortDate} />
                        </button>
                      </th>
                      <th className="px-5 py-3" />
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
                        <td className="px-5 py-4 text-sm text-slate-700">{attempt.quiz?.category?.name ?? '—'}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatTime(attempt.timeTaken)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{formatDate(attempt.completedAt)}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setReviewAttempt({
                              id: attempt.id,
                              name: attempt.user?.name ?? attempt.participantName ?? 'Participant',
                            })}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap">
                            Review →
                          </button>
                        </td>
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

      {reviewAttempt && (
        <ReviewModal
          attemptId={reviewAttempt.id}
          participantName={reviewAttempt.name}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  );
}
