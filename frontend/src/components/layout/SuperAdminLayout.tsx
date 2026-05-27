import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Footer from '../Footer';
import { Users, LogOut, ShieldCheck, CreditCard, Mail, Menu, X, Sparkles, BrainCircuit, EyeOff, BookUser, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  const navItems = [
    { to: '/superadmin/users', icon: Users, label: 'User Report' },
    { to: '/superadmin/payments', icon: CreditCard, label: 'Payment Metrics' },
    { to: '/superadmin/email-campaign', icon: Mail, label: 'Admin Campaigns' },
    { to: '/superadmin/participant-campaign', icon: Sparkles, label: 'Learner Campaigns' },
    { to: '/superadmin/ai-quiz-report', icon: BrainCircuit, label: 'AI Quiz Report' },
    { to: '/superadmin/anonymous-quizzes', icon: EyeOff, label: 'Track Anonymous Quiz' },
    { to: '/superadmin/contact-builder', icon: BookUser, label: 'Contact Builder' },
    { to: '/superadmin/email-config', icon: Settings, label: 'Email Config' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-tight">Super Admin</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button onClick={closeSidebar} className="md:hidden text-slate-400 hover:text-slate-700 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:ml-64 min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-slate-200 flex items-center gap-3 px-4 h-14 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-900">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-rose-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Super Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
