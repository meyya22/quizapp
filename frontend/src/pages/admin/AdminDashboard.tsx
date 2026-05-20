import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderOpen, FileQuestion, Users, Trophy, ArrowRight, Crown, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { AdminStats } from '../../types';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const isPaid = user?.tier === 'PAID';

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/quizzes/stats').then((r) => r.data),
  });

  const cards = [
    {
      label: 'Categories',
      value: stats?.categories ?? '—',
      icon: FolderOpen,
      color: 'bg-purple-50 text-purple-600',
      link: '/admin/categories',
      limit: isPaid ? null : 5,
    },
    {
      label: 'Quizzes',
      value: stats?.quizzes ?? '—',
      icon: FileQuestion,
      color: 'bg-blue-50 text-blue-600',
      link: '/admin/quizzes',
      limit: null,
    },
    {
      label: 'Participants',
      value: stats?.participants ?? '—',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-600',
      link: '/admin/reports',
      limit: null,
    },
    {
      label: 'Total Attempts',
      value: stats?.attempts ?? '—',
      icon: Trophy,
      color: 'bg-amber-50 text-amber-600',
      link: '/admin/reports',
      limit: null,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name}
          </h1>
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

      {!isPaid && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Free tier limits</p>
            <p className="text-sm text-amber-700 mt-0.5">
              You can create up to <strong>5 categories</strong>, <strong>1 quiz per category</strong>, and <strong>10 questions per quiz</strong>.
              <Link to="/payment" className="font-semibold text-amber-800 underline hover:text-amber-900">Upgrade</Link> to Paid for unlimited access.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map(({ label, value, icon: Icon, color, link, limit }) => (
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
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-sm text-slate-500">{label}</p>
              {limit !== null && (
                <p className="text-xs text-slate-400">of {limit}</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/admin/categories"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <FolderOpen className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Manage Categories</p>
              <p className="text-xs text-slate-500">Create and organize quiz categories</p>
            </div>
          </Link>
          <Link
            to="/admin/quizzes"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <FileQuestion className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Build Quizzes</p>
              <p className="text-xs text-slate-500">Add questions and configure quizzes</p>
            </div>
          </Link>
          <Link
            to="/admin/reports"
            className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <Trophy className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">View Reports</p>
              <p className="text-xs text-slate-500">Check participant results</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
