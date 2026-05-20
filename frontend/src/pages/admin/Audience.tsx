import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Trash2, Upload, Send, CheckCircle,
  AlertCircle, Copy, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import api from '../../services/api';
import { Contact, Quiz } from '../../types';

function ContactLimitBar({ count, limit, tier }: { count: number; limit: number; tier: string }) {
  const pct = Math.min((count / limit) * 100, 100);
  const near = pct >= 80;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
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
        <div
          className={`h-full rounded-full transition-all ${near ? 'bg-amber-400' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {near && count < limit && (
        <p className="text-xs text-amber-600 mt-1">Approaching limit — {limit - count} remaining</p>
      )}
      {count >= limit && (
        <p className="text-xs text-red-600 mt-1">Limit reached. {tier === 'FREE' ? 'Upgrade to add up to 500 contacts.' : 'Maximum reached.'}</p>
      )}
    </div>
  );
}

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
  } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importResult, setImportResult] = useState<string>('');

  const { data: contactData } = useQuery<{ contacts: Contact[]; limit: number; tier: string }>({
    queryKey: ['contacts'],
    queryFn: () => api.get('/contacts').then((r) => r.data),
  });

  const { data: quizzes = [] } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const contacts = contactData?.contacts ?? [];
  const limit = contactData?.limit ?? 10;
  const tier = contactData?.tier ?? 'FREE';
  const publicQuizzes = quizzes.filter((q) => q.visibility === 'PUBLIC' && q.published);

  const addMutation = useMutation({
    mutationFn: (data: { name: string; email: string }) => api.post('/contacts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      setNewName('');
      setNewEmail('');
      setAddError('');
      setShowAddForm(false);
    },
    onError: (e: any) => setAddError(e.response?.data?.error || 'Failed to add contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });

  const broadcastMutation = useMutation({
    mutationFn: (payload: { quizId: string; contactIds: string[] }) =>
      api.post('/contacts/broadcast', payload).then((r) => r.data),
    onSuccess: (data) => setBroadcastResult(data),
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
      const res = await api.post('/contacts/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = res.data;
      setImportResult(`Imported ${d.added} contacts. ${d.duplicates} duplicates skipped.${d.skipped ? ` ${d.skipped} over limit.` : ''}`);
      qc.invalidateQueries({ queryKey: ['contacts'] });
    } catch (err: any) {
      setImportResult(err.response?.data?.error || 'Import failed');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  function handleBroadcast() {
    if (!selectedQuiz || selected.size === 0) return;
    setBroadcastResult(null);
    broadcastMutation.mutate({ quizId: selectedQuiz, contactIds: Array.from(selected) });
  }

  const canAdd = contacts.length < limit;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6" /> Audience
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage your contacts and broadcast quizzes via email.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
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

      <ContactLimitBar count={contacts.length} limit={limit} tier={tier} />

      {/* Import result */}
      {importResult && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {importResult}
          <button onClick={() => setImportResult('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Add contact form */}
      {showAddForm && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Add New Contact</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[160px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 min-w-[200px] border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => addMutation.mutate({ name: newName, email: newEmail })}
              disabled={!newName || !newEmail || addMutation.isPending}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
          {addError && <p className="text-red-600 text-sm mt-2">{addError}</p>}
          <p className="text-xs text-slate-400 mt-2">
            CSV format: <code className="bg-slate-100 px-1 rounded">name,email</code> — one per line, header row optional.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact list */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {contacts.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No contacts yet. Add some above or import a CSV.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selected.size === contacts.length && contacts.length > 0}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Added</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                        selected.has(c.id) ? 'bg-blue-50/50' : idx % 2 === 1 ? 'bg-slate-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600">{c.email}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${c.name}?`)) deleteMutation.mutate(c.id);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {selected.size > 0 && (
            <p className="text-xs text-slate-500 mt-2 ml-1">{selected.size} contact{selected.size !== 1 ? 's' : ''} selected</p>
          )}
        </div>

        {/* Broadcast panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-6">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" /> Broadcast Quiz
            </h3>
            <p className="text-xs text-slate-500 mb-4">Send a quiz invitation email to selected contacts.</p>

            <label className="text-xs font-medium text-slate-600 block mb-1">Quiz (PUBLIC only)</label>
            <select
              value={selectedQuiz}
              onChange={(e) => setSelectedQuiz(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Select a quiz —</option>
              {publicQuizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>

            {publicQuizzes.length === 0 && (
              <p className="text-xs text-amber-600 mb-4">No published PUBLIC quizzes. Set a quiz to Public and publish it first.</p>
            )}

            <button
              onClick={handleBroadcast}
              disabled={!selectedQuiz || selected.size === 0 || broadcastMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {broadcastMutation.isPending
                ? 'Sending...'
                : selected.size > 0
                ? `Send to ${selected.size} contact${selected.size !== 1 ? 's' : ''}`
                : 'Select contacts first'}
            </button>

            {broadcastResult && (
              <div className="mt-4 space-y-2">
                {broadcastResult.error ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Email not configured
                    </p>
                    <p className="text-xs text-amber-600">Copy the quiz link below to share manually:</p>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent {broadcastResult.sent} email{broadcastResult.sent !== 1 ? 's' : ''}
                    </p>
                    {broadcastResult.failed > 0 && (
                      <p className="text-red-600 mt-0.5">{broadcastResult.failed} failed</p>
                    )}
                  </div>
                )}

                {broadcastResult.quizUrl && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 mb-1">Quiz link:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-blue-600 truncate flex-1">{broadcastResult.quizUrl}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(broadcastResult.quizUrl!)}
                        className="shrink-0 text-slate-400 hover:text-slate-700"
                        title="Copy link"
                      >
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
    </div>
  );
}
