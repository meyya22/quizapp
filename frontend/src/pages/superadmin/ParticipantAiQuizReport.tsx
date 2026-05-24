import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrainCircuit, Eye, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';

interface AiQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_RESPONSE' | 'TRUE_FALSE';
  text: string;
  options: Record<string, string> | null;
  correctAnswer: string | string[];
  explanation: string;
}

interface AiQuizRecord {
  id: string;
  topic: string;
  difficulty: string;
  numQuestions: number;
  questions: AiQuestion[];
  createdAt: string;
  user: { name: string; email: string };
}

const DIFF_STYLES: Record<string, string> = {
  Easy: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Moderate: 'text-amber-700 bg-amber-50 border-amber-200',
  Difficult: 'text-red-700 bg-red-50 border-red-200',
};

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'MCQ',
  MULTIPLE_RESPONSE: 'Multi',
  TRUE_FALSE: 'T/F',
};

const PAGE_SIZE = 15;

function isCorrect(option: string, correctAnswer: string | string[]): boolean {
  if (Array.isArray(correctAnswer)) return correctAnswer.includes(option);
  return String(correctAnswer).toUpperCase() === option.toUpperCase();
}

function QuestionViewer({ questions }: { questions: AiQuestion[] }) {
  return (
    <div className="space-y-5">
      {questions.map((q, idx) => (
        <div key={q.id} className="border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-800 leading-snug">{q.text}</p>
            </div>
          </div>

          {q.type === 'TRUE_FALSE' ? (
            <div className="flex gap-2 ml-9">
              {['true', 'false'].map((val) => {
                const correct = String(q.correctAnswer).toLowerCase() === val;
                return (
                  <div
                    key={val}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border ${
                      correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    {correct && <CheckCircle className="w-3.5 h-3.5" />}
                    {val === 'true' ? 'True' : 'False'}
                  </div>
                );
              })}
            </div>
          ) : q.options ? (
            <div className="grid grid-cols-1 gap-1.5 ml-9">
              {Object.entries(q.options).map(([key, text]) => {
                const correct = isCorrect(key, q.correctAnswer);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
                      correct
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className={`shrink-0 w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                      correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {key}
                    </span>
                    {text}
                    {correct && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                  </div>
                );
              })}
            </div>
          ) : null}

          {q.explanation && (
            <div className="ml-9 mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-700 leading-relaxed"><span className="font-semibold">Explanation: </span>{q.explanation}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ParticipantAiQuizReport() {
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<AiQuizRecord | null>(null);

  const { data: quizzes = [], isLoading } = useQuery<AiQuizRecord[]>({
    queryKey: ['participant-ai-quiz-report'],
    queryFn: () => api.get('/users/ai-quiz-report').then((r) => r.data),
  });

  const filtered = quizzes.filter((q) => {
    const term = search.toLowerCase();
    if (term && !q.user.name.toLowerCase().includes(term) && !q.user.email.toLowerCase().includes(term) && !q.topic.toLowerCase().includes(term)) return false;
    if (filterDiff && q.difficulty !== filterDiff) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleDiff(val: string) { setFilterDiff(val); setPage(1); }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">AI Quiz Report</h1>
        </div>
        <p className="text-slate-500 text-sm ml-10">All quizzes generated by participants via XamGeni</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Generated', value: quizzes.length, color: 'text-slate-900' },
          { label: 'Unique Participants', value: new Set(quizzes.map((q) => q.user.email)).size, color: 'text-violet-700' },
          { label: 'Total Questions', value: quizzes.reduce((s, q) => s + q.numQuestions, 0), color: 'text-blue-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, email or topic…"
          className="flex-1 min-w-52 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <div className="flex gap-1">
          {['', 'Easy', 'Moderate', 'Difficult'].map((d) => (
            <button
              key={d}
              onClick={() => handleDiff(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterDiff === d
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {d || 'All'}
            </button>
          ))}
        </div>
        {(search || filterDiff) && (
          <span className="text-xs text-slate-400">{filtered.length} of {quizzes.length}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Participant</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Topic</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Difficulty</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Questions</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                      {quizzes.length === 0 ? 'No AI quizzes generated yet.' : 'No results match your filters.'}
                    </td>
                  </tr>
                ) : paged.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{quiz.user.name}</p>
                      <p className="text-xs text-slate-400">{quiz.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 max-w-xs truncate">{quiz.topic}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium border px-2 py-0.5 rounded-full ${DIFF_STYLES[quiz.difficulty] ?? 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                        {quiz.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{quiz.numQuestions}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(quiz.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 w-px">
                      <button
                        onClick={() => setViewing(quiz)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              {filtered.length === 0 ? '0' : `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filtered.length)}`} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="px-2 text-xs font-medium text-slate-500">{safePage} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions modal */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? `${viewing.topic} — ${viewing.difficulty}` : ''}
        size="lg"
      >
        {viewing && (
          <div>
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{viewing.user.name}</span>
                  {' · '}{viewing.user.email}
                  {' · '}{new Date(viewing.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <QuestionViewer questions={viewing.questions} />
          </div>
        )}
      </Modal>
    </div>
  );
}
