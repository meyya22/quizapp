import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { AlertCircle, Clock, Globe, Loader2, BookOpen, Lock, Eye, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/Input';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Question, Quiz, QuestionType } from '../../types';
import { LANGUAGES, translateQuizContent, TranslatedQuizContent } from '../../services/translate';

interface ParticipantInfo {
  name: string;
  email: string;
  otherInfo: string;
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type AnswerMap = Record<string, string | string[]>;

interface QuestionCardProps {
  question: Question;
  index: number;
  answer: string | string[] | undefined;
  boolLabels: { true: string; false: string };
  onChange: (value: string | string[]) => void;
  studyMode?: boolean;
}

function StudyFeedback({ question, answer, boolLabels }: {
  question: Question;
  answer: string | string[] | undefined;
  boolLabels: { true: string; false: string };
}) {
  if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;

  const correctArr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [String(question.correctAnswer)];
  const userArr = Array.isArray(answer) ? answer : [String(answer)];
  const isCorrect = correctArr.length === userArr.length && correctArr.every((c) => userArr.includes(c));

  const renderCorrect = () => {
    if (question.type === 'TRUE_FALSE') {
      return correctArr.map((v) => (v === 'true' ? boolLabels.true : boolLabels.false)).join(', ');
    }
    if (question.options) {
      return correctArr.map((k) => `${k}. ${(question.options as Record<string, string>)[k] ?? k}`).join(', ');
    }
    return correctArr.join(', ');
  };

  return (
    <div className={`mt-3 rounded-xl border p-4 ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <p className={`text-sm font-semibold mb-1 ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
        {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
      </p>
      {!isCorrect && (
        <p className="text-sm text-slate-700 mb-1">
          <span className="font-medium">Correct answer:</span> {renderCorrect()}
        </p>
      )}
      {question.explanation && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-amber-500 shrink-0">💡</span>
          <p className="text-sm text-amber-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

function QuestionCard({ question, index, answer, boolLabels, onChange, studyMode }: QuestionCardProps) {
  const type = question.type as QuestionType;
  const hasAnswered = answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0);
  const locked = studyMode && hasAnswered;

  function toggleMultiple(option: string) {
    const current = (answer as string[]) || [];
    onChange(current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </span>
        <p className="text-slate-900 font-medium leading-relaxed">{question.text}</p>
      </div>

      <div className="pl-10 space-y-2.5">
        {type === 'MULTIPLE_CHOICE' && question.options &&
          Object.entries(question.options).map(([key, value]) => {
            const isSelected = answer === key;
            const isCorrectOpt = locked && Array.isArray(question.correctAnswer)
              ? question.correctAnswer.includes(key)
              : locked && String(question.correctAnswer) === key;
            const isWrongOpt = locked && isSelected && !isCorrectOpt;
            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  locked
                    ? isCorrectOpt
                      ? 'border-emerald-400 bg-emerald-50 cursor-default'
                      : isWrongOpt
                      ? 'border-red-400 bg-red-50 cursor-default'
                      : 'border-slate-200 cursor-default'
                    : isSelected
                    ? 'border-blue-400 bg-blue-50 cursor-pointer'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <input type="radio" name={question.id} value={key} checked={isSelected}
                  onChange={() => !locked && onChange(key)} className="text-blue-600" disabled={locked} />
                <span className="text-sm text-slate-700"><strong className="text-slate-900">{key}.</strong> {value}</span>
              </label>
            );
          })}

        {type === 'MULTIPLE_RESPONSE' && question.options &&
          Object.entries(question.options).map(([key, value]) => {
            const checked = ((answer as string[]) || []).includes(key);
            const isCorrectOpt = locked && Array.isArray(question.correctAnswer) && question.correctAnswer.includes(key);
            const isWrongOpt = locked && checked && !isCorrectOpt;
            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  locked
                    ? isCorrectOpt
                      ? 'border-emerald-400 bg-emerald-50 cursor-default'
                      : isWrongOpt
                      ? 'border-red-400 bg-red-50 cursor-default'
                      : 'border-slate-200 cursor-default'
                    : checked
                    ? 'border-blue-400 bg-blue-50 cursor-pointer'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <input type="checkbox" checked={checked} onChange={() => !locked && toggleMultiple(key)}
                  className="text-blue-600 rounded" disabled={locked} />
                <span className="text-sm text-slate-700"><strong className="text-slate-900">{key}.</strong> {value}</span>
              </label>
            );
          })}

        {type === 'TRUE_FALSE' &&
          (['true', 'false'] as const).map((val) => {
            const isSelected = answer === val;
            const isCorrectOpt = locked && String(question.correctAnswer) === val;
            const isWrongOpt = locked && isSelected && !isCorrectOpt;
            return (
              <label
                key={val}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  locked
                    ? isCorrectOpt
                      ? 'border-emerald-400 bg-emerald-50 cursor-default'
                      : isWrongOpt
                      ? 'border-red-400 bg-red-50 cursor-default'
                      : 'border-slate-200 cursor-default'
                    : isSelected
                    ? 'border-blue-400 bg-blue-50 cursor-pointer'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                }`}
              >
                <input type="radio" name={question.id} value={val} checked={isSelected}
                  onChange={() => !locked && onChange(val)} className="text-blue-600" disabled={locked} />
                <span className="text-sm font-medium text-slate-700">{boolLabels[val]}</span>
              </label>
            );
          })}

        {type === 'FREE_TEXT' && (
          <input type="text" value={(answer as string) || ''} onChange={(e) => !locked && onChange(e.target.value)}
            disabled={locked} placeholder="Type your answer here..."
            className="w-full px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-default" />
        )}
      </div>

      {studyMode && (
        <div className="pl-10">
          <StudyFeedback question={question} answer={answer} boolLabels={boolLabels} />
        </div>
      )}
    </div>
  );
}

export default function QuizPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isStandalone = location.pathname.startsWith('/quiz/');
  const isPreviewParam = new URLSearchParams(location.search).get('preview') === 'true';
  const needsParticipantForm = isStandalone && !isPreviewParam;

  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const infoForm = useForm<ParticipantInfo>();

  const startedAt = useRef(new Date().toISOString());
  const elapsed = useTimer();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [studyMode, setStudyMode] = useState(false);

  // Language state
  const [selectedLang, setSelectedLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayContent, setDisplayContent] = useState<TranslatedQuizContent>({
    questions: [],
    boolLabels: { true: 'True', false: 'False' },
  });
  const translationCache = useRef<Map<string, TranslatedQuizContent>>(new Map());

  const { data: quiz, error: quizError } = useQuery<Quiz>({
    queryKey: ['quiz', id],
    queryFn: () => api.get(`/quizzes/${id}`).then((r) => r.data),
    retry: false,
  });

  const isPrivateError =
    (quizError as { response?: { data?: { code?: string } } } | null)
      ?.response?.data?.code === 'QUIZ_PRIVATE';

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions', id, studyMode],
    queryFn: () => api.get(`/quizzes/${id}/questions${studyMode ? '?study=true' : ''}`).then((r) => r.data),
  });

  // Re-translate whenever language or source questions change
  useEffect(() => {
    if (questions.length === 0) return;

    if (selectedLang === 'en') {
      setDisplayContent({ questions, boolLabels: { true: 'True', false: 'False' } });
      return;
    }

    const cached = translationCache.current.get(selectedLang);
    if (cached) {
      setDisplayContent(cached);
      return;
    }

    setIsTranslating(true);
    translateQuizContent(questions, selectedLang)
      .then((result) => {
        translationCache.current.set(selectedLang, result);
        setDisplayContent(result);
      })
      .catch(() => {
        toast.error('Translation failed — showing English.');
        setSelectedLang('en');
      })
      .finally(() => setIsTranslating(false));
  }, [selectedLang, questions]);

  const submitMutation = useMutation({
    mutationFn: (payload: object) => api.post('/attempts', payload),
    onSuccess: (res) => navigate(
      isStandalone ? `/results/${res.data.id}` : `/participant/results/${res.data.id}`,
      { state: { lang: selectedLang } }
    ),
    onError: () => toast.error('Failed to submit quiz'),
  });

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const unanswered = questions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return true;
    if (Array.isArray(ans)) return ans.length === 0;
    return String(ans).trim() === '';
  });

  function handleSubmit() {
    setSubmitAttempted(true);
    if (unanswered.length > 0) {
      const ok = confirm(
        `You have ${unanswered.length} unanswered question${unanswered.length !== 1 ? 's' : ''}. Submit anyway?`
      );
      if (!ok) return;
    }
    submitMutation.mutate({
      quizId: id,
      answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })),
      startedAt: startedAt.current,
      ...(participantInfo && {
        participantName: participantInfo.name,
        participantEmail: participantInfo.email,
        participantInfo: participantInfo.otherInfo || undefined,
      }),
    });
  }

  if (isPrivateError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-2xl mb-5">
            <Lock className="w-7 h-7 text-slate-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">This quiz is private</h1>
          <p className="text-slate-500 text-sm">
            This quiz is not publicly accessible. Contact the quiz organiser to get access.
          </p>
        </div>
      </div>
    );
  }

  if (needsParticipantForm && !participantInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{quiz?.title ?? 'Quiz'}</h1>
            <p className="text-slate-500 mt-1 text-sm">Please fill in your details to begin</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <form
              onSubmit={infoForm.handleSubmit((data) => {
                setParticipantInfo(data);
                startedAt.current = new Date().toISOString();
              })}
              className="space-y-4"
            >
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                error={infoForm.formState.errors.name?.message}
                {...infoForm.register('name', { required: 'Name is required' })}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                error={infoForm.formState.errors.email?.message}
                {...infoForm.register('email', {
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                })}
              />
              <TextArea
                label="Other Information (optional)"
                placeholder="e.g. your organisation, department, or any notes"
                {...infoForm.register('otherInfo')}
              />
              <Button type="submit" className="w-full mt-2">
                Start Quiz
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const answeredCount = questions.length - unanswered.length;
  const displayQuestions = displayContent.questions.length > 0 ? displayContent.questions : questions;
  const isAdminPreview = isStandalone && user?.role === 'ADMIN' && isPreviewParam;

  return (
    <div className="max-w-3xl mx-auto">
      {isAdminPreview && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
          <Eye className="w-4 h-4 shrink-0" />
          <span className="font-medium">Preview Mode</span>
          <span className="text-violet-500">— You are viewing this quiz as a participant.</span>
        </div>
      )}
      {/* Sticky header */}
      <div className={`sticky ${isStandalone ? 'top-0' : 'top-16'} z-20 bg-slate-50 py-3 mb-6`}>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-bold text-slate-900">{quiz?.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {answeredCount} of {questions.length} answered
              </p>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Study mode toggle */}
              <button
                onClick={() => { setStudyMode((v) => !v); setAnswers({}); setCurrentPage(0); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  studyMode
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400 hover:text-violet-600'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Study Mode
              </button>

              {/* Language selector */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  disabled={isTranslating}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
                {isTranslating && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                )}
              </div>

              {/* Timer + progress */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono font-medium">{formatTime(elapsed)}</span>
                </div>
                <div className="h-2 w-24 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {isTranslating && (
            <p className="text-xs text-blue-600 mt-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Translating quiz content via Google Translate…
            </p>
          )}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">This quiz has no questions yet.</p>
        </div>
      ) : quiz?.layout === 'HORIZONTAL' ? (
        /* ── Horizontal: one question per page ── */
        <>
          <div className="mb-3">
            <span className="text-sm font-medium text-slate-500">
              Question {currentPage + 1} of {displayQuestions.length}
            </span>
          </div>

          <div>
            <QuestionCard
              question={displayQuestions[currentPage]}
              index={currentPage}
              answer={answers[questions[currentPage]?.id]}
              boolLabels={displayContent.boolLabels}
              onChange={(val) => setAnswer(questions[currentPage].id, val)}
              studyMode={studyMode}
            />
            {submitAttempted && unanswered.some((u) => u.id === questions[currentPage]?.id) && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5 pl-1">
                <AlertCircle className="w-3.5 h-3.5" />
                This question is unanswered
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 0}
            >
              ← Back
            </Button>

            {currentPage < displayQuestions.length - 1 ? (
              <Button onClick={() => setCurrentPage((p) => p + 1)}>
                Next →
              </Button>
            ) : (
              <Button onClick={handleSubmit} loading={submitMutation.isPending}>
                Submit Quiz
              </Button>
            )}
          </div>
        </>
      ) : (
        /* ── Vertical: all questions on one page ── */
        <>
          <div className="space-y-4">
            {displayQuestions.map((q, idx) => (
              <div key={q.id}>
                <QuestionCard
                  question={q}
                  index={idx}
                  answer={answers[q.id]}
                  boolLabels={displayContent.boolLabels}
                  onChange={(val) => setAnswer(q.id, val)}
                  studyMode={studyMode}
                />
                {submitAttempted && unanswered.some((u) => u.id === q.id) && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1.5 pl-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    This question is unanswered
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {unanswered.length > 0
                ? `${unanswered.length} question${unanswered.length !== 1 ? 's' : ''} left unanswered`
                : 'All questions answered — ready to submit!'}
            </p>
            <Button onClick={handleSubmit} loading={submitMutation.isPending} size="lg">
              Submit Quiz
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
