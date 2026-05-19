import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, LogOut, ShieldCheck, CreditCard } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function SuperAdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">Super Admin</p>
              <p className="text-xs text-slate-500 truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {[
            { to: '/superadmin/users', icon: Users, label: 'User Report' },
            { to: '/superadmin/payments', icon: CreditCard, label: 'Payment Metrics' },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
