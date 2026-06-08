import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, AlertCircle, Mail, Lock } from 'lucide-react';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

type AuthErrorType = 'email' | 'password' | 'google' | 'general' | null;

interface AuthError {
  type: AuthErrorType;
  message: string;
}

function classifyError(msg: string): AuthErrorType {
  const lower = msg.toLowerCase();
  if (lower.includes('email') || lower.includes('account') || lower.includes('found')) return 'email';
  if (lower.includes('password') || lower.includes('incorrect')) return 'password';
  if (lower.includes('google')) return 'google';
  return 'general';
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  function extractQuizId(url: string | undefined): string | null {
    const match = (url || '').match(/^\/quiz\/([^?/]+)/);
    return match ? match[1] : null;
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.token);
      const quizId = extractQuizId(from);
      if (quizId && res.data.user.role === 'PARTICIPANT' && !res.data.user.complimentaryQuizId) {
        try {
          const patchRes = await api.patch('/users/me/complimentary-quiz', { quizId });
          setAuth({ ...res.data.user, complimentaryQuizId: patchRes.data.complimentaryQuizId }, res.data.token);
        } catch {}
      }
      navigate(from || (res.data.user.role === 'ADMIN' ? '/admin' : '/'));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Login failed. Please try again.';
      setAuthError({ type: classifyError(msg), message: msg });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setAuthError(null);
    try {
      const res = await api.post('/auth/google', { idToken: credentialResponse.credential });
      setAuth(res.data.user, res.data.token);
      const quizId = extractQuizId(from);
      if (quizId && res.data.user.role === 'PARTICIPANT' && !res.data.user.complimentaryQuizId) {
        try {
          const patchRes = await api.patch('/users/me/complimentary-quiz', { quizId });
          setAuth({ ...res.data.user, complimentaryQuizId: patchRes.data.complimentaryQuizId }, res.data.token);
        } catch {}
      }
      navigate(from || (res.data.user.role === 'ADMIN' ? '/admin' : '/'));
    } catch {
      setAuthError({ type: 'google', message: 'Google sign-in failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  const emailHasError = authError?.type === 'email';
  const passwordHasError = authError?.type === 'password';

  return (
    <>
    <Helmet>
      <title>Sign In — Xam Bridge Exam Prep</title>
      <meta name="description" content="Sign in to Xam Bridge to access your mock tests, track your exam prep progress, and practise for NEET, UPSC, CUET, SSC, Banking and more." />
      <meta name="keywords" content="Xam Bridge login, exam prep sign in, mock test login India, NEET prep login, UPSC prep login" />
      <link rel="canonical" href="https://www.xambridge.com/login" />
    </Helmet>
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">Xam Bridge</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Sign in</h1>
          <p className="text-slate-500 text-sm mb-6">
            Don't have an account?{' '}
            <Link to="/register/learner" className="text-blue-600 font-medium hover:underline">
              Register
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${emailHasError ? 'text-red-400' : 'text-slate-400'}`} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`block w-full rounded-lg border pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email || emailHasError
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400'
                      : 'border-slate-300 bg-white focus:border-blue-500'
                  }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              {emailHasError && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3 h-3" />{authError.message}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${passwordHasError ? 'text-red-400' : 'text-slate-400'}`} />
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`block w-full rounded-lg border pl-9 pr-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password || passwordHasError
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-400'
                      : 'border-slate-300 bg-white focus:border-blue-500'
                  }`}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              {passwordHasError && <p className="flex items-center gap-1 text-xs text-red-600"><AlertCircle className="w-3 h-3" />{authError.message}</p>}
            </div>

            {authError && authError.type === 'general' && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{authError.message}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full justify-center" size="lg">
              Sign in
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400">or continue with</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setAuthError({ type: 'google', message: 'Google sign-in failed. Please try again.' })}
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
            />
            {authError?.type === 'google' && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />{authError.message}
              </p>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
    </>
  );
}

