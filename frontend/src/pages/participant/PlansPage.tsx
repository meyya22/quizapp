import { useQuery } from '@tanstack/react-query';
import { Crown, Zap, CheckCircle, RefreshCw, FileDown, BookOpenCheck, BrainCircuit, PlusCircle } from 'lucide-react';
import api from '../../services/api';
import ParticipantPlanCards, { type ParticipantPlanKey } from './ParticipantPlanCards';

const PLAN_LABEL: Record<ParticipantPlanKey, string> = {
  STARTER: 'Starter',
  PREPREADY: 'PrepReady',
  EXAMELITE: 'ExamElite',
};

const PLAN_COLOR: Record<ParticipantPlanKey, string> = {
  STARTER: 'bg-slate-100 text-slate-700 border-slate-200',
  PREPREADY: 'bg-violet-100 text-violet-700 border-violet-200',
  EXAMELITE: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface CompareRow {
  label: string;
  icon: React.ReactNode;
  starter: React.ReactNode;
  prepready: React.ReactNode;
  examelite: React.ReactNode;
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: 'AI quiz generations',
    icon: <BrainCircuit className="w-4 h-4 text-violet-500" />,
    starter: '5 AI Generation (lifetime)',
    prepready: '45 AI Generation/mo',
    examelite: '68 AI Generation/mo',
  },
  {
    label: 'Questions per quiz',
    icon: <BookOpenCheck className="w-4 h-4 text-violet-500" />,
    starter: 'Up to 10 questions per quiz',
    prepready: 'Up to 15 questions per quiz',
    examelite: 'Up to 15 questions per quiz',
  },
  {
    label: 'Total questions',
    icon: <Zap className="w-4 h-4 text-violet-500" />,
    starter: 'Max 50 questions only',
    prepready: '525 questions, resets monthly',
    examelite: '1020 questions, resets monthly',
  },
  {
    label: 'Difficulty levels',
    icon: <Crown className="w-4 h-4 text-violet-500" />,
    starter: 'Easy & Moderate',
    prepready: 'Easy, Moderate & Difficult',
    examelite: 'Easy, Moderate & Difficult',
  },
  {
    label: 'Monthly reset',
    icon: <RefreshCw className="w-4 h-4 text-violet-500" />,
    starter: <span className="text-slate-300">—</span>,
    prepready: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
    examelite: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
  },
  {
    label: 'PDF export',
    icon: <FileDown className="w-4 h-4 text-violet-500" />,
    starter: <span className="text-slate-300">—</span>,
    prepready: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
    examelite: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
  },
  {
    label: 'Study mode',
    icon: <BookOpenCheck className="w-4 h-4 text-violet-500" />,
    starter: <span className="text-slate-300">—</span>,
    prepready: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
    examelite: <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />,
  },
  {
    label: 'Expand quiz (up to 100 Qs)',
    icon: <PlusCircle className="w-4 h-4 text-amber-500" />,
    starter: <span className="text-slate-300">—</span>,
    prepready: <span className="text-slate-300">—</span>,
    examelite: <span className="text-amber-600 font-semibold text-xs">ExamElite only</span>,
  },
];

export default function PlansPage() {
  const { data: historyData } = useQuery({
    queryKey: ['ai-quizzes'],
    queryFn: () => api.get('/ai-quiz').then((r) => r.data),
    staleTime: 30_000,
  });

  const currentPlan = (historyData?.plan ?? 'STARTER') as ParticipantPlanKey;
  const used = historyData?.used ?? 0;
  const limit = historyData?.limit ?? 5;
  const monthlyReset = historyData?.monthlyReset ?? false;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
          <BrainCircuit className="w-4 h-4" /> XamGeni Plans
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Choose Your Learning Plan</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Generate AI-powered quizzes on any topic. Start free, upgrade whenever you're ready.
        </p>
      </div>

      {/* Current plan status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Your Current Plan</p>
            <span className={`inline-flex items-center gap-1 text-sm font-bold border px-2.5 py-0.5 rounded-full mt-0.5 ${PLAN_COLOR[currentPlan]}`}>
              <Crown className="w-3.5 h-3.5" />
              {PLAN_LABEL[currentPlan]}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Quiz Slots Used</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5">
            {used} / {limit}
            <span className="text-xs font-normal text-slate-400 ml-1.5">{monthlyReset ? 'this month' : 'lifetime'}</span>
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mb-10">
        <ParticipantPlanCards currentPlan={currentPlan} />
      </div>

      {/* Feature comparison table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-base font-bold text-slate-900">Full Feature Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-1/3">Feature</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Starter</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-violet-600 uppercase tracking-wider bg-violet-50">PrepReady</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-amber-600 uppercase tracking-wider">ExamElite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COMPARE_ROWS.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <span className="text-sm text-slate-700">{row.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm text-slate-600">{row.starter}</td>
                  <td className="px-4 py-3.5 text-center text-sm font-medium text-violet-700 bg-violet-50">{row.prepready}</td>
                  <td className="px-4 py-3.5 text-center text-sm font-medium text-amber-700">{row.examelite}</td>
                </tr>
              ))}
              <tr className="bg-slate-50">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-violet-500" />
                    <span className="text-sm font-semibold text-slate-700">Price</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-center text-sm font-bold text-slate-800">Free</td>
                <td className="px-4 py-3.5 text-center text-sm font-bold text-violet-700 bg-violet-50">$4.99 / month</td>
                <td className="px-4 py-3.5 text-center text-sm font-bold text-amber-700">$9.99 / month</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="grid sm:grid-cols-3 gap-4 text-center">
        {[
          { icon: <RefreshCw className="w-5 h-5 text-violet-500 mx-auto mb-2" />, title: 'Cancel anytime', desc: 'No lock-in. Cancel your subscription at any time from your account settings.' },
          { icon: <CheckCircle className="w-5 h-5 text-violet-500 mx-auto mb-2" />, title: 'Secure checkout', desc: 'Payments are processed securely by Stripe. We never store your card details.' },
          { icon: <RefreshCw className="w-5 h-5 text-violet-500 mx-auto mb-2" />, title: 'Monthly resets', desc: 'Paid plan quiz slots reset at the start of every calendar month automatically.' },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-4">
            {item.icon}
            <p className="text-sm font-semibold text-slate-800 mb-1">{item.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
