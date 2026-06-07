import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { BookOpen, LogOut, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Footer from './components/Footer';
import SupportChat from './components/SupportChat';
import Login from './pages/auth/Login';
import RegisterAdmin from './pages/auth/RegisterAdmin';
import RegisterLearner from './pages/auth/RegisterLearner';
import PaymentPage from './pages/payment/PaymentPage';
import SubscribePage from './pages/payment/SubscribePage';
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
import ExamPrepPage from './pages/participant/ExamPrepPage';
import QuizPlayer from './pages/participant/QuizPlayer';
import Results from './pages/participant/Results';
import PlansPage from './pages/participant/PlansPage';
import ParticipantAccount from './pages/participant/ParticipantAccount';
import SuperAdminLayout from './components/layout/SuperAdminLayout';
import UserReport from './pages/superadmin/UserReport';
import PaymentMetricsPage from './pages/superadmin/PaymentMetrics';
import EmailCampaign from './pages/superadmin/EmailCampaign';
import ParticipantEmailCampaign from './pages/superadmin/ParticipantEmailCampaign';
import ParticipantAiQuizReport from './pages/superadmin/ParticipantAiQuizReport';
import AnonymousQuizTracker from './pages/superadmin/AnonymousQuizTracker';
import AnonymousAttempts from './pages/superadmin/AnonymousAttempts';
import ContactBuilder from './pages/superadmin/ContactBuilder';
import EmailConfigPage from './pages/superadmin/EmailConfigPage';
import ExamContentManager from './pages/superadmin/ExamContentManager';
import UpcomingExams from './pages/superadmin/UpcomingExams';
import DbInfo from './pages/superadmin/DbInfo';
import AltLandingPage from './pages/AltLandingPage';
import PaymentPending from './pages/PaymentPending';
import RazorpaySuccess from './pages/RazorpaySuccess';
import UnlockExams from './pages/UnlockExams';
import HelpSupport from './pages/HelpSupport';
import FAQ from './pages/FAQ';
import AboutUs from './pages/AboutUs';
import PrivacyPolicy from './pages/PrivacyPolicy';

function RootRedirect() {
  const { user } = useAuthStore();
  if (user?.role === 'SUPER_ADMIN') return <Navigate to="/superadmin/users" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <AltLandingPage />;
}

function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  function handleLogout() { logout(); toast.success('Logged out'); }
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function RequireAuth({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ChatOverlay() {
  const { user } = useAuthStore();
  if (!user) return null;
  return <SupportChat />;
}

export default function App() {
  return (
    <>
    <ChatOverlay />
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Navigate to="/register/admin" replace />} />
      <Route path="/register/admin" element={<RegisterAdmin />} />
      <Route path="/register/learner" element={<RegisterLearner />} />
      <Route path="/payment" element={<PaymentPage />} />
      <Route path="/subscribe" element={<SubscribePage />} />
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
        <Route index element={<ExamPrepPage />} />
        <Route path="quizzes" element={<ParticipantDashboard />} />
        <Route path="quiz/:id" element={<QuizPlayer />} />
        <Route path="results/:attemptId" element={<Results />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      <Route
        path="/participant/account"
        element={
          <RequireAuth role="PARTICIPANT">
            <AccountShell>
              <ParticipantAccount />
            </AccountShell>
          </RequireAuth>
        }
      />

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
        <Route path="email-campaign" element={<EmailCampaign />} />
        <Route path="participant-campaign" element={<ParticipantEmailCampaign />} />
        <Route path="ai-quiz-report" element={<ParticipantAiQuizReport />} />
        <Route path="anonymous-quizzes" element={<AnonymousQuizTracker />} />
        <Route path="anonymous-attempts" element={<AnonymousAttempts />} />
        <Route path="contact-builder" element={<ContactBuilder />} />
        <Route path="email-config" element={<EmailConfigPage />} />
        <Route path="exam-content" element={<ExamContentManager />} />
        <Route path="upcoming-exams" element={<UpcomingExams />} />
        <Route path="db-info" element={<DbInfo />} />
      </Route>

      <Route path="/explore" element={<AltLandingPage />} />

      {/* Standalone share routes — no navigation chrome, no login required */}
      <Route
        path="/quiz/:id"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
              <QuizPlayer />
            </div>
            <Footer />
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

      <Route path="/checkout" element={<PaymentPending />} />
      <Route path="/payment/razorpay/success" element={<RazorpaySuccess />} />
      <Route
        path="/unlock-exams"
        element={
          <RequireAuth role="PARTICIPANT">
            <UnlockExams />
          </RequireAuth>
        }
      />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
