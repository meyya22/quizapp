import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PaymentPage from './pages/payment/PaymentPage';
import PaymentSuccess from './pages/payment/PaymentSuccess';
import PaymentCancel from './pages/payment/PaymentCancel';
import AdminLayout from './components/layout/AdminLayout';
import ParticipantLayout from './components/layout/ParticipantLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import Categories from './pages/admin/Categories';
import QuizzesList from './pages/admin/QuizzesList';
import QuizBuilder from './pages/admin/QuizBuilder';
import Reports from './pages/admin/Reports';
import Account from './pages/admin/Account';
import Audience from './pages/admin/Audience';
import ParticipantDashboard from './pages/participant/ParticipantDashboard';
import QuizPlayer from './pages/participant/QuizPlayer';
import Results from './pages/participant/Results';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import UserReport from './pages/superadmin/UserReport';
import PaymentMetricsPage from './pages/superadmin/PaymentMetrics';
import HelpSupport from './pages/HelpSupport';

function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/superadmin/users" replace />;
  return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/participant'} replace />;
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />

      <Route
        path="/admin"
        element={
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="categories" element={<Categories />} />
        <Route path="quizzes" element={<QuizzesList />} />
        <Route path="quizzes/:id" element={<QuizBuilder />} />
        <Route path="audience" element={<Audience />} />
        <Route path="reports" element={<Reports />} />
        <Route path="account" element={<Account />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      <Route
        path="/participant"
        element={
          <RequireAuth role="PARTICIPANT">
            <ParticipantLayout />
          </RequireAuth>
        }
      >
        <Route index element={<ParticipantDashboard />} />
        <Route path="quiz/:id" element={<QuizPlayer />} />
        <Route path="results/:attemptId" element={<Results />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      <Route
        path="/superadmin"
        element={
          <RequireAuth role="SUPER_ADMIN">
            <SuperAdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<UserReport />} />
        <Route path="payments" element={<PaymentMetricsPage />} />
      </Route>

      {/* Standalone share routes — no navigation chrome, no login required */}
      <Route
        path="/quiz/:id"
        element={
          <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-8">
              <QuizPlayer />
            </div>
          </div>
        }
      />
      <Route
        path="/results/:attemptId"
        element={
          <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-6 py-8">
              <Results />
            </div>
          </div>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
