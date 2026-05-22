import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Mail, Users, CheckSquare, Square, Search, Send,
  ChevronDown, ChevronUp, Pencil, CheckCircle, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { UserRecord } from '../../types';

interface Template {
  id: number;
  name: string;
  tag: string;
  subject: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 0,
    name: 'Feature Discovery',
    tag: 'Limits & unlock',
    subject: "You're only scratching the surface of Xam Bridge, {name}",
    body: `Hi {name},

You registered on Xam Bridge and created your free account — great first step!

But here's the thing: on the Free plan you're working with just 5 quizzes, 3 AI question sets per month, and 50 total responses. That's enough to get started, but not enough to grow.

With Xam Bridge Pro ($5/month) you unlock:

- 50 quizzes with 100 questions each
- 25 AI question generations per month
- 2,000 quiz responses per month
- 500 contacts + 500 broadcast emails per month
- Quiz translation in 6 languages
- Advanced analytics, Excel & PDF export

Your learners deserve a better experience. Make the jump — it's less than a coffee per week.`,
  },
  {
    id: 1,
    name: 'AI Question Generator',
    tag: 'Save time with AI',
    subject: 'Save hours every week with AI-powered quizzes, {name}',
    body: `Hi {name},

Still writing quiz questions by hand?

With Xam Bridge Pro, the built-in AI generates professional, well-structured multiple-choice questions from any topic in seconds. Just describe your subject — the AI creates questions complete with correct answers and detailed explanations.

On the Free plan you get 3 AI generations per month. On Pro, you get 25 — enough to build a full curriculum without spending hours writing questions.

Whether you're training employees, teaching a class, or running assessments, AI-powered question generation is a game-changer.

Xam Bridge Pro costs just $5/month — or $50/year and save 16%.`,
  },
  {
    id: 2,
    name: 'Scale Your Reach',
    tag: 'Grow your audience',
    subject: 'Ready to reach more learners, {name}?',
    body: `Hi {name},

You're using Xam Bridge to test and train your learners — that's exactly what it's built for.

But with the Free plan, you're limited to 50 quiz responses. If you have more than 50 students or employees, some of them simply won't be able to complete their assessments.

Xam Bridge Pro removes that ceiling entirely:

- 2,000 quiz responses per month
- 500 contacts in your audience
- 500 broadcast emails per month to notify learners about new quizzes
- Quizzes in 6 languages: Hindi, Spanish, French, Arabic, Portuguese & Chinese

Whether you're training a small team or testing an entire class, Pro scales with you — at just $5/month.`,
  },
  {
    id: 3,
    name: 'Value Comparison',
    tag: 'Best price on the market',
    subject: 'A full quiz platform + AI for less than a coffee per week, {name}',
    body: `Hi {name},

Consider what you'd pay for a comparable tool:

- Google Forms: no scoring, no analytics, no AI
- Typeform: $25+/month for basic features
- Kahoot: $17/month for educator plan

Xam Bridge Pro gives you AI question generation, multilingual quizzes, advanced analytics, and 2,000 responses per month — for just $5/month.

Or go yearly at $50 and save 16% (that's just $4.17/month, billed once).

We built Xam Bridge to be the most affordable professional quiz platform available. We believe every educator, trainer, and team lead deserves great tools without breaking the budget.

Lock in your Pro plan today.`,
  },
];

export default function EmailCampaign() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [editMode, setEditMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  const { data: allUsers = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const freeAdmins = useMemo(
    () => allUsers.filter((u) => u.role === 'ADMIN' && u.tier === 'FREE'),
    [allUsers],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? freeAdmins.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : freeAdmins;
  }, [freeAdmins, search]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((u) => u.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  function applyTemplate(t: Template) {
    setActiveTemplate(t.id);
    setSubject(t.subject);
    setBody(t.body);
    setEditMode(false);
    setResult(null);
  }

  async function handleSend() {
    if (!selected.size) { toast.error('Select at least one recipient'); return; }
    if (!subject.trim() || !body.trim()) { toast.error('Subject and body cannot be empty'); return; }

    if (!confirm(`Send this campaign to ${selected.size} recipient${selected.size > 1 ? 's' : ''}?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/users/email-campaign', {
        recipientIds: Array.from(selected),
        subject,
        body,
      });
      setResult(res.data);
      toast.success(`Sent to ${res.data.sent} recipient${res.data.sent !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Campaign failed. Check SMTP configuration.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email Campaign</h1>
        <p className="text-slate-500 text-sm mt-1">
          Send upgrade campaigns to Free tier Quiz Admins
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Free Admins', value: freeAdmins.length, color: 'text-slate-900' },
          { label: 'Selected', value: selected.size, color: 'text-blue-700' },
          { label: 'Will Receive', value: selected.size, color: 'text-emerald-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Contact list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800 text-sm">
                Free Admins
                <span className="ml-1.5 text-xs font-normal text-slate-400">({freeAdmins.length})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Select all
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No free admin users found</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[440px] divide-y divide-slate-100">
              {filtered.map((user) => {
                const isSelected = selected.has(user.id);
                return (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(user.id)}
                      className="sr-only"
                    />
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      : <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">
                      {user.quizCount} quiz{user.quizCount !== 1 ? 'zes' : ''}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {selected.size > 0 && (
            <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-700 font-medium">
              {selected.size} recipient{selected.size > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Right: Compose */}
        <div className="flex flex-col gap-4">

          {/* Template selector */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowTemplates((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800 text-sm">Choose a Template</span>
              </div>
              {showTemplates
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </button>
            {showTemplates && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      activeTemplate === t.id
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${activeTemplate === t.id ? 'text-blue-700' : 'text-slate-700'}`}>
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.tag}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 text-sm">Compose</span>
              <button
                onClick={() => setEditMode((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {editMode ? 'Done editing' : 'Edit template'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={!editMode}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  editMode ? 'border-blue-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              />
              <p className="text-xs text-slate-400 mt-1">
                Tip: <code className="bg-slate-100 px-1 rounded">{'{name}'}</code> is replaced with each recipient's name
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!editMode}
                rows={12}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none font-mono ${
                  editMode ? 'border-blue-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              />
            </div>

            {result && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                result.failed === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {result.failed === 0
                  ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                }
                <p>
                  <strong>{result.sent}</strong> sent successfully.
                  {result.failed > 0 && <> <strong>{result.failed}</strong> failed.</>}
                </p>
              </div>
            )}

            <Button
              onClick={handleSend}
              loading={sending}
              disabled={!selected.size}
              className="w-full justify-center"
              size="lg"
            >
              <Send className="w-4 h-4" />
              Send to {selected.size || 0} Recipient{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
