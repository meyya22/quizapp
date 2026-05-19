import { useQuery } from '@tanstack/react-query';
import {
  Crown, TrendingUp, DollarSign, Users, RefreshCw,
  ExternalLink, FileText, Calendar, ArrowUpRight,
} from 'lucide-react';
import api from '../../services/api';
import { PaymentMetrics } from '../../types';

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
  bg: string;
}

function StatCard({ label, value, sub, icon, accent, bg }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
          <p className={`text-3xl font-bold mt-1.5 ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function PaymentMetricsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<PaymentMetrics>({
    queryKey: ['payment-metrics'],
    queryFn: () => api.get('/payment/metrics').then((r) => r.data),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center text-slate-500">
        Failed to load payment metrics. Make sure Stripe is configured.
      </div>
    );
  }

  const planPct = data.totalPaid > 0
    ? { monthly: Math.round((data.monthlyPlan / data.totalPaid) * 100), yearly: Math.round((data.yearlyPlan / data.totalPaid) * 100) }
    : { monthly: 0, yearly: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Metrics</h1>
          <p className="text-slate-500 text-sm mt-1">Live revenue and subscription data from Stripe</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Paid Customers"
          value={String(data.totalPaid)}
          sub={`${data.monthlyPlan} monthly · ${data.yearlyPlan} yearly`}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          accent="text-blue-700"
          bg="bg-blue-50"
        />
        <StatCard
          label="MRR (Est.)"
          value={formatUSD(data.mrr)}
          sub="Monthly Recurring Revenue"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          accent="text-emerald-700"
          bg="bg-emerald-50"
        />
        <StatCard
          label="This Month"
          value={formatUSD(data.monthRevenue)}
          sub="Collected so far"
          icon={<Calendar className="w-5 h-5 text-violet-600" />}
          accent="text-violet-700"
          bg="bg-violet-50"
        />
        <StatCard
          label="Total Revenue"
          value={formatUSD(data.totalRevenue)}
          sub="All time (last 100 invoices)"
          icon={<DollarSign className="w-5 h-5 text-amber-600" />}
          accent="text-amber-700"
          bg="bg-amber-50"
        />
        <StatCard
          label="Monthly Plan"
          value={String(data.monthlyPlan)}
          sub={`${planPct.monthly}% of paid · $5/mo each`}
          icon={<Crown className="w-5 h-5 text-rose-500" />}
          accent="text-rose-700"
          bg="bg-rose-50"
        />
        <StatCard
          label="Yearly Plan"
          value={String(data.yearlyPlan)}
          sub={`${planPct.yearly}% of paid · $50/yr each`}
          icon={<ArrowUpRight className="w-5 h-5 text-indigo-600" />}
          accent="text-indigo-700"
          bg="bg-indigo-50"
        />
      </div>

      {/* Plan split bar */}
      {data.totalPaid > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-700 mb-3">Plan Distribution</p>
          <div className="flex rounded-full overflow-hidden h-3">
            <div
              className="bg-rose-500 transition-all"
              style={{ width: `${planPct.monthly}%` }}
              title={`Monthly: ${planPct.monthly}%`}
            />
            <div
              className="bg-indigo-500 transition-all"
              style={{ width: `${planPct.yearly}%` }}
              title={`Yearly: ${planPct.yearly}%`}
            />
          </div>
          <div className="flex items-center gap-6 mt-3">
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
              Monthly ({data.monthlyPlan} users, {planPct.monthly}%)
            </span>
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              Yearly ({data.yearlyPlan} users, {planPct.yearly}%)
            </span>
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-900">Recent Transactions</p>
          <p className="text-xs text-slate-400 mt-0.5">Last {data.recentTransactions.length} paid invoices from Stripe</p>
        </div>

        {data.recentTransactions.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-10">No transactions yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Customer</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Description</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Amount</th>
                <th className="px-5 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-700 truncate max-w-[160px]">
                        {tx.customerEmail ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-[200px] truncate">
                    {tx.description ?? 'Subscription payment'}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold text-emerald-700">
                      {formatUSD(tx.amountPaid)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {tx.invoiceUrl && (
                      <a
                        href={tx.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        title="View invoice in Stripe"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
