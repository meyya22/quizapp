import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, FileQuestion, BarChart3, LogOut, BookOpen, Crown, UserCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/admin/quizzes', icon: FileQuestion, label: 'Quizzes' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/account', icon: UserCircle, label: 'Account' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isPaid = user?.tier === 'PAID';

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col fixed inset-y-0">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">QuizApp</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700 space-y-3">
          {!isPaid && (
            <div className="mx-1 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Free Tier</p>
              <p className="text-xs text-slate-400 leading-tight">
                5 categories · 1 quiz/category · 10 questions/quiz
              </p>
            </div>
          )}

          <div className="px-3 py-2">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-slate-200 truncate flex-1">{user?.name}</p>
              {isPaid ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                  <Crown className="w-3 h-3" />Paid
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400">Free</span>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-60 flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
