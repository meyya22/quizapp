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

  useEffect(() => {
    const base = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    fetch(`${base}/page-visits`, { method: 'POST', mode: 'no-cors', body: '' }).catch(() => {});
  }, []);

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
        <title>XamGeni — AI Practice Quiz Tool · Xam Bridge</title>
        <meta
          name="description"
          content="XamGeni by Xam Bridge generates instant AI practice quizzes on any topic — NEET Biology, UPSC History, SSC Reasoning, Banking Quant and more. Free to try, no sign-up needed."
        />
        <meta name="keywords" content="AI practice quiz India, NEET practice questions, UPSC practice quiz, SSC quiz generator, exam practice tool India, free quiz generator, XamGeni, Xam Bridge practice" />
        <link rel="canonical" href="https://www.xambridge.com/" />
        <meta property="og:title" content="XamGeni — AI Practice Quiz Tool · Xam Bridge" />
        <meta property="og:description" content="Generate instant practice quizzes on NEET, UPSC, SSC, Banking and more. Powered by AI — free to try." />
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
                    className="px-4 py-2 border-2 border-slate-800 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
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
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 mb-3">
              <Link to="/login" className="hover:text-slate-700 transition-colors">Sign In</Link>
              <Link to="/register/admin" className="hover:text-slate-700 transition-colors">For Educators</Link>
              <Link to="/payment" className="hover:text-slate-700 transition-colors">Pricing</Link>
              <Link to="/faq" className="hover:text-slate-700 transition-colors">FAQ</Link>
            </div>
            <div className="flex items-center justify-center gap-5 mb-3">
              <a href="https://twitter.com/_topstudent" target="_blank" rel="noopener noreferrer" title="Twitter / X" className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231z"/></svg>
              </a>
              <a href="https://instagram.com/xam.bridge" target="_blank" rel="noopener noreferrer" title="Instagram" className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="https://t.me/jeeneetexam" target="_blank" rel="noopener noreferrer" title="Telegram" className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
              <a href="https://reddit.com/u/Ok_pick_8431" target="_blank" rel="noopener noreferrer" title="Reddit" className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
              </a>
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Xam Bridge · Empowering learners everywhere.
            </p>
          </footer>
        )}

      </div>
    </>
  );
}
