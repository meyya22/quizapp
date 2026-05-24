import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, ChevronRight, Trophy, CheckCircle, XCircle,
  UserCircle, Search, ClipboardList,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { Quiz, QuizAttempt } from '../../types';
import { useAuthStore } from '../../store/authStore';

type Section = 'quizzes' | 'attempts';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ParticipantDashboard() {
  const user = useAuthStore((s) => s.user);
  const [activeSection, setActiveSection] = useState<Section>('quizzes');
  const [search, setSearch] = useState('');

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: myAttempts = [], isLoading: attemptsLoading } = useQuery<QuizAttempt[]>({
    queryKey: ['my-attempts'],
    queryFn: () => api.get('/attempts/my').then((r) => r.data),
  });

  const attemptsByQuiz = new Map<string, QuizAttempt>(
    myAttempts.map((a) => [a.quizId, a])
  );

  const filteredQuizzes = quizzes.filter((q) => {
    const term = search.toLowerCase();
    return (
      q.title.toLowerCase().includes(term) ||
      (q.description ?? '').toLowerCase().includes(term) ||
      q.category.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* ── Mobile tab bar (hidden on lg+) ───────────────────── */}
      <div className="lg:hidden w-full flex rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setActiveSection('quizzes')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            activeSection === 'quizzes' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Quizzes
          <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
            activeSection === 'quizzes' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {quizzes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSection('attempts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
            activeSection === 'attempts' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          My Attempts
          <span className={`text-xs rounded-full px-1.5 py-0.5 leading-none ${
            activeSection === 'attempts' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {myAttempts.length}
          </span>
        </button>
      </div>

      {/* ── Left Sidebar (hidden below lg) ───────────────────── */}
      <aside className="hidden lg:block w-52 shrink-0 sticky top-24">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* User card */}
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-blue-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400">Learner</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-2 space-y-0.5">
            <button
              onClick={() => setActiveSection('quizzes')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'quizzes'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Available Quizzes</span>
              <span className="ml-auto text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 leading-none">
                {quizzes.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSection('attempts')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'attempts'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>My Attempts</span>
              <span className="ml-auto text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 leading-none">
                {myAttempts.length}
              </span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-full">

        {/* Available Quizzes */}
        {activeSection === 'quizzes' && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Available Quizzes</h2>
                <p className="text-sm text-slate-500 mt-0.5">These quizzes are generated and published by other users</p>
              </div>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-56 bg-white"
                />
              </div>
            </div>

            {quizzesLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredQuizzes.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {search ? `No quizzes match "${search}"` : 'No quizzes available yet. Check back soon!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredQuizzes.map((quiz) => {
                  const attempt = attemptsByQuiz.get(quiz.id);
                  return (
                    <div
                      key={quiz.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                          <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 pt-0.5">
                            {quiz.category.name}
                          </span>
                        </div>
                        {quiz.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{quiz.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {quiz._count?.questions ?? 0} questions
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5" />
                            Pass: {quiz.passingScore}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                          <UserCircle className="w-3.5 h-3.5" />
                          <span>Created by {quiz.category.admin?.name ?? 'Unknown'}</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          Published {new Date(quiz.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        {attempt ? (
                          <Badge variant={attempt.passed ? 'success' : 'danger'}>
                            {attempt.passed ? 'Passed' : 'Failed'} {attempt.score.toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not attempted</span>
                        )}
                        <Link
                          to={`/participant/quiz/${quiz.id}`}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          {attempt ? 'Retake' : 'Start'}
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* My Attempts */}
        {activeSection === 'attempts' && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Attempts</h2>
            {attemptsLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myAttempts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No attempts yet. Start a quiz!</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="text-left px-5 py-3 font-medium text-slate-600">Quiz</th>
                        <th className="text-left px-5 py-3 font-medium text-slate-600">Category</th>
                        <th className="text-center px-5 py-3 font-medium text-slate-600">Score</th>
                        <th className="text-center px-5 py-3 font-medium text-slate-600">Result</th>
                        <th className="text-center px-5 py-3 font-medium text-slate-600">Time Taken</th>
                        <th className="text-left px-5 py-3 font-medium text-slate-600">Completed At</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {myAttempts.map((attempt, idx) => (
                        <tr
                          key={attempt.id}
                          className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                            idx % 2 === 0 ? '' : 'bg-slate-50/40'
                          }`}
                        >
                          <td className="px-5 py-3.5 font-medium text-slate-900">{attempt.quiz?.title ?? '—'}</td>
                          <td className="px-5 py-3.5 text-slate-500">{attempt.quiz?.category?.name ?? '—'}</td>
                          <td className="px-5 py-3.5 text-center font-semibold text-slate-900">{attempt.score.toFixed(0)}%</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              attempt.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {attempt.passed ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {attempt.passed ? 'Passed' : 'Failed'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center text-slate-500">{formatTime(attempt.timeTaken)}</td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(attempt.completedAt)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`/participant/results/${attempt.id}`}
                              className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
}
