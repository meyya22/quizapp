import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Users, CheckSquare, Square, Search, Send,
  ChevronDown, ChevronUp, Pencil, CheckCircle, AlertCircle, History, X, Sparkles, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { UserRecord } from '../../types';

interface CampaignHistoryRecord {
  id: string;
  templateName: string;
  subject: string;
  sent: number;
  failed: number;
  sentAt: string;
  type: string;
}

interface CampaignRecipient {
  id: string;
  name: string;
  email: string;
}

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
    name: 'Meet XamGeni',
    tag: 'Generate your own quiz',
    subject: 'Test yourself on anything with XamGeni, {name}',
    body: `Hi {name},

Did you know you can generate a personalised quiz on any topic in seconds — completely free?

XamGeni, powered by Claude AI, is built right into your Xam Bridge account. Just pick a topic, choose your difficulty and number of questions, and XamGeni crafts a quiz tailored for you — with correct answers and detailed explanations included.

Some ideas to get started:
- "UPSC History" or "SAT Math" for competitive exams
- "Python Programming" or "Data Structures" for tech certifications
- "Human Anatomy" or "Pharmacology" for medical entrance prep
- Any topic you're currently studying

Log in to your Xam Bridge account and tap ExamPrep to generate your first XamGeni quiz today.

Your knowledge is waiting to be tested. Let's find out what you know.`,
  },
  {
    id: 1,
    name: 'Explore Quizzes',
    tag: '100s of mock tests ready',
    subject: '{name} Hundreds of mock test ready for you',
    body: `Hi {name},

NEET, JEE, CBSE, UPSC, CUET, SSC CGL, IBPS, RRB NTPC, GATE — all mock test papers are available in one place

Gives you real CBT experience with timer

Multilingual Support — Hindi, Tamil, Bengali, Marathi, Telugu and more, making it accessible beyond English-medium students

Take exam in "Study Mode" and understand the question along with answer explanation

It's completely Web-based, mobile-friendly, no app download is needed

Hundreds of practice exams and thousands of questions crafted for you to score high`,
  },
  {
    id: 2,
    name: 'Come Back',
    tag: 'Re-engage & retake',
    subject: 'Your quizzes are still waiting, {name}',
    body: `Hi {name},

It's been a while since you last visited Xam Bridge — and your quizzes are patiently waiting.

Whether you want to:
- Retake a XamGeni quiz and beat your previous score
- Explore a new quiz from an educator in your field
- Challenge yourself on a brand-new topic with XamGeni

...your personalised quiz history is saved and ready. Consistent practice, even just 5 minutes a day, builds lasting knowledge faster than any marathon study session.

The best time to study was yesterday. The second best time is right now.

Log back in and pick up where you left off. Your next correct answer is closer than you think.`,
  },
  {
    id: 3,
    name: 'Daily Habit',
    tag: '5-minute study habit',
    subject: 'The 5-minute study habit that actually works, {name}',
    body: `Hi {name},

Research consistently shows that short, frequent quizzing beats long cramming sessions. It's called spaced repetition — and it's the reason top performers use it.

Here's a simple habit that takes just 5 minutes a day:

1. Open XamGeni in your Xam Bridge account
2. Pick a topic you're studying — or something you're curious about
3. Generate 5 questions at your chosen difficulty
4. Review the explanation for anything you got wrong
5. Repeat tomorrow with a slightly different angle

In a week, you'll have covered 7 topics. In a month, 30. All without stress, without cramming, without burning out.

And don't forget — teachers, trainers, and professionals have published quizzes across dozens of domains on Xam Bridge. You have access to all of it: industry certifications, academic exams, corporate training, and more.

XamGeni and all participant quizzes are completely free, forever. No subscriptions. No limits on retakes.

Start your 5-minute session today. Log in and tap ExamPrep.

Knowledge compounds. Start now.`,
  },
];

export default function ParticipantEmailCampaign() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'last30'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [editMode, setEditMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignHistoryRecord | null>(null);

  const { data: allUsers = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['all-users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<CampaignHistoryRecord[]>({
    queryKey: ['campaign-history'],
    queryFn: () => api.get('/users/campaign-history').then((r) => r.data),
    enabled: historyOpen,
  });

  const { data: recipients = [], isLoading: recipientsLoading } = useQuery<CampaignRecipient[]>({
    queryKey: ['campaign-recipients', selectedCampaign?.id],
    queryFn: () =>
      api.get(`/users/campaign-history/${selectedCampaign!.id}/recipients`).then((r) => r.data),
    enabled: !!selectedCampaign,
  });

  const participants = useMemo(
    () => allUsers.filter((u) => u.role === 'PARTICIPANT'),
    [allUsers],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOfDay(now);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const last7 = new Date(today); last7.setDate(today.getDate() - 7);
    const last30 = new Date(today); last30.setDate(today.getDate() - 30);

    let list = participants;

    if (dateFilter !== 'all') {
      list = list.filter((u) => {
        const joined = new Date(u.createdAt);
        if (dateFilter === 'today')     return joined >= today;
        if (dateFilter === 'yesterday') return joined >= yesterday && joined < today;
        if (dateFilter === 'last7')     return joined >= last7;
        if (dateFilter === 'last30')    return joined >= last30;
        return true;
      });
    }

    const q = search.toLowerCase();
    return q
      ? list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : list;
  }, [participants, search, dateFilter]);

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

    if (!confirm(`Send this campaign to ${selected.size} learner${selected.size > 1 ? 's' : ''}?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await api.post('/users/participant-email-campaign', {
        recipientIds: Array.from(selected),
        subject,
        body,
        templateName: TEMPLATES[activeTemplate]?.name ?? 'Custom',
      });
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ['campaign-history'] });
      toast.success(`Sent to ${res.data.sent} learner${res.data.sent !== 1 ? 's' : ''}`);
    } catch {
      toast.error('Campaign failed. Check SMTP configuration.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      {/* Template preview modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{previewTemplate.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{previewTemplate.tag}</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Subject</p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{previewTemplate.subject}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Body</p>
                <pre className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-3 whitespace-pre-wrap font-sans leading-relaxed">{previewTemplate.body}</pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setPreviewTemplate(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Close</button>
              <button
                onClick={() => { applyTemplate(previewTemplate); setPreviewTemplate(null); }}
                className="px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700"
              >
                Use Template
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Learner Campaigns</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Send motivational campaigns to participants — encourage XamGeni usage and quiz discovery.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Learners', value: participants.length, color: 'text-slate-900' },
          { label: 'Selected', value: selected.size, color: 'text-violet-700' },
          { label: 'Will Receive', value: selected.size, color: 'text-emerald-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Participant list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800 text-sm">
                Learners
                <span className="ml-1.5 text-xs font-normal text-slate-400">({participants.length})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-violet-600 hover:underline">
                Select all
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={deselectAll} className="text-xs font-medium text-slate-500 hover:underline">
                Clear
              </button>
            </div>
          </div>

          {/* Date filter */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-1.5 flex-wrap">
            {([
              { value: 'all',       label: 'All time' },
              { value: 'today',     label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7',     label: 'Last 7 days' },
              { value: 'last30',    label: 'Last 30 days' },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setDateFilter(value); setSelected(new Set()); }}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  dateFilter === value
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
            {dateFilter !== 'all' && (
              <span className="ml-auto text-xs text-violet-600 font-semibold">
                {filtered.length} learner{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No learners found</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[440px] divide-y divide-slate-100">
              {filtered.map((user) => {
                const isSelected = selected.has(user.id);
                return (
                  <div
                    key={user.id}
                    onClick={() => toggleOne(user.id)}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors select-none ${
                      isSelected ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-violet-600 shrink-0" />
                      : <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <span className="ml-auto text-xs text-slate-400 shrink-0">
                      {user._count?.attempts ?? 0} attempt{(user._count?.attempts ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {selected.size > 0 && (
            <div className="px-5 py-3 bg-violet-50 border-t border-violet-100 text-xs text-violet-700 font-medium">
              {selected.size} learner{selected.size > 1 ? 's' : ''} selected
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
                  <div
                    key={t.id}
                    className={`relative p-3 rounded-lg border transition-colors ${
                      activeTemplate === t.id
                        ? 'border-violet-400 bg-violet-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <button className="text-left w-full" onClick={() => applyTemplate(t)}>
                      <p className={`text-xs font-semibold pr-6 ${activeTemplate === t.id ? 'text-violet-700' : 'text-slate-700'}`}>
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{t.tag}</p>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewTemplate(t); }}
                      title="Preview"
                      className="absolute top-2.5 right-2.5 text-slate-400 hover:text-violet-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors"
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
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                  editMode ? 'border-violet-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
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
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors resize-none font-mono ${
                  editMode ? 'border-violet-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
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
              className="w-full justify-center bg-violet-600 hover:bg-violet-700 focus:ring-violet-500"
              size="lg"
            >
              <Send className="w-4 h-4" />
              Send to {selected.size || 0} Learner{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign History */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
          onClick={() => setHistoryOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-800 text-sm">Campaign History</span>
            {history.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full">
                {history.length}
              </span>
            )}
          </div>
          {historyOpen
            ? <ChevronUp className="w-4 h-4 text-slate-400" />
            : <ChevronDown className="w-4 h-4 text-slate-400" />
          }
        </button>

        {historyOpen && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <History className="w-7 h-7 mb-2 opacity-40" />
                <p className="text-sm">No campaigns sent yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Template</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Sent</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Failed</th>
                    <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                          {h.templateName}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600 max-w-xs truncate">{h.subject}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          h.type === 'LEARNER'
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {h.type === 'LEARNER' ? 'Learner' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setSelectedCampaign(h)}
                          className="text-sm font-semibold text-emerald-700 underline decoration-dotted hover:text-emerald-900 transition-colors"
                          title="View recipients"
                        >
                          {h.sent}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-semibold ${h.failed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {h.failed}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {new Date(h.sentAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Recipients modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">Campaign Recipients</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-violet-700">{selectedCampaign.templateName}</span>
                  {' '}&middot;{' '}
                  {new Date(selectedCampaign.sentAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' '}&middot;{' '}
                  <span className="text-emerald-700 font-medium">{selectedCampaign.sent} sent</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-2 text-xs text-slate-400 border-b border-slate-100">
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
            </div>

            <div className="overflow-y-auto flex-1">
              {recipientsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <Users className="w-7 h-7 mb-2 opacity-40" />
                  <p className="text-sm">No recipients recorded</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">#</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-6 py-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recipients.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-xs text-slate-400">{i + 1}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{r.name}</td>
                        <td className="px-6 py-3 text-sm text-slate-500">{r.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
