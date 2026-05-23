import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FolderOpen, FileQuestion, Users, Trophy, ArrowRight, Crown,
  Check, X, Zap, Brain, Globe, Upload, Mail, BarChart3, Shield,
} from 'lucide-react';
import api from '../../services/api';
import { AdminStats } from '../../types';
import { useAuthStore } from '../../store/authStore';

const COMPARE_ROWS = [
  { label: 'Quizzes',              free: '5',              paid: '50' },
  { label: 'Questions per quiz',   free: '10',             paid: '100' },
  { label: 'AI generations / mo',  free: '3',              paid: '25' },
  { label: 'Contacts',             free: '10',             paid: '500' },
  { label: 'Emails / month',       free: '50',             paid: '500' },
  { label: 'Quiz responses',       free: '50 lifetime',    paid: '2,000 / mo' },
  { label: 'Custom email compose', free: false,            paid: true },
  { label: 'CSV / Excel import',   free: false,            paid: true },
  { label: 'Quiz translation',     free: false,            paid: true },
  { label: 'Study mode',           free: false,            paid: true },
  { label: 'Analytics & export',   free: false,            paid: true },
];

const PAID_BENEFITS = [
  { icon: FileQuestion, label: '50 quizzes',              sub: '100 questions each' },
  { icon: Brain,        label: '25 AI generations / mo',  sub: 'Up to 10 questions each' },
  { icon: Mail,         label: '500 emails / month',       sub: '500 contacts' },
  { icon: Trophy,       label: '2,000 responses / month',  sub: 'Resets 1st of each month' },
  { icon: Upload,       label: 'CSV / Excel import',        sub: 'Bulk-import questions & contacts' },
  { icon: Globe,        label: 'Quiz translation',          sub: '9 languages' },
  { icon: Users,        label: 'Custom email composer',     sub: 'With live preview' },
  { icon: BarChart3,    label: 'Advanced analytics',        sub: 'Export Excel & PDF' },
  { icon: Shield,       label: 'Study mode',                sub: 'For participants' },
];

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const isPaid = user?.tier === 'PAID';

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/quizzes/stats').then((r) => r.data),
  });

  const cards = [
    { label: 'Categories',     value: stats?.categories ?? '—', icon: FolderOpen, color: 'bg-purple-50 text-purple-600', link: '/admin/categories' },
    { label: 'Quizzes',        value: stats?.quizzes ?? '—',    icon: FileQuestion, color: 'bg-blue-50 text-blue-600',   link: '/admin/quizzes' },
    { label: 'Participants',   value: stats?.participants ?? '—',icon: Users,       color: 'bg-emerald-50 text-emerald-600', link: '/admin/reports' },
    { label: 'Total Attempts', value: stats?.attempts ?? '—',   icon: Trophy,      color: 'bg-amber-50 text-amber-600',  link: '/admin/reports' },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
          <p className="text-slate-500 mt-1">Here's an overview of your quiz platform.</p>
        </div>
        {isPaid ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-sm font-semibold text-amber-700">
            <Crown className="w-4 h-4" /> Paid Plan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium text-slate-600">
            Free Plan
          </span>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map(({ label, value, icon: Icon, color, link }) => (
          <Link
            key={label}
            to={link}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to="/admin/categories" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
            <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Manage Categories</p>
              <p className="text-xs text-slate-500">Create and organize quiz categories</p>
            </div>
          </Link>
          <Link to="/admin/quizzes" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
            <FileQuestion className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Build Quizzes</p>
              <p className="text-xs text-slate-500">Add questions and configure quizzes</p>
            </div>
          </Link>
          <Link to="/admin/reports" className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
            <Trophy className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">View Reports</p>
              <p className="text-xs text-slate-500">Check participant results</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Plan section */}
      {isPaid ? (
        /* ── Paid: benefit highlights ── */
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-slate-900">Your Paid Plan Benefits</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PAID_BENEFITS.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> {label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ── Free: comparison table + upgrade CTA ── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-900">Your Plan vs Paid</h2>
            <Link
              to="/payment"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" /> Upgrade — $5/mo
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 font-medium text-slate-500 w-1/2">Feature</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-xs">Free (You)</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-blue-700 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full text-xs">
                      <Crown className="w-3 h-3 text-amber-500" /> Paid
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {COMPARE_ROWS.map(({ label, free, paid }) => (
                  <tr key={label} className="hover:bg-slate-50/50">
                    <td className="px-6 py-3 text-slate-700">{label}</td>
                    <td className="px-4 py-3 text-center">
                      {typeof free === 'boolean' ? (
                        free
                          ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <X className="w-4 h-4 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-slate-600 font-medium">{free}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {typeof paid === 'boolean' ? (
                        paid
                          ? <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                          : <X className="w-4 h-4 text-slate-300 mx-auto" />
                      ) : (
                        <span className="text-blue-700 font-semibold">{paid}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm text-blue-800">
              <strong>Upgrade to Paid</strong> and unlock 10× more capacity, AI generation, translation, and export.
            </p>
            <Link
              to="/payment"
              className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Zap className="w-4 h-4" /> Get Paid — $5/month
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
