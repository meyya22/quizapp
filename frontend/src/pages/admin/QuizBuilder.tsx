import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ArrowLeft, Upload, Download, GripVertical, Eye, Sparkles, Loader2, Globe } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { UpgradeModal } from '../../components/UpgradeModal';
import api from '../../services/api';
import { LANGUAGES } from '../../services/translate';
import { Question, Quiz, QuestionType } from '../../types';

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_RESPONSE: 'Multiple Response',
  TRUE_FALSE: 'True / False',
  FREE_TEXT: 'Free Text',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

interface QuestionFormData {
  text: string;
  type: QuestionType;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctSingle: string;
  correctMultiple: string[];
  correctTF: string;
  correctFreeText: string;
  explanation: string;
}

interface AiUsage { used: number; limit: number; tier: string }

const SAMPLE_PROMPT = 'Generate 5 MCQ style Grade 5 Science questions with answer options and explanations';

export default function QuizBuilder() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsage | null>(null);

  useEffect(() => {
    api.get('/ai/usage').then((r) => setAiUsage(r.data)).catch(() => {});
  }, []);

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) { toast.error('Please enter a prompt'); return; }
    setAiLoading(true);
    try {
      const res = await api.post('/ai/generate-questions', { quizId: id, prompt: aiPrompt });
      qc.invalidateQueries({ queryKey: ['questions', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      setAiUsage(res.data.usage);
      toast.success(`${res.data.generated} question${res.data.generated !== 1 ? 's' : ''} generated`);
      setAiModalOpen(false);
      setAiPrompt('');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { error?: string } } };
      if (e.response?.status === 403) {
        const msg = e.response.data?.error ?? '';
        if (msg.toLowerCase().includes('upgrade')) {
          setAiModalOpen(false);
          setUpgradeReason(msg);
          setUpgradeOpen(true);
        } else {
          toast.error(msg || 'Limit reached');
        }
      } else {
        toast.error(e.response?.data?.error || 'AI generation failed. Please try again.');
      }
    } finally {
      setAiLoading(false);
    }
  }

  function openUpgrade(err: unknown) {
    const e = err as { response?: { status?: number; data?: { error?: string } } };
    if (e.response?.status === 403) {
      closeModal();
      setUpgradeReason(e.response.data?.error ?? 'Upgrade to add more.');
      setUpgradeOpen(true);
    } else {
      const msg = e.response?.data?.error;
      toast.error(msg || 'Operation failed');
    }
  }

  const { data: quiz } = useQuery<Quiz>({
    queryKey: ['quiz', id],
    queryFn: () => api.get(`/quizzes/${id}`).then((r) => r.data),
  });

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions', id],
    queryFn: () => api.get(`/quizzes/${id}/questions`).then((r) => r.data),
  });

  const { register, handleSubmit, watch, control, reset, formState: { errors } } =
    useForm<QuestionFormData>({
      defaultValues: {
        type: 'MULTIPLE_CHOICE',
        correctMultiple: [],
        correctTF: 'true',
      },
    });

  const questionType = watch('type');

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post(`/quizzes/${id}/questions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Question added');
      closeModal();
    },
    onError: openUpgrade,
  });

  const updateMutation = useMutation({
    mutationFn: ({ qid, data }: { qid: string; data: object }) =>
      api.put(`/quizzes/${id}/questions/${qid}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      toast.success('Question updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update question'),
  });

  const deleteMutation = useMutation({
    mutationFn: (qid: string) => api.delete(`/quizzes/${id}/questions/${qid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Question deleted');
    },
    onError: () => toast.error('Failed to delete question'),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/quizzes/${id}/questions/import`, formData);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['questions', id] });
      qc.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success(`Imported ${res.data.imported} questions`);
    },
    onError: openUpgrade,
  });

  function buildPayloadFixed(data: QuestionFormData) {
    const type = data.type;
    let options: Record<string, string> | null = null;
    let correctAnswer: string | string[] = '';

    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE') {
      options = {};
      if (data.optionA) options['A'] = data.optionA;
      if (data.optionB) options['B'] = data.optionB;
      if (data.optionC) options['C'] = data.optionC;
      if (data.optionD) options['D'] = data.optionD;
      correctAnswer =
        type === 'MULTIPLE_CHOICE' ? data.correctSingle : data.correctMultiple;
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = data.correctTF;
    } else {
      correctAnswer = data.correctFreeText;
    }

    return { text: data.text, type, options, correctAnswer, explanation: data.explanation || null };
  }

  function openCreate() {
    setEditing(null);
    reset({ type: 'MULTIPLE_CHOICE', correctTF: 'true', correctMultiple: [], explanation: '' });
    setModalOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    reset({
      text: q.text,
      type: q.type,
      optionA: q.options?.['A'] || '',
      optionB: q.options?.['B'] || '',
      optionC: q.options?.['C'] || '',
      optionD: q.options?.['D'] || '',
      correctSingle: q.type === 'MULTIPLE_CHOICE' ? (q.correctAnswer as string) : '',
      correctMultiple: q.type === 'MULTIPLE_RESPONSE' ? (q.correctAnswer as string[]) : [],
      correctTF: q.type === 'TRUE_FALSE' ? (q.correctAnswer as string) : 'true',
      correctFreeText: q.type === 'FREE_TEXT' ? (q.correctAnswer as string) : '',
      explanation: q.explanation || '',
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    reset();
  }

  function onSubmit(data: QuestionFormData) {
    const payload = buildPayloadFixed(data);
    if (editing) {
      updateMutation.mutate({ qid: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = '';
    }
  }

  async function handleDownloadSample() {
    const res = await api.get(`/quizzes/${id}/questions/sample-csv`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const showOptions = questionType === 'MULTIPLE_CHOICE' || questionType === 'MULTIPLE_RESPONSE';

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/admin/quizzes"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quizzes
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{quiz?.title || 'Loading...'}</h1>
            <div className="flex items-center gap-3 mt-1">
              {quiz?.category && <Badge variant="neutral">{quiz.category.name}</Badge>}
              <span className="text-sm text-slate-500">Passing: {quiz?.passingScore}%</span>
              <span className="text-sm text-slate-500">{questions.length} questions</span>
              {quiz?.defaultLanguage && quiz.defaultLanguage !== 'en' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                  <Globe className="w-3 h-3" />
                  {LANGUAGES.find((l) => l.code === quiz.defaultLanguage)?.label ?? quiz.defaultLanguage}
                </span>
              )}
            </div>
            {quiz?.defaultLanguage && quiz.defaultLanguage !== 'en' && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex items-center gap-2">
                <span className="font-medium">Language reminder:</span>
                Write your questions and answers in{' '}
                <span className="font-semibold">{LANGUAGES.find((l) => l.code === quiz.defaultLanguage)?.label ?? quiz.defaultLanguage}</span>
                — participants will see this quiz in that language by default.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/quiz/${id}?preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAiModalOpen(true)}
              disabled={aiUsage !== null && aiUsage.used >= aiUsage.limit}
              title={aiUsage && aiUsage.used >= aiUsage.limit ? 'Monthly AI limit reached' : 'Generate questions using AI'}
              className="border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Generate with AI</span>
              {aiUsage && (
                <span className="text-[10px] font-normal text-violet-500 ml-0.5">
                  {aiUsage.used}/{aiUsage.limit}
                </span>
              )}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadSample}>
              <Download className="w-4 h-4" />
              Sample CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={importMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Add Question
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">No questions yet. Add one manually or import a CSV.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4"
            >
              <div className="flex items-center gap-2 text-slate-300 mt-0.5">
                <GripVertical className="w-4 h-4" />
                <span className="text-sm font-medium">{idx + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-medium">{q.text}</p>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="info">{TYPE_LABELS[q.type]}</Badge>
                  {q.options && (
                    <span className="text-xs text-slate-500">
                      Options: {Object.entries(q.options)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-600 mt-1">
                  Answer:{' '}
                  {Array.isArray(q.correctAnswer)
                    ? q.correctAnswer.join(', ')
                    : String(q.correctAnswer)}
                </p>
                {q.explanation && (
                  <p className="text-xs text-amber-600 mt-1 flex items-start gap-1">
                    <span className="font-medium shrink-0">Explanation:</span>
                    <span className="line-clamp-1">{q.explanation}</span>
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(q)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this question?')) deleteMutation.mutate(q.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason={upgradeReason}
      />

      <Modal
        open={aiModalOpen}
        onClose={() => { if (!aiLoading) { setAiModalOpen(false); setAiPrompt(''); } }}
        title="Generate Questions with AI"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-100">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <p className="text-xs text-violet-700">
              Claude AI will generate up to 10 questions from your prompt and add them directly to this quiz.
            </p>
          </div>

          {aiUsage && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Monthly usage</span>
              <span className={`font-medium ${aiUsage.used >= aiUsage.limit ? 'text-red-600' : 'text-slate-700'}`}>
                {aiUsage.used} / {aiUsage.limit} generations used
                {aiUsage.tier === 'FREE' && ' (Free plan)'}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Your Prompt</label>
            <p className="text-xs text-slate-400">
              Example: <span className="italic">"{SAMPLE_PROMPT}"</span>
            </p>
            <textarea
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
              rows={5}
              placeholder={SAMPLE_PROMPT}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiLoading}
              maxLength={2000}
            />
            <p className="text-right text-xs text-slate-400">{aiPrompt.length}/2000</p>
          </div>

          {aiUsage && aiUsage.used >= aiUsage.limit && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {aiUsage.tier === 'FREE'
                ? 'Free plan allows 3 AI generations per month. Upgrade to Paid for 25/month.'
                : 'Monthly limit of 25 reached. Resets on the 1st of next month.'}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" type="button" onClick={() => { setAiModalOpen(false); setAiPrompt(''); }} disabled={aiLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading || !aiPrompt.trim() || (aiUsage !== null && aiUsage.used >= aiUsage.limit)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Question' : 'Add Question'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextArea
            label="Question Text"
            placeholder="Enter your question here..."
            error={errors.text?.message}
            rows={3}
            {...register('text', { required: 'Question text is required' })}
          />

          <Select
            label="Question Type"
            options={TYPE_OPTIONS}
            {...register('type')}
          />

          {showOptions && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Options</p>
              <div className="grid grid-cols-2 gap-3">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <Input
                    key={letter}
                    label={`Option ${letter}`}
                    placeholder={`Option ${letter}`}
                    {...register(`option${letter}` as keyof QuestionFormData)}
                  />
                ))}
              </div>
            </div>
          )}

          {questionType === 'MULTIPLE_CHOICE' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Correct Answer</p>
              <div className="flex gap-3">
                {['A', 'B', 'C', 'D'].map((letter) => (
                  <label key={letter} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value={letter}
                      className="text-blue-600"
                      {...register('correctSingle', { required: 'Select correct answer' })}
                    />
                    <span className="text-sm">{letter}</span>
                  </label>
                ))}
              </div>
              {errors.correctSingle && (
                <p className="text-xs text-red-600">{errors.correctSingle.message}</p>
              )}
            </div>
          )}

          {questionType === 'MULTIPLE_RESPONSE' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Correct Answers (select all that apply)</p>
              <Controller
                name="correctMultiple"
                control={control}
                rules={{ validate: (v) => v.length > 0 || 'Select at least one answer' }}
                render={({ field }) => (
                  <div className="flex gap-3">
                    {['A', 'B', 'C', 'D'].map((letter) => (
                      <label key={letter} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="text-blue-600 rounded"
                          checked={field.value.includes(letter)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...field.value, letter]);
                            } else {
                              field.onChange(field.value.filter((v: string) => v !== letter));
                            }
                          }}
                        />
                        <span className="text-sm">{letter}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
              {errors.correctMultiple && (
                <p className="text-xs text-red-600">{errors.correctMultiple.message}</p>
              )}
            </div>
          )}

          {questionType === 'TRUE_FALSE' && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Correct Answer</p>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="true" className="text-blue-600" {...register('correctTF')} />
                  <span className="text-sm">True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="false" className="text-blue-600" {...register('correctTF')} />
                  <span className="text-sm">False</span>
                </label>
              </div>
            </div>
          )}

          {questionType === 'FREE_TEXT' && (
            <Input
              label="Correct Answer"
              placeholder="Expected answer (case-insensitive)"
              error={errors.correctFreeText?.message}
              {...register('correctFreeText', { required: 'Correct answer is required' })}
            />
          )}

          <div className="border-t border-slate-100 pt-4">
            <TextArea
              label="Answer Explanation (optional)"
              placeholder="Explain why this is the correct answer. Shown to participants after they submit."
              rows={2}
              {...register('explanation')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? 'Save Changes' : 'Add Question'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
