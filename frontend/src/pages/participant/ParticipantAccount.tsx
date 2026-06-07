import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Crown, CreditCard, Calendar, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, ExternalLink, FileText, XCircle, Zap,
  BookOpen, RotateCcw, IndianRupee, ChevronDown, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { ParticipantPlanKey } from './ParticipantPlanCards';
import type { Quiz, QuizAttempt } from '../../types';

const PLAN_LABEL: Record<ParticipantPlanKey, string> = {
  STARTER: 'Starter',
  PREPREADY: 'PrepReady',
  EXAMELITE: 'ExamElite',
};

const PLAN_PRICE: Record<ParticipantPlanKey, string> = {
  STARTER: 'Free',
  PREPREADY: '$4.99 / month',
  EXAMELITE: '$9.99 / month',
};

const PLAN_BADGE: Record<ParticipantPlanKey, string> = {
  STARTER: 'bg-slate-100 text-slate-600',
  PREPREADY: 'bg-violet-100 text-violet-700',
  EXAMELITE: 'bg-amber-100 text-amber-700',
};

interface CategoryPurchaseRecord {
  id: string;
  examCategoryId: string;
  categoryName: string;
  paymentId: string | null;
  orderId: string | null;
  paymentMethod: string | null;
  amountPaise: number | null;
  purchasedAt: string;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  plan: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string } | null;
}

interface Invoice {
  id: string;
  amountPaid: number;
  currency: string;
  status: string;
  date: string;
  invoiceUrl: string | null;
  description: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
      <Clock className="w-3 h-3" /> Canceling
    </span>
  );
  if (status === 'active') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
      <CheckCircle2 className="w-3 h-3" /> Active
    </span>
  );
  if (status === 'past_due') return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
      <AlertTriangle className="w-3 h-3" /> Past Due
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
    </span>
  );
}

export default function ParticipantAccount() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  const { data: compQuiz } = useQuery<Quiz>({
    queryKey: ['quiz', user?.complimentaryQuizId],
    queryFn: () => api.get(`/quizzes/${user!.complimentaryQuizId}`).then((r) => r.data),
    enabled: !!user?.complimentaryQuizId,
    staleTime: 300_000,
  });

  const { data: myAttempts = [] } = useQuery<QuizAttempt[]>({
    queryKey: ['attempts-my'],
    queryFn: () => api.get('/attempts/my').then((r) => r.data),
    staleTime: 30_000,
  });

  // Group all attempts by quizId, sorted by most recent attempt per group
  const attemptGroups = (() => {
    const map = new Map<string, { title: string; categoryName: string; attempts: typeof myAttempts }>();
    for (const a of myAttempts) {
      const title = a.quiz?.title ?? (a.quizId === user?.complimentaryQuizId && compQuiz ? compQuiz.title : 'Quiz');
      const categoryName = a.quiz?.category?.name ?? compQuiz?.category?.name ?? '';
      if (!map.has(a.quizId)) map.set(a.quizId, { title, categoryName, attempts: [] });
      map.get(a.quizId)!.attempts.push(a);
    }
    // Sort each group newest first, then sort groups by most recent attempt
    return [...map.entries()]
      .map(([quizId, g]) => ({
        quizId,
        ...g,
        attempts: [...g.attempts].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()),
      }))
      .sort((a, b) => new Date(b.attempts[0].completedAt).getTime() - new Date(a.attempts[0].completedAt).getTime());
  })();

  const { data: purchases = [] } = useQuery<CategoryPurchaseRecord[]>({
    queryKey: ['category-purchases'],
    queryFn: () => api.get('/payment/razorpay/purchases').then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo | null>({
    queryKey: ['subscription'],
    queryFn: () => api.get('/payment/subscription').then((r) => r.data),
    enabled: user?.tier === 'PAID' && purchases.length === 0,
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => api.get('/payment/invoices').then((r) => r.data),
    enabled: user?.tier === 'PAID' && purchases.length === 0,
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.post('/payment/cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setCancelConfirm(false);
      toast.success('Subscription will cancel at the end of the billing period.');
    },
    onError: () => toast.error('Failed to cancel. Please try again.'),
  });

  const reactivateMutation = useMutation({
    mutationFn: () => api.post('/payment/reactivate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Subscription reactivated!');
    },
    onError: () => toast.error('Failed to reactivate. Please try again.'),
  });

  const isPaid = user?.tier === 'PAID';
  const hasAnyPurchase = purchases.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        <p className="text-slate-500 mt-1">Your profile and subscription details</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-lg font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-sm text-slate-500 truncate">{user?.email}</p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            hasAnyPurchase ? 'bg-emerald-100 text-emerald-700' : isPaid ? PLAN_BADGE['EXAMELITE'] : PLAN_BADGE['STARTER']
          }`}>
            {hasAnyPurchase ? (
              <><CheckCircle2 className="w-3 h-3" /> {purchases.length} {purchases.length === 1 ? 'Category' : 'Categories'} Unlocked</>
            ) : isPaid ? (
              <><Crown className="w-3 h-3" /> Premium</>
            ) : (
              <><Crown className="w-3 h-3" /> Free</>
            )}
          </span>
        </div>
      </div>

      {/* Past Attempt History */}
      {myAttempts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Past Attempt History</h2>
          <div className="divide-y divide-slate-100">
            {attemptGroups.map((group) => {
              const isOpen = expandedQuizId === group.quizId;
              const latest = group.attempts[0];
              return (
                <div key={group.quizId}>
                  <button
                    onClick={() => setExpandedQuizId(isOpen ? null : group.quizId)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 transition-colors -mx-1 px-1 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{group.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.categoryName && <span>{group.categoryName} · </span>}
                        {group.attempts.length} attempt{group.attempts.length !== 1 ? 's' : ''} · Last: {latest.score.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${latest.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {latest.passed ? 'Passed' : 'Failed'}
                      </span>
                      {isOpen
                        ? <ChevronDown className="w-4 h-4 text-slate-400" />
                        : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="pb-3 pl-11">
                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left px-3 py-2 font-semibold text-slate-500">#</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-500">Score</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-500">Result</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-500">Date &amp; Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {group.attempts.map((attempt, idx) => (
                              <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-400">{group.attempts.length - idx}</td>
                                <td className="px-3 py-2 font-semibold text-slate-900">{attempt.score.toFixed(1)}%</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${attempt.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                    {attempt.passed ? '✓ Passed' : '✗ Failed'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-500">
                                  {new Date(attempt.completedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {myAttempts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Past Attempt History</h2>
          <p className="text-sm text-slate-400 flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" /> No attempts yet — start a mock test to see your history here.
          </p>
        </div>
      )}

      {/* Category purchases */}
      {purchases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">My Purchases</h2>
          <div className="space-y-0 divide-y divide-slate-100">
            {purchases.map((p) => (
              <div key={p.id} className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{p.categoryName} — All Mock Tests</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(p.purchasedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {p.paymentMethod && (
                        <span className="ml-2 capitalize bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs font-medium">
                          {p.paymentMethod}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-900">
                      ₹{p.amountPaise ? (p.amountPaise / 100).toFixed(0) : '299'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" /> Unlocked
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlock more exams CTA */}
      {(hasAnyPurchase || !!user?.complimentaryQuizId) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">Want to unlock other exams?</p>
            <p className="text-xs text-slate-400 mt-0.5">Each category ₹299 · one-time payment</p>
          </div>
          <button
            onClick={() => navigate('/unlock-exams')}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" /> Click here
          </button>
        </div>
      )}

      {/* Upgrade CTA for free users without a complimentary quiz */}
      {!isPaid && !user?.complimentaryQuizId && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-700 mb-3">Are you interested in unlocking all the mock test in any exam?</p>
          <button
            onClick={() => navigate('/unlock-exams')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Zap className="w-4 h-4" /> View Plan
          </button>
        </div>
      )}

      {/* Subscription details (Stripe subscribers only, not Razorpay category buyers) */}
      {isPaid && !hasAnyPurchase && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subscription</h2>

          {subLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : subscription ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Plan</p>
                  <p className="font-semibold text-slate-900">
                    {PLAN_LABEL[subscription.plan as ParticipantPlanKey] ?? subscription.plan} — {PLAN_PRICE[subscription.plan as ParticipantPlanKey] ?? ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Status</p>
                  <StatusBadge status={subscription.status} cancelAtPeriodEnd={subscription.cancelAtPeriodEnd} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wider">
                    {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Renewal'}
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                </div>
                {subscription.paymentMethod && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Payment Method</p>
                    <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      {subscription.paymentMethod.brand.charAt(0).toUpperCase() + subscription.paymentMethod.brand.slice(1)}{' '}
                      •••• {subscription.paymentMethod.last4}
                    </div>
                  </div>
                )}
              </div>

              {/* Cancel / Reactivate */}
              <div className="pt-2 border-t border-slate-100">
                {subscription.cancelAtPeriodEnd ? (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        Your plan ends on <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. You'll revert to Starter after that.
                      </p>
                      <button
                        onClick={() => reactivateMutation.mutate()}
                        disabled={reactivateMutation.isPending}
                        className="mt-2 text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
                      >
                        {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate subscription →'}
                      </button>
                    </div>
                  </div>
                ) : !cancelConfirm ? (
                  <button
                    onClick={() => setCancelConfirm(true)}
                    className="text-sm text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-slate-700 flex-1">Cancel at end of billing period?</p>
                    <button
                      onClick={() => setCancelConfirm(false)}
                      className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Keep
                    </button>
                    <button
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="px-3 py-1.5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {cancelMutation.isPending ? 'Canceling…' : 'Confirm Cancel'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Your plan was activated manually. Contact <a href="mailto:appdeveloper@xambridge.com" className="text-violet-600 hover:underline">support</a> for billing queries.
            </p>
          )}
        </div>
      )}

      {/* Payment history (Stripe subscribers only) */}
      {isPaid && !hasAnyPurchase && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Payment History</h2>
          {invLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{inv.description ?? 'Subscription payment'}</p>
                    <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(inv.amountPaid, inv.currency)}</p>
                    <span className={`text-xs font-medium ${inv.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {inv.status}
                    </span>
                  </div>
                  {inv.invoiceUrl && (
                    <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-violet-600 transition-colors shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
