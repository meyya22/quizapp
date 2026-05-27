import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BookOpen, Sparkles, Zap, ArrowRight, Clock, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Lock, Trophy, Crown,
} from 'lucide-react';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'home' | 'generating' | 'taking' | 'results';

interface PreviewQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'MULTIPLE_RESPONSE';
  text: string;
  options: Record<string, string> | null;
  correctAnswer: string | string[];
  explanation: string;
}

interface GradedAnswer {
  questionId: string;
  answer: string | string[] | null;
  isCorrect: boolean;
  correctAnswer: string | string[];
}

interface QuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalCount: number;
  gradedAnswers: GradedAnswer[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PREVIEW_PASSING_SCORE = 60;

function scoreQuiz(
  questions: PreviewQuestion[],
  answers: Map<string, string | string[]>
): QuizResult {
  let correct = 0;
  const gradedAnswers: GradedAnswer[] = questions.map((q) => {
    const submitted = answers.get(q.id) ?? null;
    let isCorrect = false;
    if (q.type === 'MULTIPLE_RESPONSE') {
      const ca = (Array.isArray(q.correctAnswer) ? [...q.correctAnswer] : [String(q.correctAnswer)]).sort();
      const sa = (Array.isArray(submitted) ? [...submitted] : submitted ? [String(submitted)] : []).sort();
      isCorrect = JSON.stringify(ca) === JSON.stringify(sa);
    } else {
      isCorrect =
        String(submitted ?? '').trim().toLowerCase() ===
        String(q.correctAnswer).trim().toLowerCase();
    }
    if (isCorrect) correct++;
    return { questionId: q.id, answer: submitted, isCorrect, correctAnswer: q.correctAnswer };
  });
  const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
  return {
    score,
    passed: score >= PREVIEW_PASSING_SCORE,
    correctCount: correct,
    totalCount: questions.length,
    gradedAnswers,
  };
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatCorrectAnswer(q: PreviewQuestion): string {
  if (q.type === 'TRUE_FALSE') {
    return String(q.correctAnswer) === 'true' ? 'True' : 'False';
  }
  if (q.type === 'MULTIPLE_RESPONSE') {
    const keys = Array.isArray(q.correctAnswer) ? q.correctAnswer : [String(q.correctAnswer)];
    return keys.map((k) => (q.options ? `${k}: ${q.options[k] ?? k}` : k)).join(', ');
  }
  const key = String(q.correctAnswer);
  return q.options ? `${key}: ${q.options[key] ?? key}` : key;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Landing() {
  const [phase, setPhase] = useState<Phase>('home');
  const [topic, setTopic] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<PreviewQuestion[]>([]);
  const [quizTopic, setQuizTopic] = useState('');
  const [userAnswers, setUserAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [generatingMore, setGeneratingMore] = useState(false);

  // Timer
  useEffect(() => {
    if (phase === 'taking') {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  async function handleGenerate() {
    if (!topic.trim() || phase === 'generating') return;
    setGenError(null);
    setPhase('generating');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await api.post('/ai-quiz/preview/generate', { topic: topic.trim() });
      setQuestions(res.data.questions);
      setQuizTopic(res.data.topic);
      setUserAnswers(new Map());
      setElapsed(0);
      setPhase('taking');
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data?.error ??
        'Failed to generate quiz. Please try again.';
      setGenError(msg);
      setPhase('home');
    }
  }

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

  function handleSubmit() {
    const scored = scoreQuiz(questions, userAnswers);
    setResult(scored);
    setAttemptCount((c) => c + 1);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    api.post('/ai-quiz/preview/submit', { topic: quizTopic, score: scored.score, passed: scored.passed }).catch(() => {});
  }

  async function handleGenerateMore() {
    if (generatingMore || attemptCount >= 3) return;
    setGeneratingMore(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const seenTexts = questions.map((q) => q.text);
      const res = await api.post('/ai-quiz/preview/generate', { topic: quizTopic, previousQuestions: seenTexts });
      setQuestions(res.data.questions);
      setUserAnswers(new Map());
      setElapsed(0);
      setResult(null);
      setPhase('taking');
    } catch {
      // stay on results page if generation fails
    } finally {
      setGeneratingMore(false);
    }
  }

  function handleTryAgain() {
    setPhase('home');
    setQuestions([]);
    setUserAnswers(new Map());
    setResult(null);
    setElapsed(0);
    setGenError(null);
    setTopic('');
    setAttemptCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const answeredCount = questions.filter((q) => {
    const a = userAnswers.get(q.id);
    return a !== undefined && (Array.isArray(a) ? a.length > 0 : a !== '');
  }).length;

  return (
    <>
      <Helmet>
        <title>XamGeni — Free AI Quiz Prep · Xam Bridge</title>
        <meta
          name="description"
          content="Generate a personalised quiz on any topic instantly with XamGeni, powered by Claude AI. Free quiz prep — no sign-up needed."
        />
        <meta name="keywords" content="AI quiz generator, free quiz prep, XamGeni, online quiz maker, study tool, exam preparation" />
        <link rel="canonical" href="https://www.xambridge.com/" />
        <meta property="og:title" content="XamGeni — Free AI Quiz Prep · Xam Bridge" />
        <meta property="og:description" content="Generate a personalised quiz on any topic instantly with XamGeni, powered by Claude AI." />
        <meta property="og:url" content="https://www.xambridge.com/" />
        <meta property="og:image" content="https://www.xambridge.com/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.xambridge.com/og-image.svg" />
      </Helmet>

      <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">

        {/* ── Nav ───────────────────────────────────────────────────────────── */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={handleTryAgain} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">Xam Bridge</span>
            </button>
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register/learner"
                className="text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Main ──────────────────────────────────────────────────────────── */}
        <main className="flex-1 pt-16 flex flex-col">

          {/* ── HOME PHASE ──────────────────────────────────────────────────── */}
          {phase === 'home' && (
            <div className="flex-1 flex flex-col items-center px-4 pt-8 pb-4">
              <div className="w-full max-w-lg">

                {/* Headline */}
                <h1 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight leading-tight mb-1">
                  Quiz yourself on <span className="text-violet-600">anything. Instantly.</span>
                </h1>
                <p className="text-center text-slate-500 mb-4 text-sm leading-relaxed">
                  Type any topic or subjects — get AI-crafted questions in seconds.
                </p>

                {/* Preview form card */}
                <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-sm p-4">
                  <div className="space-y-3">

                    {/* Topic input */}
                    <div>
                      <input
                        type="text"
                        maxLength={100}
                        placeholder='e.g. "SAT Math", "Python basics", "World War II"'
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400"
                        autoFocus
                      />
                    </div>

                    {/* Selectors row */}
                    <div className="grid grid-cols-2 gap-4">

                      {/* Difficulty */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Difficulty</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button className="py-2 text-xs font-bold rounded-lg border bg-emerald-500 text-white border-emerald-500">
                            Easy
                          </button>
                          <button
                            disabled
                            className="py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center gap-0.5 cursor-not-allowed"
                          >
                            <Lock className="w-2.5 h-2.5" /> Med
                          </button>
                          <button
                            disabled
                            className="py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center gap-0.5 cursor-not-allowed"
                          >
                            <Lock className="w-2.5 h-2.5" /> Hard
                          </button>
                        </div>
                      </div>

                      {/* Questions */}
                      <div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Questions</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button className="py-2 text-xs font-bold rounded-lg border bg-violet-600 text-white border-violet-600">
                            5
                          </button>
                          <button
                            disabled
                            className="py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center gap-0.5 cursor-not-allowed"
                          >
                            <Lock className="w-2.5 h-2.5" /> 10
                          </button>
                          <button
                            disabled
                            className="py-2 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 text-slate-400 flex items-center justify-center gap-0.5 cursor-not-allowed"
                          >
                            <Lock className="w-2.5 h-2.5" /> 15
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Error */}
                    {genError && (
                      <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-700">{genError}</p>
                      </div>
                    )}

                    {/* Generate button */}
                    <button
                      onClick={handleGenerate}
                      disabled={!topic.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <Zap className="w-4 h-4" />
                      Generate My Quiz — Free
                    </button>

                    {/* Locked hint */}
                    <p className="text-center text-xs text-slate-400 leading-relaxed">
                      <Lock className="w-3 h-3 inline mr-1 -mt-0.5" />
                      More options unlock when you{' '}
                      <Link to="/register/learner" className="text-violet-600 hover:underline font-medium">
                        sign up free
                      </Link>
                    </p>
                  </div>
                </div>

                {/* Educator callout */}
                <p className="text-center text-xs text-slate-400 mt-5">
                  Building quizzes for your team or classroom?{' '}
                  <Link to="/register/admin" className="text-blue-600 hover:underline font-medium">
                    Get started as an educator →
                  </Link>
                </p>
              </div>
            </div>
          )}

          {/* ── GENERATING PHASE ────────────────────────────────────────────── */}
          {phase === 'generating' && (
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">XamGeni is crafting your quiz…</h2>
                <p className="text-slate-500 text-sm">5 easy questions on "{topic}"</p>
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
            </div>
          )}

          {/* ── TAKING PHASE ────────────────────────────────────────────────── */}
          {phase === 'taking' && (
            <div className="max-w-2xl mx-auto w-full px-4 py-6">

              {/* Sticky header */}
              <div className="sticky top-16 z-20 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{quizTopic} — Easy Preview</p>
                    <p className="text-xs text-slate-400">{answeredCount}/{questions.length} answered</p>
                  </div>
                  <div className="hidden sm:block w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-violet-500 rounded-full transition-all duration-300"
                      style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                    />
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-slate-700 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {formatTimer(elapsed)}
                  </span>
                  <button
                    onClick={handleSubmit}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Submit <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  const selected = userAnswers.get(q.id);
                  return (
                    <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-5">
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
                                onClick={() => handleAnswer(q.id, val, q.type)}
                                className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                                  selected === val
                                    ? 'bg-violet-600 text-white border-violet-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                                }`}
                              >
                                {val === 'true' ? 'True' : 'False'}
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
                                onClick={() => handleAnswer(q.id, key, q.type)}
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
              <div className="mt-5 bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {answeredCount < questions.length ? (
                    <span className="text-amber-600">
                      {questions.length - answeredCount} unanswered — will count as wrong
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> All answered!
                    </span>
                  )}
                </p>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-lg hover:bg-violet-700 transition-colors text-sm"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS PHASE ───────────────────────────────────────────────── */}
          {phase === 'results' && result && (
            <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-4">

              {/* Score card */}
              <div className={`rounded-2xl p-6 text-center border ${
                result.passed
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`text-5xl font-extrabold mb-2 ${
                  result.passed ? 'text-emerald-600' : 'text-slate-700'
                }`}>
                  {Math.round(result.score)}%
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold mb-2 ${
                  result.passed
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {result.passed
                    ? <><Trophy className="w-4 h-4" /> Passed!</>
                    : <><XCircle className="w-4 h-4" /> Not quite — keep going!</>
                  }
                </div>
                <p className="text-slate-500 text-sm mb-4">
                  {result.correctCount} of {result.totalCount} correct on "{quizTopic}"
                </p>
                <p className="text-xs text-slate-400 mb-3">{attemptCount} of 3 free attempts used</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleTryAgain}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Try another topic
                  </button>
                  {attemptCount < 3 && (
                    <button
                      onClick={handleGenerateMore}
                      disabled={generatingMore}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60"
                    >
                      {generatingMore ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                      ) : (
                        <><Sparkles className="w-3.5 h-3.5" /> Generate 5 more ({3 - attemptCount} left)</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Per-question results */}
              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const ga = result.gradedAnswers[idx];
                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 ${
                        ga.isCorrect
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-red-100 bg-red-50'
                      }`}
                    >
                      <div className="flex gap-3 mb-1.5">
                        <span className={`shrink-0 mt-0.5 ${ga.isCorrect ? 'text-emerald-500' : 'text-red-400'}`}>
                          {ga.isCorrect
                            ? <CheckCircle className="w-5 h-5" />
                            : <XCircle className="w-5 h-5" />
                          }
                        </span>
                        <p className="text-sm font-medium text-slate-900 leading-relaxed">{q.text}</p>
                      </div>
                      {!ga.isCorrect && (
                        <p className="text-xs text-emerald-700 font-semibold ml-8 mb-1">
                          Correct: {formatCorrectAnswer(q)}
                        </p>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-slate-500 ml-8 leading-relaxed">{q.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sign-up CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-violet-200" />
                  <h3 className="text-lg font-bold">Unlock the full XamGeni experience</h3>
                </div>
                <p className="text-violet-200 text-sm text-center mb-4">Sign up free — it takes 30 seconds.</p>
                <ul className="text-sm space-y-2 mb-5 max-w-xs mx-auto">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    Moderate &amp; Difficult difficulty levels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    10 &amp; 15 question quizzes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    Save up to 5 quiz sessions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    Retake &amp; track your progress
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    Translate quizzes into 9 languages
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/register/learner"
                    className="flex items-center justify-center gap-2 bg-white text-violet-700 font-bold px-5 py-2.5 rounded-xl hover:bg-violet-50 transition-colors text-sm shadow"
                  >
                    Sign Up as Learner <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/register/admin"
                    className="flex items-center justify-center gap-2 bg-violet-800 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-900 transition-colors text-sm"
                  >
                    I'm an Educator <Crown className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* ── Footer (home + results only) ──────────────────────────────────── */}
        {(phase === 'home' || phase === 'results') && (
          <footer className="border-t border-slate-100 py-6 px-6 text-center mt-auto">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-slate-800 text-sm">Xam Bridge</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <Link to="/login" className="hover:text-slate-700 transition-colors">Sign In</Link>
              <Link to="/register/admin" className="hover:text-slate-700 transition-colors">For Educators</Link>
              <Link to="/payment" className="hover:text-slate-700 transition-colors">Pricing</Link>
              <Link to="/faq" className="hover:text-slate-700 transition-colors">FAQ</Link>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              © {new Date().getFullYear()} Xam Bridge · Empowering learners everywhere.
            </p>
          </footer>
        )}

      </div>
    </>
  );
}
