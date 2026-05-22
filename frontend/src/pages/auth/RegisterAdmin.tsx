import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BookOpen, Crown, Brain, Mail, Users,
  BarChart3, FileSpreadsheet, Globe, AlertCircle, ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const FREE_PERKS = [
  { icon: BookOpen,       text: '5 quizzes with 10 questions each' },
  { icon: Brain,          text: '3 AI question generations / month' },
  { icon: Users,          text: '10 contacts in your audience' },
  { icon: Mail,           text: '50 broadcast emails / month' },
  { icon: BarChart3,      text: '50 quiz responses (lifetime)' },
  { icon: FileSpreadsheet,text: 'Response reports & analytics' },
  { icon: Globe,          text: 'Share quizzes via public link' },
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

export default function RegisterAdmin() {
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
        name: data.name, email: data.email, password: data.password, role: 'ADMIN',
      });
      setAuth(res.data.user, res.data.token);
      navigate(from || '/admin');
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
      const res = await api.post('/auth/google', { idToken: credentialResponse.credential });
      setAuth(res.data.user, res.data.token);
      navigate(from || '/admin');
    } catch {
      setGeneralError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Helmet>
      <title>Create Free Quiz Admin Account  - Xam Bridge</title>
      <meta name="description" content="Sign up free as an educator or trainer. Create up to 5 quizzes, use AI to generate questions, and share with your audience. No credit card required." />
      <meta name="keywords" content="create quiz account, free quiz maker signup, quiz admin, teacher quiz tool, trainer assessment platform, free quiz creator, quiz builder registration" />
      <link rel="canonical" href="https://www.xambridge.com/register/admin" />
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

          {/* â"€â"€ Left: Features panel â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl p-8 text-white">
            <div className="mb-6">
              <span className="inline-block bg-white/20 text-white text-base font-bold px-4 py-1.5 rounded-full mb-3">
                Quiz Admin  - Free Plan
              </span>
              <h2 className="text-2xl font-extrabold leading-tight mb-2">
                Create quizzes for your students or team
              </h2>
              <p className="text-blue-200 text-sm leading-relaxed">
                Set up your quiz admin account in seconds. No credit card required.
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {FREE_PERKS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm text-blue-100">{text}</span>
                </li>
              ))}
            </ul>

            <div className="bg-white/10 border border-white/20 rounded-xl p-4">
              <p className="text-xs text-blue-200 mb-2 font-semibold uppercase tracking-wide">Want more power?</p>
              <p className="text-sm text-white mb-3">
                Upgrade to Paid for 50 quizzes, AI generation, 2,000 responses/month, and full analytics.
              </p>
              <Link
                to="/subscribe"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 px-4 py-2 rounded-lg transition-colors"
              >
                <Crown className="w-3.5 h-3.5" /> View Paid Plan <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="mt-6 text-xs text-blue-300">
              Looking to take quizzes instead?{' '}
              <Link to="/register/learner" className="text-white font-semibold underline hover:text-blue-100">
                Sign up as a Learner
              </Link>
            </p>
          </div>

          {/* â"€â"€ Right: Registration form â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Create Educator or Trainer Account</h1>
            <p className="text-slate-500 text-sm mb-6">Free forever  - upgrade anytime.</p>

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

              <Button type="submit" loading={loading} size="lg" className="w-full justify-center">
                Create Free Admin Account
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

