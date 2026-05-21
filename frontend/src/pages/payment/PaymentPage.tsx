import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, ArrowLeft, BookOpen, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

type Plan = 'MONTHLY' | 'YEARLY';

const PLANS: Record<Plan, { price: string; period: string; note: string; monthly: string }> = {
  MONTHLY: {
    price: '$5',
    period: '/month',
    note: 'Billed monthly',
    monthly: '$5/mo',
  },
  YEARLY: {
    price: '$50',
    period: '/year',
    note: 'Save 16% — billed annually',
    monthly: '$4.17/mo',
  },
};

const features = [
  '50 quizzes total',
  '100 questions per quiz',
  'Unlimited categories',
  '2,000 quiz responses per month (resets monthly)',
  '500 contacts & 500 emails per month',
  'Custom email composer with preview',
  'CSV / Excel import',
  'Generate Q&A with AI — 25 times/month (max 10 questions each)',
  'Quiz translation (6 languages)',
  'Study mode for participants',
  'Advanced analytics & reports — export Excel & PDF',
  'Cancel anytime',
];

export default function PaymentPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [plan, setPlan] = useState<Plan>('MONTHLY');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/payment' } });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/payment/create-checkout-session', { plan });
      window.location.href = data.url;
    } catch {
      toast.error('Could not start checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">Xam Bridge</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="w-5 h-5 text-amber-300" />
              <span className="font-bold text-xl">Upgrade to Paid</span>
            </div>
            <p className="text-blue-100 text-sm">Unlock all features with a single subscription</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Plan toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {(['MONTHLY', 'YEARLY'] as Plan[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors relative ${
                    plan === p
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p === 'MONTHLY' ? 'Monthly' : (
                    <span className="flex items-center justify-center gap-2">
                      Yearly
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${plan === 'YEARLY' ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-700'}`}>
                        -16%
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Price display */}
            <div className="text-center py-2">
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-bold text-slate-900">{PLANS[plan].price}</span>
                <span className="text-slate-500 mb-2">{PLANS[plan].period}</span>
              </div>
              <p className="text-sm text-slate-400 mt-1">{PLANS[plan].note}</p>
              {plan === 'YEARLY' && (
                <p className="text-xs text-emerald-600 font-medium mt-0.5">≈ {PLANS[plan].monthly}</p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              size="lg"
              loading={loading}
              onClick={handleSubscribe}
              className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Zap className="w-4 h-4" />
              Subscribe {plan === 'MONTHLY' ? '$5/month' : '$50/year'}
            </Button>

            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Secure checkout</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Cancel anytime</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mx-auto mt-5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  );
}
