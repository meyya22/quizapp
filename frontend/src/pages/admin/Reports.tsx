import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BarChart3, FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
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
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface PagedAttempts {
  attempts: QuizAttempt[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const nums: (number | '...')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      nums.push(i);
    } else if (nums[nums.length - 1] !== '...') {
      nums.push('...');
    }
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {nums.map((n, i) =>
        n === '...' ? (
          <span key={`e-${i}`} className="px-1 text-slate-400 text-sm">…</span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n as number)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${
              n === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {n}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pages}
        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Reports() {
  const [search, setSearch] = useState('');
  const [quizFilter, setQuizFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setPage(1); }, [quizFilter, search]);

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: pagedData, isLoading } = useQuery<PagedAttempts>({
    queryKey: ['all-attempts', quizFilter, search, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams();
      if (quizFilter) params.append('quizId', quizFilter);
      if (search) params.append('search', search);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      return api.get(`/attempts/all?${params}`).then((r) => r.data);
    },
  });

  const attempts = pagedData?.attempts ?? [];
  const total = pagedData?.total ?? 0;
  const totalPages = pagedData?.pages ?? 1;

  const quizOptions = [
    { value: '', label: 'All Quizzes' },
    ...quizzes.map((q) => ({ value: q.id, label: q.title })),
  ];

  async function fetchAllForExport(): Promise<QuizAttempt[]> {
    const params = new URLSearchParams();
    if (quizFilter) params.append('quizId', quizFilter);
    if (search) params.append('search', search);
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
    } finally {
      setExporting(false);
    }
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
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">View all participant quiz attempts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 text-red-500" />
            PDF
          </button>
          {exporting && (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by participant name or email..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            options={quizOptions}
            value={quizFilter}
            onChange={(e) => setQuizFilter(e.target.value)}
          />
        </div>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
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
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Score</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900 text-sm">
                        {attempt.user?.name ?? attempt.participantName ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {attempt.user?.email ?? attempt.participantEmail ?? ''}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{attempt.quiz?.title}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-900">
                        {attempt.score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={attempt.passed ? 'success' : 'danger'}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatTime(attempt.timeTaken)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {formatDate(attempt.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-slate-500">
              {total} attempt{total !== 1 ? 's' : ''} total — showing page {page} of {totalPages}
            </p>
            <Pagination page={page} pages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
