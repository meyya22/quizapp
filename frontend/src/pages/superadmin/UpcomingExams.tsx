import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Check, X, CalendarDays, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface UpcomingExam {
  id: string;
  examName: string;
  examDate: string;
  order: number;
  isActive: boolean;
}

const empty = (): Omit<UpcomingExam, 'id'> => ({
  examName: '',
  examDate: '',
  order: 0,
  isActive: true,
});

export default function UpcomingExams() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty());
  const [editForm, setEditForm] = useState<Omit<UpcomingExam, 'id'>>(empty());

  const { data: exams = [], isLoading } = useQuery<UpcomingExam[]>({
    queryKey: ['upcoming-exams-admin'],
    queryFn: () => api.get('/upcoming-exams').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: Omit<UpcomingExam, 'id'>) => api.post('/upcoming-exams', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upcoming-exams-admin'] });
      qc.invalidateQueries({ queryKey: ['upcoming-exams-public'] });
      setAdding(false);
      setForm(empty());
      toast.success('Exam added');
    },
    onError: () => toast.error('Failed to add exam'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpcomingExam> }) =>
      api.put(`/upcoming-exams/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upcoming-exams-admin'] });
      qc.invalidateQueries({ queryKey: ['upcoming-exams-public'] });
      setEditingId(null);
      toast.success('Exam updated');
    },
    onError: () => toast.error('Failed to update exam'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/upcoming-exams/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upcoming-exams-admin'] });
      qc.invalidateQueries({ queryKey: ['upcoming-exams-public'] });
      toast.success('Exam deleted');
    },
    onError: () => toast.error('Failed to delete exam'),
  });

  function startEdit(exam: UpcomingExam) {
    setEditingId(exam.id);
    setEditForm({ examName: exam.examName, examDate: exam.examDate, order: exam.order, isActive: exam.isActive });
  }

  function saveEdit(id: string) {
    if (!editForm.examName.trim() || !editForm.examDate.trim()) {
      toast.error('Both fields are required');
      return;
    }
    updateMut.mutate({ id, data: editForm });
  }

  function handleCreate() {
    if (!form.examName.trim() || !form.examDate.trim()) {
      toast.error('Both fields are required');
      return;
    }
    createMut.mutate(form);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Upcoming Exam Dates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage exam schedule shown on the landing page</p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Exam
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-rose-500" />
            New Upcoming Exam
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Exam Name <span className="text-slate-400">(max 100 chars)</span></label>
              <input
                autoFocus
                maxLength={100}
                value={form.examName}
                onChange={(e) => setForm((p) => ({ ...p, examName: e.target.value }))}
                placeholder="e.g. NEET UG 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Exam Date <span className="text-slate-400">(max 100 chars)</span></label>
              <input
                maxLength={100}
                value={form.examDate}
                onChange={(e) => setForm((p) => ({ ...p, examDate: e.target.value }))}
                placeholder="e.g. 4 May 2025"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs font-medium text-slate-600">Display Order</label>
            <input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm((p) => ({ ...p, order: Number(e.target.value) }))}
              className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded text-rose-600"
              />
              <span className="text-xs text-slate-600">Active (visible on landing page)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createMut.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 disabled:opacity-60 transition-colors"
            >
              <Check className="w-4 h-4" />
              {createMut.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setAdding(false); setForm(empty()); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No upcoming exams yet. Click "Add Exam" to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Exam Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Exam Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                  {editingId === exam.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={editForm.order}
                          onChange={(e) => setEditForm((p) => ({ ...p, order: Number(e.target.value) }))}
                          className="w-16 px-2 py-1 border border-rose-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          autoFocus
                          maxLength={100}
                          value={editForm.examName}
                          onChange={(e) => setEditForm((p) => ({ ...p, examName: e.target.value }))}
                          className="w-full px-2 py-1 border border-rose-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          maxLength={100}
                          value={editForm.examDate}
                          onChange={(e) => setEditForm((p) => ({ ...p, examDate: e.target.value }))}
                          className="w-full px-2 py-1 border border-rose-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.isActive}
                            onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                            className="rounded text-rose-600"
                          />
                          <span className="text-xs text-slate-600">Active</span>
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => saveEdit(exam.id)}
                            disabled={updateMut.isPending}
                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-slate-500 text-xs">{exam.order}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{exam.examName}</td>
                      <td className="px-4 py-3 text-slate-600">{exam.examDate}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateMut.mutate({ id: exam.id, data: { isActive: !exam.isActive } })}
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                            exam.isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {exam.isActive
                            ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                            : <><ToggleLeft className="w-3.5 h-3.5" /> Inactive</>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => startEdit(exam)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${exam.examName}"?`)) deleteMut.mutate(exam.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Active exams are displayed on the landing page in ascending order. Toggle the status to show/hide individual entries.
      </p>
    </div>
  );
}
