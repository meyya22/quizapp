import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BookUser, UserPlus, Upload, Search, Trash2, Send, Mail,
  CheckSquare, Square, ChevronDown, ChevronUp, History,
  CheckCircle, AlertCircle, Pencil, Users, MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketingContact {
  id: string;
  name: string;
  email: string;
  location: string | null;
  source: string;
  createdAt: string;
}

interface ContactsResponse {
  contacts: MarketingContact[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CampaignHistory {
  id: string;
  templateName: string;
  subject: string;
  sent: number;
  failed: number;
  sentAt: string;
}

interface Template {
  id: number;
  name: string;
  tag: string;
  subject: string;
  body: string;
}

// ─── Templates (same 4 as Learner Campaigns) ──────────────────────────────────

const TEMPLATES: Template[] = [
  {
    id: 0,
    name: 'Meet XamGeni',
    tag: 'Generate your own quiz',
    subject: 'Test yourself on anything with XamGeni, {name}',
    body: `Hi {name},

Did you know you can generate a personalised quiz on any topic in seconds — completely free?

XamGeni, powered by Claude AI, lets you pick a topic, choose your difficulty and number of questions, and crafts a quiz tailored for you — with correct answers and detailed explanations included.

Some ideas to get started:
- "UPSC History" or "SAT Math" for competitive exams
- "Python Programming" or "Data Structures" for tech certifications
- "Human Anatomy" or "Pharmacology" for medical entrance prep
- Any topic you're currently studying

Sign up free at Xam Bridge and tap ExamPrep to generate your first XamGeni quiz today.

Your knowledge is waiting to be tested.`,
  },
  {
    id: 1,
    name: 'Explore Quizzes',
    tag: '100s of admin quizzes',
    subject: '{name}, quizzes on every topic are ready for you',
    body: `Hi {name},

Teachers, trainers, and subject-matter experts on Xam Bridge have published quizzes across hundreds of topics and domains — and you have access to all of them.

From professional certifications to competitive exams, corporate compliance to academic subjects, there's a quiz for almost anything you're working towards.

Here's what's waiting for you:
- Multiple-choice, True/False, and multi-answer questions
- Instant scoring with pass/fail results and detailed explanations
- Questions crafted by educators, industry professionals, and publishers
- Available in 9 languages including Hindi, Tamil, Spanish, and more

Sign up free at Xam Bridge and start quizzing today.

Hundreds of quizzes. Thousands of questions. All free.`,
  },
  {
    id: 2,
    name: 'Come Back',
    tag: 'Re-engage & retake',
    subject: 'Your quizzes are still waiting, {name}',
    body: `Hi {name},

Whether you want to:
- Generate a XamGeni quiz and test yourself on any topic
- Explore a quiz published by an educator in your field
- Challenge yourself on something brand new

...Xam Bridge has you covered — and it's completely free to get started.

Consistent practice, even just 5 minutes a day, builds lasting knowledge faster than any marathon study session.

The best time to study was yesterday. The second best time is right now.

Sign up and start your first quiz today.`,
  },
  {
    id: 3,
    name: 'Daily Habit',
    tag: '5-minute study habit',
    subject: 'The 5-minute study habit that actually works, {name}',
    body: `Hi {name},

Research consistently shows that short, frequent quizzing beats long cramming sessions. It's called spaced repetition — and it's the reason top performers use it.

Here's a simple habit that takes just 5 minutes a day:

1. Open XamGeni at Xam Bridge (free sign up)
2. Pick a topic you're studying — or something you're curious about
3. Generate 5 questions at your chosen difficulty
4. Review the explanation for anything you got wrong
5. Repeat tomorrow with a slightly different angle

In a week, you'll have covered 7 topics. In a month, 30.

XamGeni and all participant quizzes are completely free. No credit card needed.

Start your 5-minute session today.

Knowledge compounds. Start now.`,
  },
];

// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if ((ch === ',' || ch === ';') && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text: string): { name: string; email: string; location: string }[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/"/g, '').toLowerCase().trim());
  const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
  const nameIdx = headers.findIndex((h) => h.includes('name'));
  const locIdx = headers.findIndex((h) => h.includes('location') || h.includes('city') || h.includes('country') || h.includes('region'));
  if (emailIdx === -1) return [];
  return lines.slice(1).flatMap((line) => {
    const f = parseCSVLine(line);
    const email = (f[emailIdx] || '').replace(/"/g, '').trim().toLowerCase();
    if (!email || !email.includes('@')) return [];
    return [{
      name: nameIdx >= 0 ? (f[nameIdx] || '').replace(/"/g, '').trim() || email.split('@')[0] : email.split('@')[0],
      email,
      location: locIdx >= 0 ? (f[locIdx] || '').replace(/"/g, '').trim() : '',
    }];
  });
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ContactBuilder() {
  const qc = useQueryClient();

  // Add contacts state
  const [addTab, setAddTab] = useState<'manual' | 'csv'>('manual');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [csvParsed, setCsvParsed] = useState<{ name: string; email: string; location: string }[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Contacts table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Campaign state
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [body, setBody] = useState(TEMPLATES[0].body);
  const [editMode, setEditMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: contactsData, isLoading: contactsLoading } = useQuery<ContactsResponse>({
    queryKey: ['marketing-contacts', page, search],
    queryFn: () =>
      api.get('/marketing-contacts', { params: { page, search: search || undefined } }).then((r) => r.data),
    staleTime: 15_000,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<CampaignHistory[]>({
    queryKey: ['marketing-campaign-history'],
    queryFn: () => api.get('/marketing-contacts/campaign-history').then((r) => r.data),
    enabled: historyOpen,
  });

  const contacts = contactsData?.contacts ?? [];
  const totalContacts = contactsData?.total ?? 0;
  const totalPages = contactsData?.totalPages ?? 1;

  // ─── Mutations ────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: (data: { name: string; email: string; location: string }) =>
      api.post('/marketing-contacts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setManualName(''); setManualEmail(''); setManualLocation('');
      toast.success('Contact added.');
    },
    onError: () => toast.error('Failed to add contact.'),
  });

  const bulkMutation = useMutation({
    mutationFn: (contacts: { name: string; email: string; location: string }[]) =>
      api.post('/marketing-contacts/bulk', { contacts }).then((r) => r.data),
    onSuccess: (data: { added: number; skipped: number }) => {
      qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setCsvParsed([]); setCsvFileName('');
      toast.success(`Imported ${data.added} contacts${data.skipped ? `, ${data.skipped} skipped` : ''}.`);
    },
    onError: () => toast.error('Bulk import failed.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.delete('/marketing-contacts', { data: { ids } }).then((r) => r.data),
    onSuccess: (data: { deleted: number }) => {
      qc.invalidateQueries({ queryKey: ['marketing-contacts'] });
      setSelected(new Set());
      toast.success(`Deleted ${data.deleted} contact${data.deleted !== 1 ? 's' : ''}.`);
    },
    onError: () => toast.error('Delete failed.'),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function handleFileRead(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file.'); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error('No valid contacts found. Ensure CSV has an "email" column.');
        return;
      }
      setCsvParsed(parsed);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, []);

  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function selectAll() { setSelected(new Set(contacts.map((c) => c.id))); }
  function deselectAll() { setSelected(new Set()); }

  function applyTemplate(t: Template) {
    setActiveTemplate(t.id); setSubject(t.subject); setBody(t.body);
    setEditMode(false); setSendResult(null);
  }

  async function handleSend() {
    if (!selected.size) { toast.error('Select at least one contact.'); return; }
    if (!subject.trim() || !body.trim()) { toast.error('Subject and body cannot be empty.'); return; }
    if (!confirm(`Send campaign to ${selected.size} contact${selected.size !== 1 ? 's' : ''}?`)) return;
    setSending(true); setSendResult(null);
    try {
      const res = await api.post('/marketing-contacts/campaign', {
        contactIds: Array.from(selected),
        subject, body,
        templateName: TEMPLATES[activeTemplate]?.name ?? 'Custom',
      });
      setSendResult(res.data);
      qc.invalidateQueries({ queryKey: ['marketing-campaign-history'] });
      toast.success(`Sent to ${res.data.sent} contact${res.data.sent !== 1 ? 's' : ''}.`);
    } catch {
      toast.error('Campaign failed. Check SMTP configuration.');
    } finally {
      setSending(false);
    }
  }

  function handleSearchChange(val: string) { setSearch(val); setPage(1); }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center shrink-0">
            <BookUser className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Contact Builder</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Build your marketing contact list and run campaigns to promote Xam Bridge.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Contacts', value: totalContacts, color: 'text-slate-900' },
          { label: 'Selected', value: selected.size, color: 'text-rose-700' },
          { label: 'Will Receive', value: selected.size, color: 'text-emerald-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add Contacts */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['manual', 'csv'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAddTab(tab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                addTab === tab
                  ? 'border-rose-600 text-rose-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'manual' ? <UserPlus className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {tab === 'manual' ? 'Manual Entry' : 'CSV Upload'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {addTab === 'manual' ? (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Chennai, India"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <button
                onClick={() => {
                  if (!manualEmail.trim()) { toast.error('Email is required.'); return; }
                  addMutation.mutate({ name: manualName, email: manualEmail, location: manualLocation });
                }}
                disabled={addMutation.isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {addMutation.isPending ? 'Adding…' : 'Add Contact'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? 'border-rose-400 bg-rose-50' : 'border-slate-300 hover:border-rose-300 hover:bg-slate-50'
                }`}
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  {csvFileName ? csvFileName : 'Drag & drop a CSV file, or click to browse'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Expected columns: <code className="bg-slate-100 px-1 rounded">name</code>, <code className="bg-slate-100 px-1 rounded">email</code>, <code className="bg-slate-100 px-1 rounded">location</code> (email required)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileRead(f); }}
                />
              </div>

              {csvParsed.length > 0 && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <span className="text-sm text-emerald-800 font-medium">
                    {csvParsed.length} valid contact{csvParsed.length !== 1 ? 's' : ''} ready to import
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCsvParsed([]); setCsvFileName(''); }}
                      className="text-xs text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => bulkMutation.mutate(csvParsed)}
                      disabled={bulkMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                    >
                      {bulkMutation.isPending ? 'Importing…' : `Import ${csvParsed.length} Contacts`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contacts + Campaign — 2-col on lg */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">

        {/* Left: Contacts table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800 text-sm">
                Contacts
                <span className="ml-1.5 text-xs font-normal text-slate-400">({totalContacts})</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-rose-600 hover:underline">
                Select page
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={deselectAll} className="text-xs font-medium text-slate-500 hover:underline">
                Clear
              </button>
              {selected.size > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${selected.size} contact${selected.size !== 1 ? 's' : ''}?`)) {
                        deleteMutation.mutate(Array.from(selected));
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="text-xs font-medium text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete {selected.size}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or email…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          {contactsLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">{search ? 'No contacts match your search' : 'No contacts yet — add some above'}</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100 flex-1">
              {contacts.map((c) => {
                const isSel = selected.has(c.id);
                return (
                  <label
                    key={c.id}
                    className={`flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors ${
                      isSel ? 'bg-rose-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(c.id)} className="sr-only" />
                    {isSel
                      ? <CheckSquare className="w-4 h-4 text-rose-600 shrink-0" />
                      : <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    }
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
                    </div>
                    {c.location && (
                      <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <MapPin className="w-3 h-3" />{c.location}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      c.source === 'csv' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.source}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              <span>Page {page} of {totalPages} &middot; {totalContacts} total</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 border border-slate-200 rounded hover:bg-white disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded hover:bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {selected.size > 0 && (
            <div className="px-5 py-3 bg-rose-50 border-t border-rose-100 text-xs text-rose-700 font-medium">
              {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Right: Campaign composer */}
        <div className="flex flex-col gap-4">
          {/* Template picker */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowTemplates((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800 text-sm">Choose a Template</span>
              </div>
              {showTemplates ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {showTemplates && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      activeTemplate === t.id
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <p className={`text-xs font-semibold ${activeTemplate === t.id ? 'text-rose-700' : 'text-slate-700'}`}>
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
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600 transition-colors"
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
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-colors ${
                  editMode ? 'border-rose-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              />
              <p className="text-xs text-slate-400 mt-1">
                Tip: <code className="bg-slate-100 px-1 rounded">{'{name}'}</code> is replaced with each contact's name
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={!editMode}
                rows={11}
                className={`w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 transition-colors resize-none font-mono ${
                  editMode ? 'border-rose-300 bg-white' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              />
            </div>

            {sendResult && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                sendResult.failed === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                {sendResult.failed === 0
                  ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                }
                <p>
                  <strong>{sendResult.sent}</strong> sent successfully.
                  {sendResult.failed > 0 && <> <strong>{sendResult.failed}</strong> failed.</>}
                </p>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !selected.size}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send to {selected.size || 0} Contact{selected.size !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Campaign History */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
          {historyOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {historyOpen && (
          <div className="border-t border-slate-100">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <History className="w-7 h-7 mb-2 opacity-40" />
                <p className="text-sm">No campaigns sent yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Template</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Subject</th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Sent</th>
                      <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Failed</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                            {h.templateName}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600 max-w-xs truncate">{h.subject}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-semibold text-emerald-700">{h.sent}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
