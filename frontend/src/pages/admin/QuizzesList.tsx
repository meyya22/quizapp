import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, FileQuestion, ChevronRight, Globe, EyeOff, Users, Lock, Copy, Check, Eye, AlignJustify, GalleryHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { UpgradeModal } from '../../components/UpgradeModal';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { Category, Layout, Quiz } from '../../types';

interface FormData {
  categoryId: string;
  title: string;
  description: string;
  passingScore: number;
  layout: Layout;
}

export default function QuizzesList() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ['quizzes'],
    queryFn: () => api.get('/quizzes').then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: { passingScore: 70, layout: 'VERTICAL' },
  });
  const selectedLayout = watch('layout');

  function openUpgrade(err: unknown) {
    const e = err as { response?: { status?: number; data?: { error?: string } } };
    if (e.response?.status === 403) {
      closeModal();
      setUpgradeReason(e.response.data?.error ?? 'Upgrade to create more.');
      setUpgradeOpen(true);
    } else {
      toast.error('Failed to create quiz');
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/quizzes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Quiz created');
      closeModal();
    },
    onError: openUpgrade,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      api.put(`/quizzes/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update quiz'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quizzes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Quiz deleted');
    },
    onError: () => toast.error('Failed to delete quiz'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/quizzes/${id}/publish`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success(res.data.published ? 'Quiz published' : 'Quiz unpublished');
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const visibilityMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/quizzes/${id}/visibility`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success(res.data.visibility === 'PUBLIC' ? 'Quiz set to Public' : 'Quiz set to Private');
    },
    onError: () => toast.error('Failed to update visibility'),
  });

  function openCreate() {
    setEditing(null);
    reset({ categoryId: '', title: '', description: '', passingScore: 70, layout: 'VERTICAL' });
    setModalOpen(true);
  }

  function openEdit(quiz: Quiz) {
    setEditing(quiz);
    reset({
      categoryId: quiz.categoryId,
      title: quiz.title,
      description: quiz.description || '',
      passingScore: quiz.passingScore,
      layout: quiz.layout,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    reset();
  }

  function onSubmit(data: FormData) {
    const payload = { ...data, passingScore: Number(data.passingScore) };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(quiz: Quiz) {
    if (confirm(`Delete quiz "${quiz.title}"? All questions and attempts will be deleted.`)) {
      deleteMutation.mutate(quiz.id);
    }
  }

  function getShareUrl(quiz: Quiz) {
    return `${window.location.origin}/quiz/${quiz.id}`;
  }

  function copyShareLink(quiz: Quiz) {
    navigator.clipboard.writeText(getShareUrl(quiz)).then(() => {
      setCopiedId(quiz.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage your quizzes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          New Quiz
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <FileQuestion className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No quizzes yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Quiz</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Category</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Questions</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Passing</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Visibility</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Share Link</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{quiz.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="neutral">{quiz.category.name}</Badge>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {quiz._count?.questions ?? 0}
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{quiz.passingScore}%</td>
                  <td className="px-5 py-4">
                    {quiz.published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="neutral">Draft</Badge>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {quiz.published ? (
                      quiz.visibility === 'PUBLIC' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {quiz.published ? (
                      <button
                        onClick={() => copyShareLink(quiz)}
                        title={getShareUrl(quiz)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          copiedId === quiz.id
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'
                        }`}
                      >
                        {copiedId === quiz.id
                          ? <><Check className="w-3 h-3" /> Copied!</>
                          : <><Copy className="w-3 h-3" /> Copy Link</>}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {quiz.published && (
                        <button
                          onClick={() => visibilityMutation.mutate(quiz.id)}
                          title={quiz.visibility === 'PUBLIC' ? 'Switch to Private' : 'Switch to Public'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            quiz.visibility === 'PUBLIC'
                              ? 'text-emerald-500 hover:text-slate-600 hover:bg-slate-100'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {quiz.visibility === 'PUBLIC' ? <Users className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => publishMutation.mutate(quiz.id)}
                        title={quiz.published ? 'Unpublish' : 'Publish'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          quiz.published
                            ? 'text-emerald-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {quiz.published ? <EyeOff className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      </button>
                      <Link
                        to={`/quiz/${quiz.id}?preview=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Preview as participant"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        to={`/admin/quizzes/${quiz.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        Edit Questions <ChevronRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={() => openEdit(quiz)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(quiz)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Quiz' : 'New Quiz'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Category"
            options={categoryOptions}
            placeholder="Select a category"
            error={errors.categoryId?.message}
            {...register('categoryId', { required: 'Category is required' })}
          />
          <Input
            label="Title"
            placeholder="e.g. Basic Algebra"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />
          <TextArea
            label="Description (optional)"
            placeholder="Brief description of this quiz"
            {...register('description')}
          />
          <Input
            label="Passing Score (%)"
            type="number"
            min={1}
            max={100}
            error={errors.passingScore?.message}
            {...register('passingScore', {
              required: 'Passing score is required',
              min: { value: 1, message: 'Min is 1' },
              max: { value: 100, message: 'Max is 100' },
            })}
          />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Quiz Layout</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'VERTICAL', icon: AlignJustify, label: 'Vertical', desc: 'All questions on one page' },
                { value: 'HORIZONTAL', icon: GalleryHorizontal, label: 'Horizontal', desc: 'One question per page' },
              ] as const).map(({ value, icon: Icon, label, desc }) => (
                <label
                  key={value}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                    selectedLayout === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" value={value} {...register('layout')} className="sr-only" />
                  <Icon className={`w-6 h-6 ${selectedLayout === value ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${selectedLayout === value ? 'text-blue-700' : 'text-slate-700'}`}>{label}</span>
                  <span className="text-xs text-slate-500 text-center">{desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Save Changes' : 'Create Quiz'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
