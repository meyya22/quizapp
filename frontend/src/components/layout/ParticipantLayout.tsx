import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, BookOpen } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ParticipantLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/participant" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">QuizApp</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/participant"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              Quizzes
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
