import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Crown, CreditCard, Calendar, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, ExternalLink, FileText, XCircle,
  BrainCircuit, Zap,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import type { ParticipantPlanKey } from './ParticipantPlanCards';

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

interface PlanInfo {
  plan: ParticipantPlanKey;
  planName: string;
  used: number;
  limit: number;
  monthlyReset: boolean;
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

  const { data: planData } = useQuery<PlanInfo>({
    queryKey: ['ai-quizzes'],
    queryFn: () => api.get('/ai-quiz').then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: subscription, isLoading: subLoading } = useQuery<SubscriptionInfo | null>({
    queryKey: ['subscription'],
    queryFn: () => api.get('/payment/subscription').then((r) => r.data),
    enabled: user?.tier === 'PAID',
  });

  const { data: invoices = [], isLoading: invLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => api.get('/payment/invoices').then((r) => r.data),
    enabled: user?.tier === 'PAID',
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

  const currentPlan = planData?.plan ?? 'STARTER';
  const isPaid = user?.tier === 'PAID';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        <p className="text-slate-500 mt-1">Your profile and XamGeni plan details</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-lg font-bold shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${PLAN_BADGE[currentPlan]}`}>
            <Crown className="w-3 h-3" />
            {PLAN_LABEL[currentPlan]}
          </span>
        </div>
      </div>

      {/* XamGeni plan usage */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BrainCircuit className="w-4 h-4 text-violet-500" />
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">XamGeni Plan Usage</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Plan</p>
            <p className="font-semibold text-slate-900">{PLAN_LABEL[currentPlan]}</p>
            <p className="text-xs text-slate-400">{PLAN_PRICE[currentPlan]}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Quizzes Used</p>
            <p className="font-semibold text-slate-900">
              {planData?.used ?? 0} / {planData?.limit ?? 5}
            </p>
            <p className="text-xs text-slate-400">
              {planData?.monthlyReset ? 'this month' : 'lifetime'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Resets</p>
            <p className="font-semibold text-slate-900">
              {planData?.monthlyReset ? 'Monthly' : 'Never'}
            </p>
          </div>
        </div>

        {/* Usage bar */}
        {planData && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{planData.used} used</span>
              <span>{planData.limit - planData.used} remaining</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  planData.used >= planData.limit ? 'bg-red-500' : 'bg-violet-500'
                }`}
                style={{ width: `${Math.min(100, (planData.used / planData.limit) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {!isPaid && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => navigate('/participant/plans')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Zap className="w-4 h-4" /> Upgrade Plan
            </button>
          </div>
        )}
      </div>

      {/* Subscription details (paid users with Stripe) */}
      {isPaid && (
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

      {/* Payment history */}
      {isPaid && (
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
