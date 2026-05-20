import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, BarChart3 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import api from '../../services/api';
import { Quiz, QuizAttempt } from '../../types';

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

export default function Reports() {
  const [search, setSearch] = useState('');
  const [quizFilter, setQuizFilter] = useState('');

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: attempts = [], isLoading } = useQuery<QuizAttempt[]>({
    queryKey: ['all-attempts', quizFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (quizFilter) params.append('quizId', quizFilter);
      if (search) params.append('search', search);
      return api.get(`/attempts/all?${params}`).then((r) => r.data);
    },
  });

  const quizOptions = [
    { value: '', label: 'All Quizzes' },
    ...quizzes.map((q) => ({ value: q.id, label: q.title })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm mt-1">View all participant quiz attempts</p>
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
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            {attempts.length} attempt{attempts.length !== 1 ? 's' : ''} found
          </div>
        </div>
      )}
    </div>
  );
}
