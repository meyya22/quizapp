import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, FileQuestion, BarChart3, LogOut, BookOpen, Crown, UserCircle, Users, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/categories', icon: FolderOpen, label: 'Categories' },
  { to: '/admin/quizzes', icon: FileQuestion, label: 'Quizzes' },
  { to: '/admin/audience', icon: Users, label: 'Audience' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/account', icon: UserCircle, label: 'Account' },
];

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isPaid = user?.tier === 'PAID';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">QuizApp</span>
          <button
            onClick={closeSidebar}
            className="ml-auto md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
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

      {/* Main area */}
      <div className="flex-1 flex flex-col md:ml-60 min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-slate-900 text-white flex items-center gap-3 px-4 h-14 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white">QuizApp</span>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
