import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen, Check, Crown, Zap, ShieldCheck, RefreshCw,
  AlertCircle, ArrowLeft,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

type Plan = 'MONTHLY' | 'YEARLY';

const PLANS: Record<Plan, { price: string; period: string; note: string; saving: string }> = {
  MONTHLY: { price: '$5', period: '/month', note: 'Billed monthly', saving: '' },
  YEARLY:  { price: '$50', period: '/year',  note: 'Billed annually', saving: '≈ $4.17/mo — save 16%' },
};

const FEATURES = [
  '50 quizzes & 100 questions per quiz',
  '25 AI question generations / month',
  '2,000 quiz responses / month',
  '500 contacts & 500 emails / month',
  'Custom email composer with preview',
  'CSV / Excel import',
  'Quiz translation (9 languages)',
  'Study mode for participants',
  'Advanced analytics & export (Excel / PDF)',
  'Cancel anytime',
];

const schema = z
  .object({
    name:            z.string().min(2, 'Name must be at least 2 characters'),
    email:           z.string().email('Please enter a valid email address'),
    password:        z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function SubscribePage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [plan, setPlan] = useState<Plan>('MONTHLY');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    setEmailError(null);
    setGeneralError(null);

    try {
      // Step 1 — register
      const regRes = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'ADMIN',
      });
      setAuth(regRes.data.user, regRes.data.token);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Registration failed. Please try again.';
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('use')) {
        setEmailError('An account with this email already exists.');
        setError('email', { message: '' });
      } else {
        setGeneralError(msg);
      }
      setLoading(false);
      return;
    }

    try {
      // Step 2 — create Stripe checkout session
      const { data: checkout } = await api.post('/payment/create-checkout-session', { plan });
      window.location.href = checkout.url;
    } catch {
      setGeneralError('Account created! But we could not start checkout. Please go to your account and try subscribing again.');
      setLoading(false);
    }
  }

  return (
    <>
    <Helmet>
      <title>Plans &amp; Pricing — Xam Bridge Exam Prep Platform</title>
      <meta name="description" content="Unlock full mock test papers for ₹99 per exam category — one-time, no subscription. Also explore XamGeni AI quiz plans for advanced practice. Xam Bridge India." />
      <meta name="keywords" content="Xam Bridge pricing India, mock test unlock price, exam prep subscription India, ₹99 mock test, competitive exam practice plans India" />
      <link rel="canonical" href="https://www.xambridge.com/subscribe" />
    </Helmet>
    <div className="min-h-screen bg-slate-50">

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Xam Bridge</span>
          </Link>
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* Heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            <Crown className="w-4 h-4" /> Subscribe to Paid Plan
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Create your account &amp; subscribe</h1>
          <p className="text-slate-500 text-sm">Fill in your details below — you'll be taken to secure checkout instantly.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">

          {/* ── Left: Plan details ────────────────────────────────── */}
          <div className="bg-white rounded-2xl border-2 border-blue-600 shadow-lg shadow-blue-50 p-7">
            <div className="flex items-center gap-2 mb-5">
              <Crown className="w-5 h-5 text-amber-500" />
              <span className="text-lg font-bold text-slate-900">Paid Plan</span>
              <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Most Popular</span>
            </div>

            {/* Plan toggle */}
            <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-5">
              {(['MONTHLY', 'YEARLY'] as Plan[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`flex-1 py-2.5 px-4 text-sm font-semibold transition-colors ${
                    plan === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p === 'MONTHLY' ? 'Monthly' : (
                    <span className="flex items-center justify-center gap-1.5">
                      Yearly
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${plan === 'YEARLY' ? 'bg-amber-300 text-amber-900' : 'bg-amber-100 text-amber-700'}`}>
                        -16%
                      </span>
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Price */}
            <div className="mb-5">
              <div className="flex items-end gap-1">
                <span className="text-5xl font-extrabold text-slate-900">{PLANS[plan].price}</span>
                <span className="text-slate-400 mb-1.5 text-sm">{PLANS[plan].period}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{PLANS[plan].note}</p>
              {PLANS[plan].saving && (
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">{PLANS[plan].saving}</p>
              )}
            </div>

            {/* Features */}
            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 mt-6 pt-5 border-t border-slate-100 text-xs text-slate-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Secure checkout</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Cancel anytime</span>
            </div>
          </div>

          {/* ── Right: Registration form ──────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm mb-6">
              Your account will be created as a <strong>Quiz Admin</strong> on the Paid plan.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="John Doe"
                error={errors.name?.message}
                {...register('name')}
              />

              <div className="space-y-1">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  error={errors.email?.message || undefined}
                  className={emailError ? 'border-red-300 bg-red-50' : ''}
                  {...register('email')}
                />
                {emailError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">
                      {emailError}{' '}
                      <Link to="/login" state={{ from: '/payment' }} className="font-semibold underline">Sign in instead</Link>
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              {generalError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{generalError}</p>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Zap className="w-4 h-4" />
                Create Account &amp; Subscribe — {plan === 'MONTHLY' ? '$5/month' : '$50/year'}
              </Button>

              <p className="text-xs text-center text-slate-400">
                By continuing you agree to our terms. Secure checkout powered by Stripe.
              </p>
            </form>
          </div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mx-auto mt-8 text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
    </div>
    </>
  );
}
