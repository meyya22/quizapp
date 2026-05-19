import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Trophy, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { Category, Quiz, QuizAttempt } from '../../types';
import { useAuthStore } from '../../store/authStore';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ParticipantDashboard() {
  const user = useAuthStore((s) => s.user);

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data: myAttempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ['my-attempts'],
    queryFn: () => api.get('/attempts/my').then((r) => r.data),
  });

  const attemptsByQuiz = new Map<string, QuizAttempt>(
    myAttempts.map((a) => [a.quizId, a])
  );

  const quizzesByCategory = quizzes.reduce<Record<string, Quiz[]>>((acc, quiz) => {
    const catId = quiz.categoryId;
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(quiz);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="text-slate-500 mt-1">Choose a quiz to test your knowledge.</p>
      </div>

      {myAttempts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent Attempts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAttempts.slice(0, 3).map((attempt) => (
              <Link
                key={attempt.id}
                to={`/participant/results/${attempt.id}`}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
              >
                <p className="font-medium text-slate-900 text-sm line-clamp-1">
                  {attempt.quiz?.title}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {attempt.score.toFixed(0)}%
                  </span>
                  <Badge variant={attempt.passed ? 'success' : 'danger'}>
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">{formatDate(attempt.completedAt)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

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
        <div className="space-y-8">
          {categories
            .filter((cat) => quizzesByCategory[cat.id]?.length > 0)
            .map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">{cat.name}</h2>
                  <span className="text-sm text-slate-400">
                    ({quizzesByCategory[cat.id].length} quiz{quizzesByCategory[cat.id].length !== 1 ? 'zes' : ''})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quizzesByCategory[cat.id].map((quiz) => {
                    const attempt = attemptsByQuiz.get(quiz.id);
                    return (
                      <div
                        key={quiz.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{quiz.title}</h3>
                          {quiz.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                              {quiz.description}
                            </p>
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
                            <div className="flex items-center gap-2">
                              <Badge variant={attempt.passed ? 'success' : 'danger'}>
                                {attempt.passed ? 'Passed' : 'Failed'} {attempt.score.toFixed(0)}%
                              </Badge>
                            </div>
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
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
