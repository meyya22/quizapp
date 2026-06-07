import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, Trophy, ArrowLeft, RotateCcw, Globe, Loader2, ChevronRight } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import { AttemptResult, QuestionType } from '../../types';
import { LANGUAGES, translateResultContent } from '../../services/translate';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function renderAnswer(
  value: string | string[] | null,
  questionType: QuestionType,
  boolLabels: { true: string; false: string }
): string {
  if (value === null || value === undefined || value === '') return '(No answer)';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(No answer)';
  if (questionType === 'TRUE_FALSE') return value === 'true' ? boolLabels.true : boolLabels.false;
  return String(value);
}

interface ExamQuiz { id: string; title: string; url: string | null; order: number; }
interface ExamSubCategory { id: string; name: string; order: number; quizzes: ExamQuiz[]; }
interface ExamCategory { id: string; name: string; order: number; subCategories: ExamSubCategory[]; }

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple Choice',
  MULTIPLE_RESPONSE: 'Multiple Response',
  TRUE_FALSE: 'True / False',
  FREE_TEXT: 'Free Text',
};

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const location = useLocation();
  const initialLang = (location.state as { lang?: string } | null)?.lang ?? 'en';

  const [selectedLang, setSelectedLang] = useState(initialLang);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayAnswers, setDisplayAnswers] = useState<AttemptResult['answers'] | null>(null);
  const [boolLabels, setBoolLabels] = useState({ true: 'True', false: 'False' });
  const cache = useRef<Map<string, { answers: AttemptResult['answers']; boolLabels: { true: string; false: string } }>>(new Map());

  const { data: result, isLoading } = useQuery<AttemptResult>({
    queryKey: ['attempt', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}`).then((r) => r.data),
  });

  const { data: examContent = [] } = useQuery<ExamCategory[]>({
    queryKey: ['exam-content-public'],
    queryFn: () => api.get('/exam-content/public').then((r) => r.data),
    staleTime: 60_000,
    enabled: !!result,
  });

  useEffect(() => {
    if (!result) return;

    if (selectedLang === 'en') {
      setDisplayAnswers(result.answers);
      setBoolLabels({ true: 'True', false: 'False' });
      return;
    }

    const cached = cache.current.get(selectedLang);
    if (cached) {
      setDisplayAnswers(cached.answers);
      setBoolLabels(cached.boolLabels);
      return;
    }

    setIsTranslating(true);
    translateResultContent(result.answers, selectedLang)
      .then((translated) => {
        cache.current.set(selectedLang, translated);
        setDisplayAnswers(translated.answers);
        setBoolLabels(translated.boolLabels);
      })
      .catch(() => setSelectedLang('en'))
      .finally(() => setIsTranslating(false));
  }, [selectedLang, result]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) return <p className="text-center text-slate-500 py-12">Result not found.</p>;

  const answers = displayAnswers ?? result.answers;
  const correct = result.answers.filter((a) => a.isCorrect).length;
  const total = result.answers.length;

  const isStandalone = location.pathname.startsWith('/results/');

  const currentUrl = `/quiz/${result.quizId}`;
  let nextQuizInfo: { url: string; label: string } | null = null;
  outer: for (const cat of examContent) {
    for (const sub of cat.subCategories) {
      const sorted = [...sub.quizzes].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((q) => q.url === currentUrl);
      if (idx !== -1 && idx < sorted.length - 1) {
        const next = sorted[idx + 1];
        if (next.url) {
          nextQuizInfo = { url: next.url, label: `${sub.name} — ${next.title}` };
        }
        break outer;
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </Link>

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
          {isTranslating && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
        </div>
      </div>

      <div className={`rounded-2xl p-8 mb-6 text-center ${result.passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${result.passed ? 'bg-emerald-100' : 'bg-red-100'}`}>
          {result.passed ? (
            <Trophy className="w-10 h-10 text-emerald-600" />
          ) : (
            <XCircle className="w-10 h-10 text-red-500" />
          )}
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-1">
          {result.score.toFixed(1)}%
        </h1>
        <Badge variant={result.passed ? 'success' : 'danger'}>
          {result.passed ? 'Passed' : 'Failed'}
        </Badge>
        <p className="text-slate-600 mt-3 font-medium">{result.quiz.title}</p>
        <p className="text-sm text-slate-500 mt-1">
          Required: {result.quiz.passingScore}% to pass
        </p>

        <div className="flex justify-center gap-8 mt-6 pt-6 border-t border-slate-200">
          <div>
            <p className="text-2xl font-bold text-slate-900">{correct}/{total}</p>
            <p className="text-xs text-slate-500">Correct Answers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-slate-400" />
              {formatTime(result.timeTaken)}
            </p>
            <p className="text-xs text-slate-500">Time Taken</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 mb-4">
        <Link
          to={isStandalone ? `/quiz/${result.quizId}` : `/participant/quiz/${result.quizId}`}
          state={{ lang: selectedLang }}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <RotateCcw className="w-4 h-4" />
          Retake Quiz
        </Link>
        {nextQuizInfo && (
          <Link
            to={nextQuizInfo.url}
            state={{ lang: selectedLang }}
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-800"
          >
            <ChevronRight className="w-4 h-4" />
            Next: {nextQuizInfo.label}
          </Link>
        )}
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Question Review</h2>

      <div className="space-y-4">
        {answers.map((item, idx) => (
          <div
            key={item.questionId}
            className={`bg-white rounded-xl border p-5 ${
              item.isCorrect ? 'border-emerald-200' : 'border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {item.isCorrect ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400">Q{idx + 1}</span>
                  <Badge variant="neutral">{TYPE_LABELS[item.questionType]}</Badge>
                </div>
                <p className="font-medium text-slate-900 mb-3">{item.questionText}</p>

                {item.options && (
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {Object.entries(item.options).map(([key, value]) => {
                      const isNumericKey = /^\d+$/.test(key);
                      const answerValue = isNumericKey ? (value as string) : key;
                      const displayKey = isNumericKey ? String.fromCharCode(65 + parseInt(key)) : key;
                      const correctArr = Array.isArray(item.correctAnswer)
                        ? item.correctAnswer
                        : [item.correctAnswer];
                      const userArr = Array.isArray(item.userAnswer)
                        ? item.userAnswer
                        : [item.userAnswer];
                      const isCorrectOption = correctArr.includes(answerValue);
                      const isUserChoice = userArr.includes(answerValue);

                      return (
                        <div
                          key={key}
                          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                            isCorrectOption
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isUserChoice && !isCorrectOption
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-100'
                          }`}
                        >
                          <span className="font-medium">{displayKey}.</span> {value as string}
                          {isCorrectOption && <CheckCircle className="w-3.5 h-3.5 ml-auto" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <div className={`flex-1 px-3 py-2 rounded-lg ${item.isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <span className="text-slate-500 text-xs font-medium">Your answer: </span>
                    <span className={`font-medium ${item.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                      {renderAnswer(item.userAnswer, item.questionType, boolLabels)}
                    </span>
                  </div>
                  {!item.isCorrect && (
                    <div className="flex-1 px-3 py-2 rounded-lg bg-emerald-50">
                      <span className="text-slate-500 text-xs font-medium">Correct answer: </span>
                      <span className="font-medium text-emerald-700">
                        {renderAnswer(item.correctAnswer, item.questionType, boolLabels)}
                      </span>
                    </div>
                  )}
                </div>

                {item.explanation && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-amber-500 mt-0.5 shrink-0">💡</span>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Explanation</p>
                      <p className="text-sm text-amber-800">{item.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
