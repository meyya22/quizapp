import { useState } from 'react';
import { X, Check, Minus, Crown, Zap, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import api from '../services/api';
import toast from 'react-hot-toast';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

type Plan = 'MONTHLY' | 'YEARLY';

const features: { label: string; free: string | boolean; paid: string | boolean }[] = [
  { label: 'Categories', free: '5 max', paid: 'Unlimited' },
  { label: 'Quizzes', free: '5 max', paid: '50 total max' },
  { label: 'Questions per quiz', free: '10 max', paid: '100 max' },
  { label: 'Publish & share quizzes', free: true, paid: true },
  { label: 'Quiz translation (6 languages)', free: true, paid: true },
  { label: 'Answer explanations', free: true, paid: true },
  { label: 'CSV / Excel import', free: true, paid: true },
  { label: 'Advanced analytics', free: false, paid: true },
  { label: 'Priority support', free: false, paid: true },
  { label: 'Custom branding', free: false, paid: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-slate-700">{value}</span>;
  }
  return value ? (
    <Check className="w-4 h-4 text-emerald-500 mx-auto" />
  ) : (
    <Minus className="w-4 h-4 text-slate-300 mx-auto" />
  );
}

export function UpgradeModal({ open, onClose, reason }: UpgradeModalProps) {
  const [plan, setPlan] = useState<Plan>('MONTHLY');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubscribe() {
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
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Upgrade to Paid</h2>
              {reason && <p className="text-sm text-amber-600 mt-0.5">{reason}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
            {/* Plan toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {(['MONTHLY', 'YEARLY'] as Plan[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold transition-colors ${
                    plan === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p === 'MONTHLY' ? (
                    'Monthly — $5/mo'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Yearly — $50/yr
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${plan === 'YEARLY' ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-700'}`}>
                        -16%
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Feature table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left text-sm font-medium text-slate-500 px-5 py-3 w-1/2">Feature</th>
                    <th className="text-center px-5 py-3 w-1/4">
                      <span className="text-sm font-semibold text-slate-600">Free</span>
                    </th>
                    <th className="text-center px-5 py-3 w-1/4 bg-blue-50">
                      <div className="flex items-center justify-center gap-1.5">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-semibold text-blue-700">Paid</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {features.map((f) => (
                    <tr key={f.label} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-slate-700">{f.label}</td>
                      <td className="px-5 py-3 text-center"><Cell value={f.free} /></td>
                      <td className="px-5 py-3 text-center bg-blue-50/50"><Cell value={f.paid} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paid plan highlight */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span className="font-bold text-lg">Paid Plan</span>
                </div>
                <p className="text-blue-100 text-sm">Up to 50 quizzes, 100 questions/quiz, unlimited categories</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{plan === 'MONTHLY' ? '$5' : '$50'}</p>
                <p className="text-blue-200 text-xs">{plan === 'MONTHLY' ? 'per month' : 'per year'}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 space-y-3">
            <Button
              loading={loading}
              onClick={handleSubscribe}
              className="w-full justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              size="lg"
            >
              <Zap className="w-4 h-4" />
              Subscribe — {plan === 'MONTHLY' ? '$5/month' : '$50/year'}
            </Button>
            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={onClose}>Maybe later</Button>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Secure</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
