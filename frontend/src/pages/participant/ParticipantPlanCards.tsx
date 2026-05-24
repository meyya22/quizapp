import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, X, Zap, Crown, RefreshCw, BookOpenCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

export type ParticipantPlanKey = 'STARTER' | 'PREPREADY' | 'EXAMELITE';

interface PlanDef {
  key: ParticipantPlanKey;
  name: string;
  price: string;
  period: string;
  aiQuizzes: string;
  questions: string;
  maxQuestions: string;
  difficulties: string;
  badge?: string;
  badgeStyle: string;
  borderStyle: string;
  btnStyle: string;
  headerStyle: string;
}

const PLANS: PlanDef[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 'Free',
    period: '',
    aiQuizzes: '5 AI Generation (lifetime)',
    questions: '5 or 10',
    maxQuestions: 'Max 50 questions only',
    difficulties: 'Easy & Moderate',
    badgeStyle: '',
    borderStyle: 'border-slate-200',
    btnStyle: '',
    headerStyle: 'bg-slate-50',
  },
  {
    key: 'PREPREADY',
    name: 'PrepReady',
    price: '$4.99',
    period: '/mo',
    aiQuizzes: '45 AI Generation/mo',
    questions: '5, 10, or 15',
    maxQuestions: '525 questions, resets monthly',
    difficulties: 'Easy, Moderate & Difficult',
    badge: 'Best Value',
    badgeStyle: 'bg-violet-600 text-white',
    borderStyle: 'border-violet-500',
    btnStyle: 'bg-violet-600 hover:bg-violet-700 text-white',
    headerStyle: 'bg-violet-600',
  },
  {
    key: 'EXAMELITE',
    name: 'ExamElite',
    price: '$9.99',
    period: '/mo',
    aiQuizzes: '68 AI Generation/mo',
    questions: '5, 10, or 15',
    maxQuestions: '1020 questions, resets monthly',
    difficulties: 'Easy, Moderate & Difficult',
    badge: 'Premium',
    badgeStyle: 'bg-amber-500 text-white',
    borderStyle: 'border-amber-400',
    btnStyle: 'bg-amber-500 hover:bg-amber-600 text-white',
    headerStyle: 'bg-amber-500',
  },
];

interface FeatureRowProps {
  available: boolean;
  label: string;
}
function FeatureRow({ available, label }: FeatureRowProps) {
  return (
    <li className="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
      {available
        ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        : <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
      <span className={available ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
    </li>
  );
}

interface Props {
  currentPlan: ParticipantPlanKey;
}

export default function ParticipantPlanCards({ currentPlan }: Props) {
  const [buying, setBuying] = useState<ParticipantPlanKey | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'PREPREADY' | 'EXAMELITE') =>
      api.post('/payment/create-participant-checkout-session', { plan }).then((r) => r.data),
    onMutate: (plan) => setBuying(plan),
    onSuccess: (data: { url: string }) => { window.location.href = data.url; },
    onError: () => {
      setBuying(null);
      toast.error('Could not start checkout. Please try again.');
    },
  });

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
          <Crown className="w-3.5 h-3.5" /> XamGeni Plans
        </div>
        <h3 className="text-xl font-bold text-slate-900">Compare Plans</h3>
        <p className="text-sm text-slate-500 mt-1">Unlock more quizzes, difficulty levels, and monthly resets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          const isPaid = plan.key !== 'STARTER';
          const isUpgrade = isPaid && !isCurrent;

          return (
            <div
              key={plan.key}
              className={`relative border-2 rounded-2xl overflow-hidden flex flex-col transition-shadow ${plan.borderStyle} ${isCurrent ? 'shadow-lg' : 'shadow-sm'}`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${plan.badgeStyle}`}>
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-white">
                  Your Plan
                </span>
              )}

              {/* Header */}
              <div className={`px-5 pt-8 pb-4 ${isPaid ? plan.headerStyle : 'bg-slate-50'}`}>
                <p className={`font-bold text-base ${isPaid ? 'text-white' : 'text-slate-800'}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mt-1">
                  <span className={`text-3xl font-extrabold ${isPaid ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                  {plan.period && <span className={`text-sm mb-1 ${isPaid ? 'text-white/70' : 'text-slate-400'}`}>{plan.period}</span>}
                </div>
              </div>

              {/* Features */}
              <div className="px-5 py-4 flex-1 bg-white">
                <ul className="space-y-0.5 mb-4">
                  <li className="flex items-start gap-2 text-sm py-1 border-b border-slate-100">
                    <Zap className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-slate-800">{plan.aiQuizzes}</span>
                      <p className="text-xs text-slate-400">{plan.maxQuestions}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-2 text-sm py-1 border-b border-slate-100">
                    <BookOpenCheck className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-slate-700">{plan.questions} questions/quiz</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm py-1 border-b border-slate-100">
                    <Crown className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-slate-700">{plan.difficulties}</span>
                  </li>
                  <FeatureRow available={isPaid} label="Monthly reset" />
                  <FeatureRow available={isPaid} label="PDF export" />
                  <FeatureRow available={isPaid} label="Study mode" />
                  <FeatureRow available={isPaid} label="All difficulty levels" />
                </ul>
              </div>

              {/* Button */}
              <div className="px-5 pb-5 bg-white">
                {isCurrent ? (
                  <div className="w-full py-2.5 text-center text-sm font-semibold text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    Current Plan
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => checkoutMutation.mutate(plan.key as 'PREPREADY' | 'EXAMELITE')}
                    disabled={!!buying}
                    className={`w-full py-2.5 font-semibold rounded-xl text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${plan.btnStyle}`}
                  >
                    {buying === plan.key ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Redirecting…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Get {plan.name}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-2.5 text-center text-xs text-slate-400">
                    Free forever
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Secure checkout powered by Stripe · Cancel anytime
      </p>
    </div>
  );
}
