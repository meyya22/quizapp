import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

type Status = 'verifying' | 'success' | 'failed' | 'timeout';

const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 20;

export default function RazorpaySuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus]           = useState<Status>('verifying');
  const [categoryName, setCategoryName] = useState('');
  const pollCount = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    const paymentId    = searchParams.get('razorpay_payment_id');
    sessionStorage.getItem('rzp_categoryId'); // consumed by pending record on backend
    const storedCatName = sessionStorage.getItem('rzp_categoryName') ?? '';

    function onSuccess(name: string) {
      // Clear temporary payment context
      sessionStorage.removeItem('rzp_categoryId');
      sessionStorage.removeItem('rzp_categoryName');
      sessionStorage.removeItem('rzp_userId');
      setCategoryName(name || storedCatName);
      queryClient.invalidateQueries({ queryKey: ['category-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setStatus('success');
    }

    function startPolling() {
      function poll() {
        api.get('/payment/razorpay/activation-status')
          .then(({ data }) => {
            if (data.activated) {
              onSuccess(data.categoryName ?? storedCatName);
            } else {
              pollCount.current += 1;
              if (pollCount.current >= MAX_POLLS) setStatus('timeout');
              else setTimeout(poll, POLL_INTERVAL_MS);
            }
          })
          .catch(() => {
            pollCount.current += 1;
            if (pollCount.current >= MAX_POLLS) setStatus('timeout');
            else setTimeout(poll, POLL_INTERVAL_MS);
          });
      }
      setTimeout(poll, 300);
    }

    if (paymentId) {
      // Build verify URL with all params Razorpay may have sent back
      const params = new URLSearchParams();
      ['razorpay_payment_id', 'razorpay_payment_link_id',
       'razorpay_payment_link_reference_id', 'razorpay_payment_link_status',
       'razorpay_signature']
        .forEach((k) => { const v = searchParams.get(k); if (v) params.set(k, v); });

      api.get(`/payment/razorpay/verify-payment?${params.toString()}`)
        .then(({ data }) => {
          if (data.success) onSuccess(data.categoryName ?? storedCatName);
          else setStatus('failed');
        })
        .catch(() => {
          // verifyPayment failed — webhook may have already processed it; poll to confirm
          startPolling();
        });
    } else {
      // No payment ID in URL — rely on webhook + poll
      startPolling();
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">Xam Bridge</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">

            {status === 'verifying' && (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
                  <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Activating your access…</h1>
                <p className="text-slate-500 text-sm mt-1">Payment received — just a moment.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-2xl mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-600" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Access activated!</h1>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  {categoryName
                    ? <><strong className="text-slate-700">{categoryName}</strong> mock tests are now fully unlocked.</>
                    : 'Your mock tests are now unlocked.'}{' '}
                  Happy studying!
                </p>
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
                >
                  Go to Mock Tests →
                </Link>
              </>
            )}

            {status === 'failed' && (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-red-100 rounded-2xl mb-4">
                  <XCircle className="w-7 h-7 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Verification failed</h1>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  We could not verify your payment. If you were charged, please contact support.
                </p>
                <Link to="/" className="w-full inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                  Back to Home
                </Link>
              </>
            )}

            {status === 'timeout' && (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-4">
                  <CheckCircle className="w-7 h-7 text-amber-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Payment received</h1>
                <p className="text-slate-500 text-sm mt-1 mb-6">
                  Your payment was successful. Access is being activated — refresh the page in a moment.
                  If quizzes are still locked after 10 minutes, contact support.
                </p>
                <Link to="/" className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
                  Go to Mock Tests
                </Link>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
