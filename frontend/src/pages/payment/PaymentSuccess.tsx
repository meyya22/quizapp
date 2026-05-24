import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth, user } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) { setStatus('error'); return; }

    api.get(`/payment/verify-session?session_id=${sessionId}`)
      .then(({ data }) => {
        setAuth(data.user, data.token);
        setStatus('success');
      })
      .catch(() => setStatus('error'));
  }, [searchParams, setAuth]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">Confirming your subscription…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
          <p className="text-slate-600 mb-6">
            Your payment went through but we couldn't confirm it yet. Please check your{' '}
            <strong>Account</strong> page in a few minutes.
          </p>
          <Button onClick={() => navigate(user?.role === 'PARTICIPANT' ? '/participant' : '/admin')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
        <p className="text-slate-500 mb-1">Your <strong>{user?.role === 'PARTICIPANT' ? 'XamGeni' : 'Paid'} Plan</strong> is now active.</p>
        <p className="text-slate-400 text-sm mb-8">Manage your subscription anytime from Account settings.</p>
        <Button className="w-full justify-center" size="lg" onClick={() => navigate(user?.role === 'PARTICIPANT' ? '/participant' : '/admin')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
