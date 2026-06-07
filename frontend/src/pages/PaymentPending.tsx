import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { BookOpen, IndianRupee, ArrowLeft, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const categoryId   = searchParams.get('categoryId') ?? '';
  const categoryName = searchParams.get('categoryName') ?? '';
  const displayName  = categoryName || 'All Subjects';

  async function handlePay() {
    if (!isAuthenticated) return;
    setLoading(true);

    if (categoryId) {
      sessionStorage.setItem('rzp_categoryId',   categoryId);
      sessionStorage.setItem('rzp_categoryName', categoryName);
      sessionStorage.setItem('rzp_userId',       user?.id ?? '');
    }

    try {
      const { data } = await api.post('/payment/razorpay/create-link', {
        examCategoryId: categoryId || undefined,
        categoryName:   categoryName || undefined,
      });
      window.location.href = data.url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setLoading(false);
    }
  }

  // Not logged in — prompt sign-in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
            </Link>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-slate-900 mb-2">Sign in to continue</h1>
            <p className="text-sm text-slate-500 mb-6">You need to be signed in to unlock exam categories.</p>
            <Link
              to={`/login?redirect=/checkout?categoryId=${encodeURIComponent(categoryId)}&categoryName=${encodeURIComponent(categoryName)}`}
              className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                <IndianRupee className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                Unlock {displayName} Mock Tests
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                One-time payment · All quizzes in {displayName} included
              </p>
            </div>

            {/* Feature list */}
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-2">
              {[
                `All mock tests in ${displayName}`,
                'Unlimited attempts',
                'Full question review & explanations',
                'AI Concept Study tool',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-bold text-slate-900">₹299</span>
              <span className="text-slate-400 text-sm">one-time</span>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Redirecting…</>
              ) : (
                <><Zap className="w-4 h-4" /> Pay ₹299</>
              )}
            </button>

            <p className="text-xs text-center text-slate-400 mt-4">
              Secured by Razorpay · UPI, cards, net banking &amp; wallets accepted
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
