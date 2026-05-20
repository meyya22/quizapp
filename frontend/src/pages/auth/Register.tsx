import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, AlertCircle } from 'lucide-react';
import Footer from '../../components/Footer';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    role: z.enum(['PARTICIPANT', 'ADMIN']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [emailTakenError, setEmailTakenError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'PARTICIPANT' } });

  const selectedRole = watch('role');

  async function onSubmit(data: FormData) {
    setLoading(true);
    setEmailTakenError(null);
    setGeneralError(null);
    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      setAuth(res.data.user, res.data.token);
      navigate(res.data.user.role === 'ADMIN' ? '/admin' : '/participant');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Registration failed. Please try again.';

      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('use')) {
        setEmailTakenError('An account with this email already exists. Try signing in instead.');
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
      navigate('/participant');
    } catch {
      setGeneralError('Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create account</h1>
          <p className="text-slate-500 text-sm mb-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">I am signing up as</p>
              <div className="grid grid-cols-2 gap-3">
                {(['PARTICIPANT', 'ADMIN'] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRole === r
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" value={r} className="text-blue-600" {...register('role')} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {r === 'PARTICIPANT' ? 'Participant / Student' : 'Quiz Admin'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r === 'PARTICIPANT' ? 'Take quizzes' : 'Create & manage quizzes'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="Full Name"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register('name')}
            />

            <div className="space-y-1">
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message || undefined}
                className={emailTakenError ? 'border-red-300 bg-red-50' : ''}
                {...register('email')}
              />
              {emailTakenError && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">
                    {emailTakenError}{' '}
                    <Link to="/login" className="font-semibold underline">Sign in</Link>
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

            <Button type="submit" loading={loading} className="w-full justify-center" size="lg">
              Create account
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

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setGeneralError('Google sign-up failed. Please try again.')}
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
