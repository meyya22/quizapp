import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Crown, CreditCard, Calendar, RefreshCw, AlertTriangle,
  CheckCircle2, Clock, ExternalLink, FileText, Zap, XCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { SubscriptionInfo, Invoice } from '../../types';
import toast from 'react-hot-toast';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd: boolean }) {
  if (cancelAtPeriodEnd) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />Canceling
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" />Active
      </span>
    );
  }
  if (status === 'past_due') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" />Past Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
      {status}
    </span>
  );
}

export default function Account() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelConfirm, setCancelConfirm] = useState(false);

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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account</h1>
        <p className="text-slate-500 mt-1">Manage your subscription and billing</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <div className="ml-auto">
            {user?.tier === 'PAID' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                <Crown className="w-3.5 h-3.5" />Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
                Free
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Free tier CTA */}
      {user?.tier === 'FREE' && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-amber-300" />
                <span className="font-bold">Upgrade to Paid</span>
              </div>
              <p className="text-blue-100 text-sm">50 quizzes · 100 questions/quiz · from $5/month</p>
            </div>
            <Button
              onClick={() => navigate('/payment')}
              className="bg-amber-400 text-amber-900 hover:bg-amber-300 font-semibold flex-shrink-0 border-0"
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Subscription details */}
      {user?.tier === 'PAID' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Subscription</h2>

          {subLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />Loading…
            </div>
          ) : subscription ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Plan</p>
                  <p className="font-semibold text-slate-900">
                    {subscription.plan === 'MONTHLY' ? 'Monthly — $5/mo' : 'Yearly — $50/yr'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                  <StatusBadge status={subscription.status} cancelAtPeriodEnd={subscription.cancelAtPeriodEnd} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    {subscription.cancelAtPeriodEnd ? 'Access Until' : 'Next Renewal'}
                  </p>
                  <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(subscription.currentPeriodEnd)}
                  </div>
                </div>
                {subscription.paymentMethod && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Payment Method</p>
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
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">
                        Your plan will end on <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. You'll be
                        downgraded to Free after that.
                      </p>
                      <button
                        onClick={() => reactivateMutation.mutate()}
                        disabled={reactivateMutation.isPending}
                        className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
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
                  <div className="flex items-center gap-3">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-slate-700 flex-1">
                      Cancel at end of billing period?
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCancelConfirm(false)}
                    >
                      Keep
                    </Button>
                    <Button
                      size="sm"
                      loading={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirm Cancel
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No active subscription found.</p>
          )}
        </div>
      )}

      {/* Payment history */}
      {user?.tier === 'PAID' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Payment History</h2>

          {invLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />Loading…
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {inv.description ?? 'Subscription payment'}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(inv.date)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(inv.amountPaid, inv.currency)}
                    </p>
                    <span className={`text-xs font-medium ${inv.status === 'paid' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {inv.status}
                    </span>
                  </div>
                  {inv.invoiceUrl && (
                    <a
                      href={inv.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                      title="View invoice"
                    >
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
