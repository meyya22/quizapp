import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Brain, Clock, Trophy, CheckCircle, XCircle,
  AlertCircle, ChevronRight, BookOpen, Zap, Target, Globe, Loader2, Lock, FileDown,
} from 'lucide-react';
import api from '../../services/api';
import { LANGUAGES } from '../../services/translate';
import ParticipantPlanCards, { type ParticipantPlanKey } from './ParticipantPlanCards';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'form' | 'generating' | 'taking' | 'results';
type Difficulty = 'Easy' | 'Moderate' | 'Difficult';
type QuestionCount = 5 | 10 | 15;

interface AiQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_RESPONSE';
  text: string;
  options: Record<string, string> | null;
  correctAnswer: string | string[];
  explanation: string;
}

interface AiQuizFull {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  numQuestions: number;
  passingScore: number;
  questions: AiQuestion[];
  createdAt: string;
}

interface GradedAnswer {
  questionId: string;
  answer: string | string[] | null;
  isCorrect: boolean;
}

interface AttemptResult {
  score: number;
  passed: boolean;
  timeTaken: number;
  completedAt: string;
  gradedAnswers: GradedAnswer[];
}

interface HistoryQuiz extends AiQuizFull {
  attempts: Array<{ score: number; passed: boolean; timeTaken: number; completedAt: string }>;
  _count: { attempts: number };
}

interface TranslatedContent {
  questions: AiQuestion[];
  boolLabels: { true: string; false: string };
}

// ─── Translation helpers (mirrors translate.ts pattern for AiQuestion[]) ──────

async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text.trim() || targetLang === 'en') return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
  const data: string[][][] = await res.json();
  return data[0].map((chunk) => chunk[0]).join('');
}

async function translateAiQuestions(
  questions: AiQuestion[],
  targetLang: string
): Promise<TranslatedContent> {
  if (targetLang === 'en') {
    return { questions, boolLabels: { true: 'True', false: 'False' } };
  }

  const texts: string[] = [];
  const meta: {
    textIdx: number;
    optionIdxMap: Record<string, number>;
    explanationIdx: number | null;
  }[] = [];

  for (const q of questions) {
    const m = {
      textIdx: texts.length,
      optionIdxMap: {} as Record<string, number>,
      explanationIdx: null as number | null,
    };
    texts.push(q.text);
    if (q.options) {
      for (const [key, value] of Object.entries(q.options)) {
        m.optionIdxMap[key] = texts.length;
        texts.push(value);
      }
    }
    if (q.explanation) {
      m.explanationIdx = texts.length;
      texts.push(q.explanation);
    }
    meta.push(m);
  }

  const boolStart = texts.length;
  texts.push('True', 'False');

  const BATCH = 8;
  const translated: string[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const results = await Promise.all(
      texts.slice(i, i + BATCH).map((t) => translateOne(t, targetLang))
    );
    translated.push(...results);
  }

  const translatedQuestions = questions.map((q, i) => {
    const m = meta[i];
    let translatedOptions: Record<string, string> | null = null;
    if (q.options) {
      translatedOptions = {};
      for (const key of Object.keys(q.options)) {
        translatedOptions[key] = translated[m.optionIdxMap[key]];
      }
    }
    return {
      ...q,
      text: translated[m.textIdx],
      options: translatedOptions,
      explanation: m.explanationIdx !== null ? translated[m.explanationIdx] : q.explanation,
    };
  });

  return {
    questions: translatedQuestions,
    boolLabels: { true: translated[boolStart], false: translated[boolStart + 1] },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  Easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  Difficult: 'bg-red-50 text-red-700 border-red-200',
};

const DIFFICULTY_BTN_ACTIVE: Record<Difficulty, string> = {
  Easy: 'bg-emerald-500 text-white border-emerald-500',
  Moderate: 'bg-amber-500 text-white border-amber-500',
  Difficult: 'bg-red-500 text-white border-red-500',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExamPrepPage() {
  const queryClient = useQueryClient();

  // Phase
  const [phase, setPhase] = useState<Phase>('form');

  // Form
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Moderate');
  const [numQuestions, setNumQuestions] = useState<QuestionCount>(10);
  const [passingScore, setPassingScore] = useState(70);
  const [genError, setGenError] = useState<string | null>(null);

  // Quiz taking
  const [activeQuiz, setActiveQuiz] = useState<AiQuizFull | null>(null);
  const [userAnswers, setUserAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  // Translation
  const [selectedLang, setSelectedLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayQuestions, setDisplayQuestions] = useState<AiQuestion[]>([]);
  const [boolLabels, setBoolLabels] = useState({ true: 'True', false: 'False' });
  const translationCache = useRef<Map<string, TranslatedContent>>(new Map());

  // Results
  const [attemptResult, setAttemptResult] = useState<AttemptResult | null>(null);

  // History
  const { data: historyData } = useQuery({
    queryKey: ['ai-quizzes'],
    queryFn: () => api.get('/ai-quiz').then((r) => r.data),
    staleTime: 30_000,
  });

  const historyQuizzes: HistoryQuiz[] = historyData?.quizzes ?? [];
  const usage = { used: historyData?.used ?? 0, limit: historyData?.limit ?? 5 };
  const planInfo = {
    plan: (historyData?.plan ?? 'STARTER') as ParticipantPlanKey,
    allowedQuestionCounts: (historyData?.allowedQuestionCounts ?? [5, 10]) as QuestionCount[],
    allowedDifficulties: (historyData?.allowedDifficulties ?? ['Easy', 'Moderate']) as Difficulty[],
    monthlyReset: (historyData?.monthlyReset ?? false) as boolean,
    pdfExport: (historyData?.pdfExport ?? false) as boolean,
  };

  // Timer
  useEffect(() => {
    if (phase === 'taking') {
      startTimeRef.current = Date.now() - elapsed * 1000;
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Reset language + display questions when the active quiz changes
  useEffect(() => {
    if (activeQuiz) {
      setSelectedLang('en');
      setDisplayQuestions(activeQuiz.questions);
      setBoolLabels({ true: 'True', false: 'False' });
      translationCache.current.clear();
    }
  }, [activeQuiz?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Translate whenever language changes (during taking phase)
  useEffect(() => {
    if (!activeQuiz || phase !== 'taking') return;

    if (selectedLang === 'en') {
      setDisplayQuestions(activeQuiz.questions);
      setBoolLabels({ true: 'True', false: 'False' });
      return;
    }

    const cached = translationCache.current.get(selectedLang);
    if (cached) {
      setDisplayQuestions(cached.questions);
      setBoolLabels(cached.boolLabels);
      return;
    }

    setIsTranslating(true);
    translateAiQuestions(activeQuiz.questions, selectedLang)
      .then((result) => {
        translationCache.current.set(selectedLang, result);
        setDisplayQuestions(result.questions);
        setBoolLabels(result.boolLabels);
      })
      .catch(() => setSelectedLang('en'))
      .finally(() => setIsTranslating(false));
  }, [selectedLang, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate quiz
  const generateMutation = useMutation({
    mutationFn: () =>
      api.post('/ai-quiz/generate', {
        topic: topic.trim(), difficulty, numQuestions, passingScore,
      }),
    onMutate: () => { setPhase('generating'); setGenError(null); },
    onSuccess: (res) => {
      const quiz: AiQuizFull = res.data.quiz;
      setActiveQuiz(quiz);
      setUserAnswers(new Map());
      setElapsed(0);
      setPhase('taking');
      queryClient.invalidateQueries({ queryKey: ['ai-quizzes'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Failed to generate quiz. Please try again.';
      setGenError(msg);
      setPhase('form');
    },
  });

  // Submit attempt
  const submitMutation = useMutation({
    mutationFn: (payload: {
      answers: Array<{ questionId: string; answer: string | string[] | null }>;
      timeTaken: number;
    }) => api.post(`/ai-quiz/${activeQuiz!.id}/attempt`, payload),
    onSuccess: (res) => {
      setAttemptResult(res.data.attempt);
      setPhase('results');
      queryClient.invalidateQueries({ queryKey: ['ai-quizzes'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // Handlers
  function handleAnswer(questionId: string, value: string, type: string) {
    setUserAnswers((prev) => {
      const next = new Map(prev);
      if (type === 'MULTIPLE_RESPONSE') {
        const cur = (next.get(questionId) as string[] | undefined) ?? [];
        next.set(
          questionId,
          cur.includes(value) ? cur.filter((a) => a !== value) : [...cur, value]
        );
      } else {
        next.set(questionId, value);
      }
      return next;
    });
  }

  function handleSubmitQuiz() {
    if (!activeQuiz || submitMutation.isPending) return;
    const answers = activeQuiz.questions.map((q) => ({
      questionId: q.id,
      answer: userAnswers.get(q.id) ?? null,
    }));
    submitMutation.mutate({ answers, timeTaken: elapsed });
  }

  function handleStartQuiz(quiz: HistoryQuiz) {
    setActiveQuiz({ ...quiz });
    setUserAnswers(new Map());
    setElapsed(0);
    setAttemptResult(null);
    setPhase('taking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRetakeCurrentQuiz() {
    setUserAnswers(new Map());
    setElapsed(0);
    setAttemptResult(null);
    setSelectedLang('en');
    if (activeQuiz) setDisplayQuestions(activeQuiz.questions);
    setBoolLabels({ true: 'True', false: 'False' });
    translationCache.current.clear();
    setPhase('taking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleNewQuiz() {
    setActiveQuiz(null);
    setAttemptResult(null);
    setUserAnswers(new Map());
    setSelectedLang('en');
    setPhase('form');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function generatePDF() {
    if (!activeQuiz || !attemptResult) return;

    function optionLabel(key: string, q: AiQuestion): string {
      if (q.type === 'TRUE_FALSE') return key === 'true' ? 'True' : 'False';
      return q.options?.[key] ? `${key}. ${q.options[key]}` : key;
    }

    function correctLabel(q: AiQuestion): string {
      if (q.type === 'TRUE_FALSE') return String(q.correctAnswer) === 'true' ? 'True' : 'False';
      if (Array.isArray(q.correctAnswer)) {
        return q.correctAnswer.map((k) => optionLabel(k, q)).join(', ');
      }
      return optionLabel(String(q.correctAnswer), q);
    }

    const questionsHtml = activeQuiz.questions.map((q, idx) => {
      const optionKeys = q.type === 'TRUE_FALSE'
        ? ['true', 'false']
        : Object.keys(q.options ?? {});

      const optionsHtml = optionKeys.map((k) => `
        <div style="padding:4px 0; color:#334155;">${optionLabel(k, q)}</div>
      `).join('');

      return `
        <div style="margin-bottom:24px; page-break-inside:avoid;">
          <p style="font-weight:600; color:#1e293b; margin:0 0 8px 0;">
            <span style="color:#94a3b8; font-size:13px; margin-right:6px;">Q${idx + 1}.</span>${q.text}
          </p>
          <div style="margin-left:16px; margin-bottom:10px; font-size:14px;">${optionsHtml}</div>
          <div style="margin-left:16px; background:#f0fdf4; border-left:3px solid #22c55e; padding:8px 12px; border-radius:4px; margin-bottom:6px;">
            <span style="color:#166534; font-weight:600;">Correct Answer: </span>
            <span style="color:#15803d;">${correctLabel(q)}</span>
          </div>
          ${q.explanation ? `
          <div style="margin-left:16px; background:#f8fafc; border-left:3px solid #94a3b8; padding:8px 12px; border-radius:4px; font-size:13px; color:#475569;">
            <span style="font-weight:600; color:#334155;">Explanation: </span>${q.explanation}
          </div>` : ''}
        </div>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${activeQuiz.title} — Question Review</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1e293b; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0; }
    .meta { font-size: 13px; color: #64748b; margin-bottom: 24px; }
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0 24px 0; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${activeQuiz.title}</h1>
  <div class="meta">
    Topic: ${activeQuiz.topic} &nbsp;·&nbsp; Difficulty: ${activeQuiz.difficulty} &nbsp;·&nbsp;
    Score: ${Math.round(attemptResult.score)}% (${attemptResult.passed ? 'Passed' : 'Not Passed'})
  </div>
  <hr class="divider" />
  ${questionsHtml}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  const answeredCount = activeQuiz
    ? activeQuiz.questions.filter((q) => {
        const a = userAnswers.get(q.id);
        return a !== undefined && (Array.isArray(a) ? a.length > 0 : a !== '');
      }).length
    : 0;

  const questionsToShow = displayQuestions.length > 0 ? displayQuestions : (activeQuiz?.questions ?? []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ExamPrep with XamGeni</h1>
        </div>
        <p className="text-slate-500 text-sm ml-12">
          Your AI quiz preparation assistant — generate a personalised quiz to test your knowledge.
        </p>
      </div>

      {/* ── FORM PHASE ───────────────────────────────────────────────────────── */}
      {phase === 'form' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-base font-semibold text-slate-900">Generate Your Quiz</h2>
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              usage.used >= usage.limit
                ? 'bg-red-50 border-red-200 text-red-700'
                : usage.used >= usage.limit - 1
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-violet-50 border-violet-200 text-violet-700'
            }`}>
              <Brain className="w-3.5 h-3.5" />
              {usage.used}/{usage.limit} quiz slots used
            </div>
          </div>

          {usage.used >= usage.limit ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                <div className="text-violet-800">
                  <p className="font-semibold">
                    {planInfo.plan === 'STARTER'
                      ? "You've mastered your free questions! Keep the momentum going with PrepReady"
                      : `You've used all ${usage.limit} AI quiz generations${planInfo.monthlyReset ? ' this month' : ''}`}
                  </p>
                  <p className="text-xs mt-0.5 text-violet-700">
                    {planInfo.plan === 'STARTER'
                      ? 'Upgrade to get 35 monthly quiz slots, all difficulty levels, and up to 15 questions per quiz.'
                      : planInfo.monthlyReset
                      ? 'Your limit resets at the start of next month.'
                      : 'Retake your existing quizzes below to keep practising.'}
                  </p>
                </div>
              </div>
              {planInfo.plan === 'STARTER' && (
                <ParticipantPlanCards currentPlan="STARTER" />
              )}
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (topic.trim()) generateMutation.mutate(); }}
              className="space-y-5"
            >
              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Topic or Subject Domain <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder='"SAT Math", "UPSC History", "Python Programming", "A-Level Biology"'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">{topic.length}/100 characters</p>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Difficulty Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Easy', 'Moderate', 'Difficult'] as Difficulty[]).map((d) => {
                    const locked = !planInfo.allowedDifficulties.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => !locked && setDifficulty(d)}
                        disabled={locked}
                        title={locked ? `Upgrade your plan to unlock ${d} difficulty` : undefined}
                        className={`py-2.5 text-sm font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                          locked
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            : difficulty === d
                            ? DIFFICULTY_BTN_ACTIVE[d]
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {locked && <Lock className="w-3 h-3" />}
                        {d}
                      </button>
                    );
                  })}
                </div>
                {planInfo.plan === 'STARTER' && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Difficult unlocks with PrepReady or ExamElite
                  </p>
                )}
              </div>

              {/* Number of questions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Questions <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([5, 10, 15] as QuestionCount[]).map((n) => {
                    const locked = !planInfo.allowedQuestionCounts.includes(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => !locked && setNumQuestions(n)}
                        disabled={locked}
                        title={locked ? `Upgrade your plan to unlock ${n} questions` : undefined}
                        className={`py-2.5 text-sm font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                          locked
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            : numQuestions === n
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {locked && <Lock className="w-3 h-3" />}
                        {n}
                      </button>
                    );
                  })}
                </div>
                {planInfo.plan === 'STARTER' && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 15 questions unlocks with PrepReady or ExamElite
                  </p>
                )}
              </div>

              {/* Passing score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">
                    Passing Score <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                    passingScore >= 80
                      ? 'bg-red-50 text-red-700'
                      : passingScore >= 60
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {passingScore}%
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                  <span>30% (easier)</span>
                  <span>100% (hardest)</span>
                </div>
              </div>

              {genError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{genError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Zap className="w-4 h-4" />
                Generate My Quiz — {numQuestions} {difficulty} Questions
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── GENERATING PHASE ─────────────────────────────────────────────────── */}
      {phase === 'generating' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 mb-8 text-center">
          <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-violet-600 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">XamGeni is crafting your quiz…</h2>
          <p className="text-slate-500 text-sm">
            Generating {numQuestions} {difficulty.toLowerCase()} questions on "{topic}"
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── TAKING PHASE ─────────────────────────────────────────────────────── */}
      {phase === 'taking' && activeQuiz && (
        <div className="mb-8">
          {/* Sticky progress + language header */}
          <div className="sticky top-16 z-20 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Quiz title + answered count */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{activeQuiz.title}</p>
                <p className="text-xs text-slate-400">{answeredCount}/{activeQuiz.questions.length} answered</p>
              </div>

              {/* Language selector */}
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  disabled={isTranslating}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-wait bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                {isTranslating && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500 shrink-0" />
                )}
              </div>

              {/* Progress bar (sm+) */}
              <div className="hidden sm:block w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${(answeredCount / activeQuiz.questions.length) * 100}%` }}
                />
              </div>

              {/* Timer */}
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-700 shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatTimer(elapsed)}
              </span>

              {/* Submit button */}
              <button
                onClick={handleSubmitQuiz}
                disabled={submitMutation.isPending}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {submitMutation.isPending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Submit <ChevronRight className="w-3.5 h-3.5" /></>
                }
              </button>
            </div>

            {/* Translating notice */}
            {isTranslating && (
              <p className="text-xs text-violet-600 mt-2 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Translating quiz via Google Translate…
              </p>
            )}
          </div>

          {/* Questions */}
          <div className="space-y-4">
            {questionsToShow.map((q, idx) => {
              // Always use original question IDs for answer tracking
              const originalQ = activeQuiz.questions[idx];
              const selected = userAnswers.get(originalQ.id);
              return (
                <div key={originalQ.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex gap-3 mb-4">
                    <span className="shrink-0 w-7 h-7 bg-violet-50 text-violet-700 text-xs font-bold rounded-lg flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 leading-relaxed">{q.text}</p>
                      {q.type === 'MULTIPLE_RESPONSE' && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">Select all that apply</p>
                      )}
                    </div>
                  </div>

                  <div className="ml-10 space-y-2">
                    {q.type === 'TRUE_FALSE' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {(['true', 'false'] as const).map((val) => (
                          <button
                            key={val}
                            onClick={() => handleAnswer(originalQ.id, val, originalQ.type)}
                            className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                              selected === val
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                            }`}
                          >
                            {val === 'true' ? boolLabels.true : boolLabels.false}
                          </button>
                        ))}
                      </div>
                    ) : q.options ? (
                      Object.entries(q.options).map(([key, value]) => {
                        const isSelected =
                          q.type === 'MULTIPLE_RESPONSE'
                            ? ((selected as string[] | undefined) ?? []).includes(key)
                            : selected === key;
                        return (
                          <button
                            key={key}
                            onClick={() => handleAnswer(originalQ.id, key, originalQ.type)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? 'bg-violet-50 border-violet-400'
                                : 'bg-white border-slate-200 hover:border-violet-200 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold border transition-colors ${
                              isSelected
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'border-slate-300 text-slate-500'
                            }`}>
                              {key}
                            </span>
                            <span className="text-sm text-slate-800">{value}</span>
                          </button>
                        );
                      })
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom submit bar */}
          <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-sm">
              {answeredCount < activeQuiz.questions.length ? (
                <span className="text-amber-600">
                  {activeQuiz.questions.length - answeredCount} unanswered — will count as wrong.
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> All questions answered!
                </span>
              )}
            </p>
            <button
              onClick={handleSubmitQuiz}
              disabled={submitMutation.isPending}
              className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors text-sm"
            >
              {submitMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>Submit Quiz <ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ────────────────────────────────────────────────────── */}
      {phase === 'results' && activeQuiz && attemptResult && (
        <div className="mb-8">
          {/* Score card */}
          <div className={`rounded-2xl border-2 p-6 mb-6 text-center ${
            attemptResult.passed
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-red-300 bg-red-50'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
              attemptResult.passed ? 'bg-emerald-500' : 'bg-red-500'
            }`}>
              {attemptResult.passed
                ? <Trophy className="w-8 h-8 text-white" />
                : <XCircle className="w-8 h-8 text-white" />}
            </div>
            <h2 className={`text-2xl font-extrabold mb-1 ${
              attemptResult.passed ? 'text-emerald-800' : 'text-red-800'
            }`}>
              {attemptResult.passed ? 'Passed!' : 'Not Passed'}
            </h2>
            <p className={`text-5xl font-black mb-3 ${
              attemptResult.passed ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {Math.round(attemptResult.score)}%
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Target className="w-4 h-4" /> Pass: {activeQuiz.passingScore}%
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {formatTimer(attemptResult.timeTaken)}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {attemptResult.gradedAnswers.filter((a) => a.isCorrect).length}/{activeQuiz.questions.length} correct
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                onClick={handleRetakeCurrentQuiz}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Retake Quiz
              </button>
              {usage.used < usage.limit ? (
                <button
                  onClick={handleNewQuiz}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-colors text-sm"
                >
                  <Sparkles className="w-4 h-4" /> Generate New Quiz
                </button>
              ) : (
                <button
                  onClick={handleNewQuiz}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
                >
                  ← Back
                </button>
              )}
            </div>
          </div>

          {/* Plan comparison */}
          <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ParticipantPlanCards currentPlan={planInfo.plan} />
          </div>

          {/* Question review */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-slate-900">Question Review</h3>
            {planInfo.pdfExport && (
              <button
                onClick={generatePDF}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                Download PDF
              </button>
            )}
          </div>
          <div className="space-y-3">
            {activeQuiz.questions.map((q, idx) => {
              const graded = attemptResult.gradedAnswers.find((a) => a.questionId === q.id);
              const isCorrect = graded?.isCorrect ?? false;
              const submitted = graded?.answer ?? null;

              function displayAnswer(val: string | string[] | null): string {
                if (val === null || val === undefined) return 'Not answered';
                if (Array.isArray(val)) {
                  return val.length === 0
                    ? 'Not answered'
                    : val.map((k) => (q.options?.[k] ? `${k}. ${q.options![k]}` : k)).join(', ');
                }
                if (val === '') return 'Not answered';
                if (q.type === 'TRUE_FALSE') return val === 'true' ? 'True' : 'False';
                return q.options?.[val] ? `${val}. ${q.options![val]}` : val;
              }

              function displayCorrect(): string {
                if (q.type === 'TRUE_FALSE') {
                  return String(q.correctAnswer) === 'true' ? 'True' : 'False';
                }
                if (Array.isArray(q.correctAnswer)) {
                  return q.correctAnswer
                    .map((k) => (q.options?.[k] ? `${k}. ${q.options![k]}` : k))
                    .join(', ');
                }
                const ca = String(q.correctAnswer);
                return q.options?.[ca] ? `${ca}. ${q.options![ca]}` : ca;
              }

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-xl border p-4 ${
                    isCorrect ? 'border-emerald-200' : 'border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      isCorrect ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {isCorrect
                        ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                        : <XCircle className="w-4 h-4 text-red-500" />}
                    </span>
                    <p className="text-sm font-medium text-slate-900 flex-1 leading-relaxed">
                      <span className="text-slate-400 text-xs mr-1">Q{idx + 1}.</span>
                      {q.text}
                    </p>
                  </div>
                  <div className="ml-9 space-y-1.5 text-xs">
                    <p>
                      <span className="text-slate-400">Your answer: </span>
                      <span className={`font-semibold ${isCorrect ? 'text-emerald-700' : 'text-red-600'}`}>
                        {displayAnswer(submitted)}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p>
                        <span className="text-slate-400">Correct answer: </span>
                        <span className="text-emerald-700 font-semibold">{displayCorrect()}</span>
                      </p>
                    )}
                    {q.explanation && (
                      <p className="text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2 leading-relaxed">
                        <span className="font-semibold text-slate-600">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── HISTORY SECTION ──────────────────────────────────────────────────── */}
      {phase !== 'taking' && phase !== 'generating' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-900">Your AI Generated Quizzes</h2>
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5 font-medium">
              {historyQuizzes.length}/{usage.limit}
            </span>
          </div>

          {historyQuizzes.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-200 border-dashed">
              <Brain className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No quizzes generated yet.</p>
              <p className="text-slate-400 text-xs mt-1">Generate your first quiz above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {historyQuizzes.map((quiz) => {
                const latestAttempt = quiz.attempts[0] ?? null;
                const attemptCount = quiz._count.attempts;
                const diff = quiz.difficulty as Difficulty;

                return (
                  <div
                    key={quiz.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="flex-1 text-sm font-semibold text-slate-900 leading-snug">
                          {quiz.title}
                        </h3>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          DIFFICULTY_BADGE[diff] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {quiz.difficulty}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-3">
                        <span>{quiz.numQuestions} questions</span>
                        <span>·</span>
                        <span>Pass: {quiz.passingScore}%</span>
                        <span>·</span>
                        <span>{formatDate(quiz.createdAt)}</span>
                      </div>

                      {latestAttempt ? (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                          latestAttempt.passed
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {latestAttempt.passed
                            ? <CheckCircle className="w-3.5 h-3.5" />
                            : <XCircle className="w-3.5 h-3.5" />}
                          {latestAttempt.passed ? 'Passed' : 'Failed'} — {Math.round(latestAttempt.score)}%
                          {attemptCount > 1 && (
                            <span className="ml-auto text-slate-400">{attemptCount} attempts</span>
                          )}
                        </div>
                      ) : (
                        <div className="px-3 py-2 rounded-lg bg-slate-50 text-xs text-slate-400">
                          Not attempted yet
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartQuiz(quiz)}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                    >
                      {attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
