import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, Send, Eye, EyeOff, CheckCircle, AlertCircle, Settings, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface EmailConfigData {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  source: 'database' | 'environment';
  updatedAt: string | null;
}

export default function EmailConfigPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<EmailConfigData>({
    queryKey: ['email-config'],
    queryFn: () => api.get('/email-config').then((r) => r.data),
  });

  const [form, setForm] = useState<EmailConfigData | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Populate form from query data (once)
  const current = form ?? data ?? null;

  function handleChange(field: keyof EmailConfigData, value: string | number) {
    setForm((prev) => ({ ...(prev ?? data!), [field]: value }));
  }

  const saveMutation = useMutation({
    mutationFn: () => api.put('/email-config', {
      host: current?.host,
      port: current?.port,
      user: current?.user,
      pass: current?.pass,
      fromName: current?.fromName,
    }),
    onSuccess: () => {
      toast.success('SMTP settings saved.');
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
      setForm(null);
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? 'Failed to save settings.');
    },
  });

  const testMutation = useMutation({
    mutationFn: () => api.post('/email-config/test', {
      host: current?.host,
      port: current?.port,
      user: current?.user,
      pass: current?.pass,
      fromName: current?.fromName,
      testTo,
    }),
    onSuccess: (res) => {
      setTestResult({ ok: true, msg: res.data.message ?? 'Test email sent.' });
      toast.success('Test email sent successfully.');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      const msg = err.response?.data?.error ?? 'SMTP test failed.';
      setTestResult({ ok: false, msg });
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Email Config</h1>
          <p className="text-sm text-slate-500">SMTP settings used for all outgoing emails</p>
        </div>
      </div>

      {/* Source badge */}
      {data && (
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 ${
          data.source === 'database'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          <Mail className="w-3.5 h-3.5" />
          {data.source === 'database'
            ? `Saved config${data.updatedAt ? ` · updated ${new Date(data.updatedAt).toLocaleDateString()}` : ''}`
            : 'Reading from environment variables (no saved config)'}
        </div>
      )}

      {/* SMTP Settings form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Mail className="w-4 h-4 text-slate-400" /> SMTP Settings
        </h2>

        <div className="space-y-4">
          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">SMTP Host</label>
              <input
                type="text"
                value={current?.host ?? ''}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Port</label>
              <input
                type="number"
                value={current?.port ?? 587}
                onChange={(e) => handleChange('port', parseInt(e.target.value))}
                placeholder="587"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* SMTP User */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">SMTP Username / Email</label>
            <input
              type="text"
              value={current?.user ?? ''}
              onChange={(e) => handleChange('user', e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">SMTP Password / App Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={current?.pass ?? ''}
                onChange={(e) => handleChange('pass', e.target.value)}
                placeholder="Enter password to update"
                className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Leave unchanged to keep the existing stored password.</p>
          </div>

          {/* From Name */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Display Name (From)</label>
            <input
              type="text"
              value={current?.fromName ?? ''}
              onChange={(e) => handleChange('fromName', e.target.value)}
              placeholder="Xam Bridge"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <p className="text-xs text-slate-400 mt-1">Shown as the sender name in email clients.</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-60 transition-colors"
          >
            {saveMutation.isPending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Test Email */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-400" /> Send Test Email
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Uses the settings above (including any unsaved changes) to verify the connection and send a test message.
        </p>

        <div className="flex gap-3">
          <input
            type="email"
            value={testTo}
            onChange={(e) => { setTestTo(e.target.value); setTestResult(null); }}
            placeholder="recipient@example.com"
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !testTo.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {testMutation.isPending
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
              : <><Send className="w-4 h-4" /> Send Test</>}
          </button>
        </div>

        {testResult && (
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg text-sm ${
            testResult.ok
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {testResult.ok
              ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {testResult.msg}
          </div>
        )}
      </div>
    </div>
  );
}
