import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, Zap, ArrowLeft, Layers } from 'lucide-react';
import api from '../services/api';

interface ExamQuiz { id: string; isActive: boolean }
interface ExamSubCategory { quizzes: ExamQuiz[] }
interface ExamCategory { id: string; name: string; subCategories: ExamSubCategory[] }
interface CategoryPurchase { examCategoryId: string }

export default function UnlockExams() {
  const navigate = useNavigate();

  const { data: categories = [], isLoading: catLoading } = useQuery<ExamCategory[]>({
    queryKey: ['exam-content-public'],
    queryFn: () => api.get('/exam-content/public').then((r) => r.data),
    staleTime: 300_000,
  });

  const { data: purchases = [], isLoading: purchLoading } = useQuery<CategoryPurchase[]>({
    queryKey: ['category-purchases'],
    queryFn: () => api.get('/payment/razorpay/purchases').then((r) => r.data),
    staleTime: 60_000,
  });

  const purchasedIds = new Set(purchases.map((p) => p.examCategoryId));
  const isLoading = catLoading || purchLoading;

  const unlocked = categories.filter((c) => purchasedIds.has(c.id));
  const available = categories.filter((c) => !purchasedIds.has(c.id));

  function quizCount(cat: ExamCategory) {
    return cat.subCategories.reduce((n, s) => n + s.quizzes.filter((q) => q.isActive).length, 0);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Unlock More Exams</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Each category is ₹299 — one-time payment, unlimited access to all mock tests.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <>
            {/* Available to unlock */}
            {available.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Available to Unlock
                </h2>
                <div className="space-y-3">
                  {available.map((cat) => {
                    const count = quizCount(cat);
                    return (
                      <div
                        key={cat.id}
                        className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                          <Layers className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {count > 0 ? `${count} mock test${count !== 1 ? 's' : ''}` : 'Mock tests included'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() =>
                              navigate(`/checkout?categoryId=${encodeURIComponent(cat.id)}&categoryName=${encodeURIComponent(cat.name)}`)
                            }
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5" /> Pay ₹299
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {available.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-emerald-800">You've unlocked everything!</p>
                <p className="text-sm text-emerald-600 mt-1">All available exam categories are unlocked.</p>
              </div>
            )}

            {/* Already unlocked */}
            {unlocked.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Already Unlocked
                </h2>
                <div className="space-y-3">
                  {unlocked.map((cat) => {
                    const count = quizCount(cat);
                    return (
                      <div
                        key={cat.id}
                        className="bg-white rounded-xl border border-emerald-200 p-5 flex items-center gap-4 opacity-75"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900">{cat.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {count > 0 ? `${count} mock test${count !== 1 ? 's' : ''}` : 'Mock tests included'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                          Unlocked
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
