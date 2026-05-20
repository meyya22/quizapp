import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { Quiz, QuizAttempt } from '../../types';
import { useAuthStore } from '../../store/authStore';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ParticipantDashboard() {
  const user = useAuthStore((s) => s.user);

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

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="text-slate-500 mt-1">Choose a quiz to test your knowledge.</p>
      </div>

      {/* Available Quizzes */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Quizzes</h2>
        {quizzesLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No quizzes available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => {
              const attempt = attemptsByQuiz.get(quiz.id);
              return (
                <div
                  key={quiz.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                      <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 pt-0.5">{quiz.category.name}</span>
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

      {/* Recent Attempts */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">My Attempts</h2>
        {attemptsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myAttempts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No attempts yet. Start a quiz above!</p>
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
                        attempt.passed
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {attempt.passed
                          ? <CheckCircle className="w-3 h-3" />
                          : <XCircle className="w-3 h-3" />}
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
    </div>
  );
}
