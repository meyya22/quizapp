import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X, GripVertical, Eye, EyeOff, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface ExamQuiz { id: string; title: string; url: string | null; order: number; isActive: boolean; }
interface ExamSubCategory { id: string; name: string; order: number; isActive: boolean; quizzes: ExamQuiz[]; }
interface ExamCategory { id: string; name: string; order: number; isActive: boolean; subCategories: ExamSubCategory[]; }

type EditTarget = { type: 'category'; id: string } | { type: 'sub'; id: string } | { type: 'quiz'; id: string };

function InlineInput({ value, onSave, onCancel, placeholder }: { value: string; onSave: (v: string) => void; onCancel: () => void; placeholder?: string }) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(val); if (e.key === 'Escape') onCancel(); }}
        placeholder={placeholder}
        className="flex-1 px-2 py-1 border border-violet-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-w-0"
      />
      <button onClick={() => onSave(val)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
      <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
    </div>
  );
}

function QuizRow({ quiz, onUpdate, onDelete }: { quiz: ExamQuiz; onUpdate: (id: string, data: Partial<ExamQuiz>) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(quiz.title);
  const [url, setUrl] = useState(quiz.url ?? '');

  function save() {
    if (!title.trim()) return;
    onUpdate(quiz.id, { title: title.trim(), url: url.trim() || null });
    setEditing(false);
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${quiz.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      {editing ? (
        <div className="flex-1 space-y-1.5">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="w-full px-2 py-1 border border-violet-400 rounded text-sm focus:outline-none" />
          <div className="flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL (optional)" className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-violet-400" />
          </div>
          <div className="flex gap-1.5">
            <button onClick={save} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-medium">Save</button>
            <button onClick={() => setEditing(false)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 truncate">{quiz.title}</p>
            {quiz.url && <p className="text-xs text-blue-500 truncate">{quiz.url}</p>}
          </div>
          <button onClick={() => onUpdate(quiz.id, { isActive: !quiz.isActive })} className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
            {quiz.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-violet-600 shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(quiz.id)} className="p-1 text-slate-400 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
        </>
      )}
    </div>
  );
}

export default function ExamContentManager() {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingSub, setAddingSub] = useState<string | null>(null);
  const [addingQuiz, setAddingQuiz] = useState<{ subId: string; title: string; url: string } | null>(null);

  const { data: categories = [], isLoading } = useQuery<ExamCategory[]>({
    queryKey: ['exam-content-admin'],
    queryFn: () => api.get('/exam-content').then((r) => r.data),
  });

  function invalidate() { queryClient.invalidateQueries({ queryKey: ['exam-content-admin'] }); queryClient.invalidateQueries({ queryKey: ['exam-content-public'] }); }

  const createCat = useMutation({ mutationFn: ({ name, order }: { name: string; order: number }) => api.post('/exam-content/categories', { name, order }), onSuccess: () => { invalidate(); setAddingCat(false); toast.success('Category added.'); }, onError: () => toast.error('Failed to add category.') });
  const updateCat = useMutation({ mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/exam-content/categories/${id}`, data), onSuccess: () => { invalidate(); setEditTarget(null); }, onError: () => toast.error('Failed to update.') });
  const deleteCat = useMutation({ mutationFn: (id: string) => api.delete(`/exam-content/categories/${id}`), onSuccess: () => { invalidate(); toast.success('Deleted.'); }, onError: () => toast.error('Failed to delete.') });

  const createSub = useMutation({ mutationFn: ({ categoryId, name, order }: { categoryId: string; name: string; order: number }) => api.post('/exam-content/sub-categories', { categoryId, name, order }), onSuccess: () => { invalidate(); setAddingSub(null); toast.success('Subject added.'); }, onError: () => toast.error('Failed to add subject.') });
  const updateSub = useMutation({ mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/exam-content/sub-categories/${id}`, data), onSuccess: () => { invalidate(); setEditTarget(null); }, onError: () => toast.error('Failed to update.') });
  const deleteSub = useMutation({ mutationFn: (id: string) => api.delete(`/exam-content/sub-categories/${id}`), onSuccess: () => { invalidate(); toast.success('Deleted.'); }, onError: () => toast.error('Failed to delete.') });

  const createQuiz = useMutation({ mutationFn: (d: { subCategoryId: string; title: string; url?: string; order: number }) => api.post('/exam-content/quizzes', d), onSuccess: () => { invalidate(); setAddingQuiz(null); toast.success('Quiz added.'); }, onError: () => toast.error('Failed to add quiz.') });
  const updateQuiz = useMutation({ mutationFn: ({ id, data }: { id: string; data: object }) => api.put(`/exam-content/quizzes/${id}`, data), onSuccess: invalidate, onError: () => toast.error('Failed to update.') });
  const deleteQuiz = useMutation({ mutationFn: (id: string) => api.delete(`/exam-content/quizzes/${id}`), onSuccess: () => { invalidate(); toast.success('Deleted.'); }, onError: () => toast.error('Failed to delete.') });

  function toggleExpand(id: string) { setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Exam Content Manager</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage categories, subjects and quizzes shown on the Explore page</p>
        </div>
        <a href="/explore" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-violet-600 hover:underline font-medium">
          Preview page <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className={`bg-white border-2 rounded-2xl overflow-hidden ${cat.isActive ? 'border-slate-200' : 'border-slate-100 opacity-70'}`}>
            {/* Category header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#5c7691]">
              <button onClick={() => toggleExpand(cat.id)} className="text-white/70 hover:text-white">
                {expanded.has(cat.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {editTarget?.type === 'category' && editTarget.id === cat.id ? (
                <InlineInput value={cat.name} onSave={(name) => updateCat.mutate({ id: cat.id, data: { name } })} onCancel={() => setEditTarget(null)} />
              ) : (
                <span className="flex-1 font-bold text-white text-sm">{cat.name}</span>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => updateCat.mutate({ id: cat.id, data: { isActive: !cat.isActive } })} className="p-1 text-white/60 hover:text-white">
                  {cat.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditTarget({ type: 'category', id: cat.id })} className="p-1 text-white/60 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm(`Delete "${cat.name}" and all its content?`)) deleteCat.mutate(cat.id); }} className="p-1 text-white/60 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Sub-categories */}
            {expanded.has(cat.id) && (
              <div className="p-4 space-y-4">
                {cat.subCategories.map((sub) => (
                  <div key={sub.id} className={`border rounded-xl p-3 ${sub.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {editTarget?.type === 'sub' && editTarget.id === sub.id ? (
                        <InlineInput value={sub.name} onSave={(name) => updateSub.mutate({ id: sub.id, data: { name } })} onCancel={() => setEditTarget(null)} />
                      ) : (
                        <span className="flex-1 font-semibold text-slate-900 text-sm">{sub.name}</span>
                      )}
                      <button onClick={() => updateSub.mutate({ id: sub.id, data: { isActive: !sub.isActive } })} className="p-1 text-slate-400 hover:text-slate-600">
                        {sub.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setEditTarget({ type: 'sub', id: sub.id })} className="p-1 text-slate-400 hover:text-violet-600"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete subject "${sub.name}"?`)) deleteSub.mutate(sub.id); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="space-y-1.5 ml-1">
                      {sub.quizzes.map((quiz) => (
                        <QuizRow
                          key={quiz.id}
                          quiz={quiz}
                          onUpdate={(id, data) => updateQuiz.mutate({ id, data })}
                          onDelete={(id) => { if (confirm(`Delete quiz "${quiz.title}"?`)) deleteQuiz.mutate(id); }}
                        />
                      ))}

                      {/* Add quiz form */}
                      {addingQuiz?.subId === sub.id ? (
                        <div className="border border-violet-300 rounded-lg p-3 bg-violet-50 space-y-2">
                          <input
                            autoFocus
                            value={addingQuiz.title}
                            onChange={(e) => setAddingQuiz({ ...addingQuiz, title: e.target.value })}
                            placeholder="Quiz / Paper title"
                            className="w-full px-2 py-1.5 border border-violet-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
                          />
                          <div className="flex items-center gap-1.5">
                            <Link className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              value={addingQuiz.url}
                              onChange={(e) => setAddingQuiz({ ...addingQuiz, url: e.target.value })}
                              placeholder="URL (optional)"
                              className="flex-1 px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-violet-400"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { if (addingQuiz.title.trim()) createQuiz.mutate({ subCategoryId: sub.id, title: addingQuiz.title, url: addingQuiz.url || undefined, order: sub.quizzes.length }); }}
                              className="px-3 py-1 bg-violet-600 text-white rounded-lg text-xs font-semibold"
                            >Add</button>
                            <button onClick={() => setAddingQuiz(null)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingQuiz({ subId: sub.id, title: '', url: '' })}
                          className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium py-1 pl-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add quiz / paper
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add sub-category */}
                {addingSub === cat.id ? (
                  <div className="border border-violet-300 rounded-xl p-3 bg-violet-50">
                    <InlineInput
                      value=""
                      placeholder="Subject name (e.g. Mathematics)"
                      onSave={(name) => { if (name.trim()) createSub.mutate({ categoryId: cat.id, name, order: cat.subCategories.length }); }}
                      onCancel={() => setAddingSub(null)}
                    />
                  </div>
                ) : (
                  <button onClick={() => setAddingSub(cat.id)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 font-medium py-1">
                    <Plus className="w-4 h-4" /> Add subject
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Add category */}
        {addingCat ? (
          <div className="bg-white border-2 border-violet-300 rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">New Category</p>
            <InlineInput
              value=""
              placeholder="e.g. CBSE Class 10"
              onSave={(name) => { if (name.trim()) createCat.mutate({ name, order: categories.length }); }}
              onCancel={() => setAddingCat(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingCat(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 hover:border-violet-400 hover:text-violet-600 rounded-2xl text-sm font-semibold text-slate-500 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>
    </div>
  );
}
