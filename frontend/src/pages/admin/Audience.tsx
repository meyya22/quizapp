import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, Upload, Send, CheckCircle,
  AlertCircle, Copy, ChevronDown, ChevronUp, X, Mail, History,
  ChevronLeft, ChevronRight, FileSpreadsheet, Pen, Eye, Trash,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Contact, Quiz } from '../../types';
import * as XLSX from 'xlsx';

interface EmailQuota { used: number; limit: number; resetDate: string }
interface EmailHistoryEntry { id: string; contactEmail: string; contactName: string; quizTitle: string; sentAt: string }

function ContactLimitBar({ count, limit, tier }: { count: number; limit: number; tier: string }) {
  const pct = Math.min((count / limit) * 100, 100);
  const near = pct >= 80;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">
          Contacts: <span className="font-bold">{count}</span> / {limit}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          tier === 'PAID' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {tier === 'PAID' ? 'Paid — 500 limit' : 'Free — 10 limit'}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${near ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
      </div>
      {near && count < limit && <p className="text-xs text-amber-600 mt-1">Approaching limit — {limit - count} remaining</p>}
      {count >= limit && (
        <p className="text-xs text-red-600 mt-1">
          Limit reached. {tier === 'FREE' ? 'Upgrade to add up to 500 contacts.' : 'Maximum reached.'}
        </p>
      )}
    </div>
  );
}

function EmailQuotaBar({ quota, tier }: { quota: EmailQuota; tier: string }) {
  const pct = Math.min((quota.used / quota.limit) * 100, 100);
  const near = pct >= 80;
  const resetDate = new Date(quota.resetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          Emails sent this month: <span className="font-bold">{quota.used}</span> / {quota.limit}
        </span>
        <span className="text-xs text-slate-400">Resets {resetDate}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-400' : near ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 100 && (
        <p className="text-xs text-red-600 mt-1">
          Monthly limit reached.{' '}
          {tier === 'FREE'
            ? <Link to="/payment" className="font-semibold underline">Upgrade to Paid</Link>
            : `Resets on ${resetDate}.`}
        </p>
      )}
      {near && pct < 100 && <p className="text-xs text-amber-600 mt-1">{quota.limit - quota.used} emails remaining this month</p>}
    </div>
  );
}

function PaginationBar({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
      <span className="text-xs text-slate-500">Page {page} of {pages}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page === 1}
          className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-7 h-7 rounded text-xs font-medium ${n === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>
            {n}
          </button>
        ))}
        <button onClick={() => onChange(page + 1)} disabled={page === pages}
          className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const DEFAULT_SUBJECT = "You're invited: {{quiz_title}}";
const DEFAULT_BODY = `Hi {{name}},

You've been invited to take a quiz: "{{quiz_title}}".

Click the link below to start:
{{quiz_url}}

Good luck!`;

function ComposeModal({
  selectedCount,
  quizTitle,
  quizUrl,
  firstContactName,
  onSend,
  onClose,
  sending,
}: {
  selectedCount: number;
  quizTitle: string;
  quizUrl: string;
  firstContactName: string;
  onSend: (subject: string, body: string) => void;
  onClose: () => void;
  sending: boolean;
}) {
  const [tab, setTab] = useState<'compose' | 'preview'>('compose');
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  function previewReplace(s: string) {
    return s
      .replace(/\{\{name\}\}/g, firstContactName || 'Jane Doe')
      .replace(/\{\{quiz_title\}\}/g, quizTitle)
      .replace(/\{\{quiz_url\}\}/g, quizUrl);
  }

  function insertVar(v: string) {
    setBody((b) => b + v);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-600" /> Compose Email
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {(['compose', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'compose' ? <><Pen className="w-3.5 h-3.5" /> Compose</> : <><Eye className="w-3.5 h-3.5" /> Preview</>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'compose' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={9}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Insert variable:</p>
                <div className="flex flex-wrap gap-2">
                  {['{{name}}', '{{quiz_title}}', '{{quiz_url}}'].map((v) => (
                    <button key={v} onClick={() => insertVar(v)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-mono transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Variables are replaced per recipient before sending.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="bg-white rounded-xl p-5 shadow-sm max-w-sm mx-auto">
                <p className="text-xs text-slate-400 mb-3 font-medium">
                  Subject: {previewReplace(subject)}
                </p>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewReplace(body).split('{{quiz_url}}').map((part, i, arr) =>
                    i < arr.length - 1 ? (
                      <span key={i}>
                        {part}
                        <a href="#" className="text-blue-600 underline">{quizUrl}</a>
                      </span>
                    ) : part
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-4">Sent via Xam Bridge</p>
              </div>
              <p className="text-xs text-slate-400 text-center mt-3">
                Previewing for: <strong>{firstContactName || 'Jane Doe'}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
          <button
            onClick={() => onSend(subject, body)}
            disabled={sending || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : `Send to ${selectedCount} contact${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const CONTACTS_PER_PAGE = 10;
const HISTORY_PER_PAGE = 10;

export default function Audience() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [broadcastResult, setBroadcastResult] = useState<{
    sent: number; failed: number; quizUrl?: string; error?: string;
    skippedByQuota?: number; emailQuota?: EmailQuota;
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [contactPage, setContactPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const { data: contactData } = useQuery<{
    contacts: Contact[]; limit: number; tier: string; emailQuota: EmailQuota;
  }>({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then((r) => r.data),
  });

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: historyData, refetch: refetchHistory } = useQuery<{
    history: EmailHistoryEntry[]; total: number; pages: number;
  }>({
    queryKey: ['email-history', historyPage],
    queryFn: () => api.get(`/contacts/email-history?page=${historyPage}&pageSize=${HISTORY_PER_PAGE}`).then((r) => r.data),
    enabled: showHistory,
  });

  const contacts = contactData?.contacts ?? [];
  const limit = contactData?.limit ?? 10;
  const tier = contactData?.tier ?? 'FREE';
  const emailQuota: EmailQuota = contactData?.emailQuota ?? { used: 0, limit: tier === 'PAID' ? 500 : 50, resetDate: '' };
  const publicQuizzes = quizzes.filter((q) => q.visibility === 'PUBLIC' && q.published);

  const contactPages = Math.max(1, Math.ceil(contacts.length / CONTACTS_PER_PAGE));
  const pagedContacts = contacts.slice((contactPage - 1) * CONTACTS_PER_PAGE, contactPage * CONTACTS_PER_PAGE);

  const selectedQuizObj = quizzes.find((q) => q.id === selectedQuiz);
  const firstSelectedContact = contacts.find((c) => selected.has(c.id));
  const frontendUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '') || window.location.origin;
  const previewQuizUrl = selectedQuiz ? `${frontendUrl}/quiz/${selectedQuiz}` : '';

  const addMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => api.post('/contacts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setNewName(''); setNewEmail(''); setAddError(''); setShowAddForm(false);
    },
    onError: (e: unknown) => setAddError((e as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to add contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }).then((r) => r.data),
    onSuccess: () => {
      setSelected(new Set());
      setContactPage(1);
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload: { quizId: string; contactIds: string[]; customSubject?: string; customBody?: string }) =>
      api.post('/contacts/broadcast', payload).then((r) => r.data),
    onSuccess: (data) => {
      setBroadcastResult(data);
      setShowComposeModal(false);
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['email-history'] });
      refetchHistory();
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { error?: string; emailQuota?: EmailQuota } } }).response?.data;
      setBroadcastResult({ sent: 0, failed: selected.size, error: data?.error || 'Broadcast failed', emailQuota: data?.emailQuota });
      setShowComposeModal(false);
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)));
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await api.post('/contacts/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const d = res.data;
      setImportResult(`Imported ${d.added} contacts. ${d.duplicates} duplicates skipped.${d.skipped ? ` ${d.skipped} over limit.` : ''}`);
      qc.invalidateQueries({ queryKey: ['contacts'] });
    } catch (err: unknown) {
      setImportResult((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Import failed');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleBroadcastClick() {
    if (!selectedQuiz || selected.size === 0) return;
    setBroadcastResult(null);
    if (tier === 'PAID') {
      setShowComposeModal(true);
    } else {
      broadcastMutation.mutate({ quizId: selectedQuiz, contactIds: Array.from(selected) });
    }
  }

  function handleComposeSend(customSubject: string, customBody: string) {
    broadcastMutation.mutate({
      quizId: selectedQuiz,
      contactIds: Array.from(selected),
      customSubject,
      customBody,
    });
  }

  function exportContactsExcel() {
    const rows = contacts.map((c) => ({
      Name: c.name,
      Email: c.email,
      'Added': new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts');
    XLSX.writeFile(wb, 'contacts.xlsx');
  }

  async function exportHistoryExcel() {
    const { data } = await api.get('/contacts/email-history?download=true');
    const history: EmailHistoryEntry[] = data;
    const rows = history.map((h) => ({
      Date: new Date(h.sentAt).toLocaleString('en-US'),
      Recipient: h.contactName,
      Email: h.contactEmail,
      Quiz: h.quizTitle,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Email History');
    XLSX.writeFile(wb, 'email-history.xlsx');
  }

  const canAdd = contacts.length < limit;
  const quotaExhausted = emailQuota.used >= emailQuota.limit;

  return (
    <div>
      {showComposeModal && selectedQuizObj && (
        <ComposeModal
          selectedCount={selected.size}
          quizTitle={selectedQuizObj.title}
          quizUrl={previewQuizUrl}
          firstContactName={firstSelectedContact?.name ?? ''}
          onSend={handleComposeSend}
          onClose={() => setShowComposeModal(false)}
          sending={broadcastMutation.isPending}
        />
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Audience
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your contacts and broadcast quizzes via email.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            onClick={() => setShowAddForm((v) => !v)}
            disabled={!canAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add Contact
            {showAddForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quota bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <ContactLimitBar count={contacts.length} limit={limit} tier={tier} />
        <EmailQuotaBar quota={emailQuota} tier={tier} />
      </div>

      {importResult && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {importResult}
          <button onClick={() => setImportResult('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Add New Contact</h3>
          <div className="flex gap-3 flex-wrap">
            <input type="text" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[160px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="email" placeholder="Email address" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={() => addMutation.mutate({ name: newName, email: newEmail })}
              disabled={!newName || !newEmail || addMutation.isPending}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
          <p className="text-xs text-slate-400 mt-2">
            CSV format: <code className="bg-slate-100 px-1 rounded">name,email</code> — one per line, header row optional.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Contact list */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {contacts.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-medium text-slate-500">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={exportContactsExcel}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
                </button>
              </div>
            )}
            {contacts.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No contacts yet. Add some above or import a CSV.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 w-10">
                          <input type="checkbox" checked={selected.size === contacts.length && contacts.length > 0} onChange={toggleAll} className="rounded" />
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Added</th>
                        <th className="px-4 py-3 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {pagedContacts.map((c, idx) => (
                        <tr key={c.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${selected.has(c.id) ? 'bg-blue-50/50' : idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-4 py-3">
                            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded" />
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                          <td className="px-4 py-3 text-slate-600">{c.email}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">
                            {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => { if (confirm(`Remove ${c.name}?`)) deleteMutation.mutate(c.id); }}
                              className="text-slate-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar page={contactPage} pages={contactPages} onChange={setContactPage} />
              </>
            )}
          </div>
          {selected.size > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-500 ml-1">
                {selected.size} contact{selected.size !== 1 ? 's' : ''} selected
                {selected.size < contacts.length ? ' (across all pages)' : ''}
              </p>
              <button
                onClick={() => {
                  const all = selected.size === contacts.length;
                  const msg = all
                    ? `Delete all ${selected.size} contacts? This cannot be undone.`
                    : `Delete ${selected.size} selected contact${selected.size !== 1 ? 's' : ''}? This cannot be undone.`;
                  if (confirm(msg)) bulkDeleteMutation.mutate(Array.from(selected));
                }}
                disabled={bulkDeleteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash className="w-3.5 h-3.5" />
                {bulkDeleteMutation.isPending
                  ? 'Deleting…'
                  : selected.size === contacts.length
                  ? `Delete all ${selected.size}`
                  : `Delete selected (${selected.size})`}
              </button>
            </div>
          )}
        </div>

        {/* Broadcast panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" /> Broadcast Quiz
            </h3>
            <p className="text-xs text-slate-500 mb-4">Send a quiz invitation email to selected contacts.</p>

            {tier === 'PAID' && (
              <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-violet-50 border border-violet-200 rounded-lg">
                <Pen className="w-3 h-3 text-violet-600 shrink-0" />
                <span className="text-xs text-violet-700 font-medium">Custom email composer available</span>
              </div>
            )}

            <label className="text-xs font-medium text-slate-600 block mb-1">Quiz (PUBLIC only)</label>
            <select value={selectedQuiz} onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select a quiz —</option>
              {publicQuizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
            </select>

            {publicQuizzes.length === 0 && (
              <p className="text-xs text-amber-600 mb-4">No published PUBLIC quizzes. Set a quiz to Public and publish it first.</p>
            )}

            {quotaExhausted && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                Monthly email quota reached ({emailQuota.limit}/month).{' '}
                {tier === 'FREE' ? <Link to="/payment" className="font-semibold underline">Upgrade to Paid</Link> : 'Resets 1st of next month.'}
              </div>
            )}

            <button onClick={handleBroadcastClick}
              disabled={!selectedQuiz || selected.size === 0 || broadcastMutation.isPending || quotaExhausted}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
              {broadcastMutation.isPending ? 'Sending...' : selected.size > 0
                ? `${tier === 'PAID' ? 'Compose & Send' : 'Send'} to ${selected.size} contact${selected.size !== 1 ? 's' : ''}`
                : 'Select contacts first'}
            </button>

            {broadcastResult && (
              <div className="mt-4 space-y-2">
                {broadcastResult.error ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {broadcastResult.error.includes('quota') ? 'Quota reached' : 'Email not configured'}
                    </p>
                    {!broadcastResult.error.includes('quota') && (
                      <p className="text-xs text-amber-600">Copy the quiz link below to share manually:</p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-0.5">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent {broadcastResult.sent} email{broadcastResult.sent !== 1 ? 's' : ''}
                    </p>
                    {broadcastResult.failed > 0 && <p className="text-red-600">{broadcastResult.failed} failed</p>}
                    {(broadcastResult.skippedByQuota ?? 0) > 0 && (
                      <p className="text-amber-600">{broadcastResult.skippedByQuota} skipped (monthly quota reached)</p>
                    )}
                    {broadcastResult.emailQuota && (
                      <p className="text-slate-500 pt-0.5">
                        {broadcastResult.emailQuota.used} / {broadcastResult.emailQuota.limit} emails used this month
                      </p>
                    )}
                  </div>
                )}

                {broadcastResult.quizUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Quiz link:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 truncate flex-1">{broadcastResult.quizUrl}</span>
                      <button onClick={() => navigator.clipboard.writeText(broadcastResult.quizUrl!)}
                        className="shrink-0 text-slate-400 hover:text-slate-700" title="Copy link">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email History */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            <History className="w-4 h-4" />
            Email Send History
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {historyData && <span className="text-xs font-normal text-slate-400">({historyData.total} total)</span>}
          </button>
          {showHistory && historyData && historyData.total > 0 && (
            <button
              onClick={exportHistoryExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
          )}
        </div>

        {showHistory && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {!historyData || historyData.history.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No emails sent yet.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Recipient</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-slate-600">Quiz</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.history.map((h, idx) => (
                        <tr key={h.id} className={`border-b border-slate-100 last:border-0 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(h.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{h.contactName}</td>
                          <td className="px-4 py-3 text-slate-500">{h.contactEmail}</td>
                          <td className="px-4 py-3 text-slate-700">{h.quizTitle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  page={historyPage}
                  pages={historyData.pages}
                  onChange={setHistoryPage}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
