import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen, Check, GraduationCap, Star, Zap,
  ShieldCheck, Clock, Trophy, AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const LEARNER_PERKS = [
  { icon: BookOpen,    text: 'Take any quiz shared with you  - instantly' },
  { icon: Check,       text: '100% free, forever  - no credit card ever' },
  { icon: Zap,         text: 'Instant results with scores & explanations' },
  { icon: Trophy,      text: 'See if you passed and review your answers' },
  { icon: Star,        text: 'Study mode to learn at your own pace' },
  { icon: Clock,       text: 'Track time taken on each attempt' },
  { icon: ShieldCheck, text: 'Secure, private  - your data stays yours' },
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

export default function RegisterLearner() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const setAuth = useAuthStore((s) => s.setAuth);
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
      const res = await api.post('/auth/register', {
        name: data.name, email: data.email, password: data.password, role: 'PARTICIPANT',
      });
      setAuth(res.data.user, res.data.token);
      navigate(from || '/participant');
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
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setGeneralError(null);
    try {
      const res = await api.post('/auth/google', { idToken: credentialResponse.credential, role: 'PARTICIPANT' });
      setAuth(res.data.user, res.data.token);
      navigate(from || '/participant');
    } catch {
      setGeneralError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Helmet>
      <title>Join as a Learner  - Xam Bridge</title>
      <meta name="description" content="Sign up to take quizzes assigned by your teacher or trainer. Track your scores, review answers, and learn at your own pace." />
      <meta name="keywords" content="take online quiz, learner account, student quiz platform, free quiz taker, online test, quiz results tracker" />
      <link rel="canonical" href="https://www.xambridge.com/register/learner" />
    </Helmet>
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex-shrink-0">
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

      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-start">

          {/* â"€â"€ Left: Benefits panel â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-8 text-white">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-emerald-200" />
                <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Learner Account  - Always Free
                </span>
              </div>
              <h2 className="text-2xl font-extrabold leading-tight mb-2">
                Learn, practice &amp; grow at your own pace
              </h2>
              <p className="text-emerald-200 text-sm leading-relaxed">
                Take quizzes created by your teachers, trainers, or employers  - for free, forever.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {LEARNER_PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-emerald-100">{text}</span>
                </li>
              ))}
            </ul>

            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-sm text-white leading-relaxed">
                <span className="font-bold">No quiz link yet?</span> Ask your teacher or trainer to share a quiz link with you  - sign up first so your results are saved to your profile.
              </p>
            </div>

            <p className="mt-6 text-xs text-emerald-300">
              Are you a teacher or trainer?{' '}
              <Link to="/register/admin" className="text-white font-semibold underline hover:text-emerald-100">
                Create a Quiz Admin account
              </Link>
            </p>
          </div>

          {/* â"€â"€ Right: Registration form â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your learner account</h1>
            <p className="text-slate-500 text-sm mb-6">Free forever  - no credit card needed.</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Full Name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />

              <div className="space-y-1">
                <Input
                  label="Email Address" type="email" placeholder="you@example.com"
                  error={errors.email?.message || undefined}
                  className={emailError ? 'border-red-300 bg-red-50' : ''}
                  {...register('email')}
                />
                {emailError && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">
                      {emailError}{' '}
                      <Link to="/login" className="font-semibold underline">Sign in instead</Link>
                    </p>
                  </div>
                )}
              </div>

              <Input label="Password" type="password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

              {generalError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{generalError}</p>
                </div>
              )}

              <Button
                type="submit" loading={loading} size="lg"
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700"
              >
                Create Free Learner Account
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400">or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setGeneralError('Google sign-up failed. Please try again.')}
                shape="rectangular" theme="outline" size="large" width="320"
              />
            </div>

            <p className="text-xs text-center text-slate-400 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
    </>
  );
}

