import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AlertCircle, Clock, Globe, Loader2, BookOpen, Lock, Eye, GraduationCap, Sparkles, X, Share2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Question, Quiz, QuestionType } from '../../types';
import { LANGUAGES, translateQuizContent, TranslatedQuizContent } from '../../services/translate';

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
  onExplain?: (questionText: string) => void;
}

function normalizeFreeText(s: string) {
  return String(s).trim().toLowerCase().replace(/\s*=\s*/g, '=').replace(/\s+/g, ' ');
}

function checkFreeTextCorrect(submitted: string, correct: string): boolean {
  const normSub = normalizeFreeText(submitted);
  if (!normSub) return false;
  const alternatives = normalizeFreeText(correct).split(/\s+or\s+/).map(s => s.trim()).filter(Boolean);
  for (const alt of alternatives) {
    if (normSub === alt) return true;
    if (alt.startsWith(normSub + ' ')) return true;
    if (alt.length > 60) {
      const sentences = alt.split(/\.\s+/);
      const lastSentence = sentences[sentences.length - 1].replace(/\.$/, '').trim();
      const escaped = normSub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|[\\s=,;:(])${escaped}(?:[\\s.,;:!?)]|$)`).test(lastSentence)) return true;
    }
  }
  return false;
}

function StudyFeedback({ question, answer, boolLabels }: {
  question: Question;
  answer: string | string[] | undefined;
  boolLabels: { true: string; false: string };
}) {
  if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;

  const correctArr = Array.isArray(question.correctAnswer) ? question.correctAnswer : [String(question.correctAnswer)];
  const userArr = Array.isArray(answer) ? answer : [String(answer)];
  const isCorrect = question.type === 'FREE_TEXT'
    ? checkFreeTextCorrect(String(answer), String(question.correctAnswer))
    : correctArr.length === userArr.length && correctArr.every((c) => userArr.includes(c));

  const renderCorrect = () => {
    if (question.type === 'TRUE_FALSE') {
      return correctArr.map((v) => (v === 'true' ? boolLabels.true : boolLabels.false)).join(', ');
    }
    if (question.options) {
      const optEntries = Object.entries(question.options as Record<string, string>);
      return correctArr.map((k) => {
        const entry = optEntries.find(([ek]) => ek === k);
        if (entry) return `${k}. ${entry[1]}`; // letter-keyed (A/B/C/D): show "A. option text"
        return k; // full-text correctAnswer (array-style options): show text directly
      }).join(', ');
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

function QuestionCard({ question, index, answer, boolLabels, onChange, studyMode, onExplain }: QuestionCardProps) {
  const type = question.type as QuestionType;
  const hasAnswered = answer !== undefined && answer !== '' && !(Array.isArray(answer) && answer.length === 0);
  const [freeTextConfirmed, setFreeTextConfirmed] = useState(false);

  // Reset confirmation when answer is cleared (e.g. study mode toggled off)
  useEffect(() => {
    if (!answer || answer === '') setFreeTextConfirmed(false);
  }, [answer]);

  // FREE_TEXT only locks after explicit Check — other types lock on selection
  const locked = studyMode && (type === 'FREE_TEXT' ? freeTextConfirmed : hasAnswered);
  const showStudyFeedback = studyMode && (type === 'FREE_TEXT' ? freeTextConfirmed : hasAnswered);

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
            const isNumericKey = /^\d+$/.test(key);
            const answerValue = isNumericKey ? (value as string) : key;
            const displayKey = isNumericKey ? String.fromCharCode(65 + parseInt(key)) : key;
            const isSelected = answer === answerValue;
            const isCorrectOpt = locked && (
              Array.isArray(question.correctAnswer)
                ? (question.correctAnswer as string[]).includes(answerValue)
                : String(question.correctAnswer) === answerValue
            );
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
                <input type="radio" name={question.id} value={answerValue} checked={isSelected}
                  onChange={() => !locked && onChange(answerValue)} className="text-blue-600" disabled={locked} />
                <span className="text-sm text-slate-700">
                  <strong className="text-slate-900">{displayKey}. </strong>{value as string}
                </span>
              </label>
            );
          })}

        {type === 'MULTIPLE_RESPONSE' && question.options &&
          Object.entries(question.options).map(([key, value]) => {
            const isNumericKey = /^\d+$/.test(key);
            const answerValue = isNumericKey ? (value as string) : key;
            const displayKey = isNumericKey ? String.fromCharCode(65 + parseInt(key)) : key;
            const checked = ((answer as string[]) || []).includes(answerValue);
            const isCorrectOpt = locked && Array.isArray(question.correctAnswer) && (question.correctAnswer as string[]).includes(answerValue);
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
                <input type="checkbox" checked={checked} onChange={() => !locked && toggleMultiple(answerValue)}
                  className="text-blue-600 rounded" disabled={locked} />
                <span className="text-sm text-slate-700">
                  <strong className="text-slate-900">{displayKey}. </strong>{value as string}
                </span>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={(answer as string) || ''}
              onChange={(e) => !locked && onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && studyMode && hasAnswered && !locked) setFreeTextConfirmed(true);
              }}
              disabled={locked}
              placeholder="Type your answer here..."
              className="flex-1 px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-default"
            />
            {studyMode && hasAnswered && !locked && (
              <button
                onClick={() => setFreeTextConfirmed(true)}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shrink-0"
              >
                Check
              </button>
            )}
          </div>
        )}
      </div>

      {showStudyFeedback && (
        <div className="pl-10">
          <StudyFeedback question={question} answer={answer} boolLabels={boolLabels} />
        </div>
      )}

      <div className="mt-4 pl-10 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onExplain?.(question.text)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 border border-violet-200 hover:border-violet-400 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          Concept Study
        </button>
        {question.tags && (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
            <span className="text-slate-400">📌</span>
            {question.tags}
          </span>
        )}
      </div>
    </div>
  );
}

function ExplainModal({ quizTitle, questionText, initialLang, onClose }: { quizTitle: string; questionText: string; initialLang: string; onClose: () => void }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExplanation(null);
    setError(null);
    const langLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? 'English';
    api.post('/ai-quiz/explain', { quizTitle, questionText, language: langLabel })
      .then((r) => { if (!cancelled) setExplanation(r.data.explanation); })
      .catch(() => { if (!cancelled) setError('Could not get an explanation. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [quizTitle, questionText, lang]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-600" />
            <span className="font-bold text-slate-900 text-sm">Concept Study</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                disabled={loading}
                className="text-xs border border-slate-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50 bg-white max-w-[120px]"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-400 mb-3 line-clamp-2 italic">"{questionText}"</p>
          {loading && (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              AI is thinking…
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {explanation && (
            <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
              {explanation}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const FREE_PREVIEW_LIMIT = 5;

const SHARE_PLATFORMS = (url: string, title: string) => [
  {
    name: 'WhatsApp',
    bg: 'bg-[#25D366]',
    href: `https://wa.me/?text=${encodeURIComponent(`Practice this quiz: ${title}\n${url}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L0 24l6.335-1.508A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.805 9.805 0 01-4.999-1.368l-.358-.214-3.76.895.955-3.668-.233-.375A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
    ),
  },
  {
    name: 'Telegram',
    bg: 'bg-[#229ED9]',
    href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Practice this quiz: ${title}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.59l-2.945-.924c-.64-.203-.654-.64.136-.954l11.498-4.43c.534-.194 1.002.131.835.939z"/></svg>
    ),
  },
  {
    name: 'Email',
    bg: 'bg-slate-600',
    href: `mailto:?subject=${encodeURIComponent(`Try this quiz: ${title}`)}&body=${encodeURIComponent(`Hi,\n\nI found this quiz on XamBridge and thought you might find it useful:\n\n${title}\n${url}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
    ),
  },
  {
    name: 'Messages',
    bg: 'bg-green-500',
    href: `sms:?body=${encodeURIComponent(`Practice this quiz: ${title}\n${url}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
    ),
  },
  {
    name: 'Messenger',
    bg: 'bg-[#0099FF]',
    href: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=181374745&redirect_uri=${encodeURIComponent(url)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 0C5.373 0 0 5.149 0 11.5c0 3.578 1.793 6.773 4.608 8.853V24l4.26-2.34c1.133.314 2.335.48 3.573.48 6.627 0 12-5.149 12-11.5S18.627 0 12 0zm1.197 15.473l-3.056-3.26-5.963 3.26L10.76 8.4l3.13 3.26 5.89-3.26-6.583 7.073z"/></svg>
    ),
  },
  {
    name: 'X (Twitter)',
    bg: 'bg-black',
    href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Practice this quiz: ${title}`)}`,
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ),
  },
];

function ShareMenu({ quizId, quizTitle }: { quizId: string; quizTitle: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = `https://www.xambridge.com/quiz/${quizId}`;

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleClick() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: quizTitle, url });
        return;
      } catch {}
    }
    setOpen((v) => !v);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const platforms = SHARE_PLATFORMS(url, quizTitle);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 w-72">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Share this quiz</p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {platforms.map((p) => (
              <a
                key={p.name}
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <div className={`w-11 h-11 ${p.bg} rounded-2xl flex items-center justify-center shadow-sm`}>
                  {p.icon}
                </div>
                <span className="text-xs text-slate-600 text-center leading-tight">{p.name}</span>
              </a>
            ))}
          </div>

          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
          >
            {copied
              ? <><Check className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600">Link copied!</span></>
              : <><Copy className="w-4 h-4 text-slate-400" />Copy link</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

function UpgradeWall({ locked, categoryName, examCategoryId }: { locked: number; categoryName?: string; examCategoryId?: string | null }) {
  const checkoutUrl = examCategoryId
    ? `/checkout?categoryId=${encodeURIComponent(examCategoryId)}&categoryName=${encodeURIComponent(categoryName ?? '')}`
    : '/checkout';
  return (
    <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border-2 border-amber-200 p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-4">
        <Lock className="w-7 h-7 text-amber-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {locked} more question{locked !== 1 ? 's' : ''} locked
      </h2>
      <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
        Unlock all mock test questions across every subject
        {categoryName ? <> in <strong className="text-slate-700">{categoryName}</strong></> : ''}.
      </p>
      <Link
        to={checkoutUrl}
        className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
      >
        <Sparkles className="w-4 h-4" />
        Pay ₹299 — Unlock {categoryName ? `all ${categoryName} mock tests` : 'all mock tests'}
      </Link>
    </div>
  );
}

function SignupWall({ returnTo }: { returnTo: string }) {
  return (
    <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border-2 border-violet-200 p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-100 rounded-2xl mb-4">
        <Lock className="w-7 h-7 text-violet-600" />
      </div>
      <p className="text-slate-700 text-base font-medium mb-6 max-w-sm mx-auto">
        Create a free account to view the remaining questions
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/register/learner"
          state={{ from: returnTo }}
          className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          <Sparkles className="w-4 h-4" /> Create Free Account
        </Link>
        <Link
          to="/login"
          state={{ from: returnTo }}
          className="inline-flex items-center justify-center gap-2 border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
        >
          Sign In
        </Link>
      </div>
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
  const isAnonymous = isStandalone && !user;

  const [capReached, setCapReached] = useState<{ tier: string } | null>(null);
  const [attemptLimitReached, setAttemptLimitReached] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUpgradeWall, setShowUpgradeWall] = useState(false);
  const [explainTarget, setExplainTarget] = useState<{ questionText: string } | null>(null);

  const startedAt = useRef(new Date().toISOString());
  const elapsed = useTimer();
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const qParam = parseInt(new URLSearchParams(location.search).get('q') ?? '1', 10);
  const [currentPage, setCurrentPage] = useState(isNaN(qParam) ? 0 : Math.max(0, qParam - 1));
  const [studyMode, setStudyMode] = useState(false);

  // Language state — initialized from quiz.defaultLanguage once loaded
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

  useEffect(() => {
    if (quiz?.defaultLanguage) setSelectedLang(quiz.defaultLanguage);
  }, [quiz?.defaultLanguage]);

  const isPrivateError =
    (quizError as { response?: { data?: { code?: string } } } | null)
      ?.response?.data?.code === 'QUIZ_PRIVATE';

  const { data: questionData, isLoading, error: questionsError } = useQuery<{ questions: Question[]; totalQuestions: number; examCategoryId?: string | null; examCategoryName?: string | null }>({
    queryKey: ['questions', id, studyMode],
    queryFn: async () => {
      const r = await api.get(`/quizzes/${id}/questions${studyMode ? '?study=true' : ''}`);
      if (Array.isArray(r.data)) return { questions: r.data as Question[], totalQuestions: r.data.length };
      return r.data;
    },
    retry: false,
  });
  const questions = questionData?.questions ?? [];
  const totalQuestions = questionData?.totalQuestions ?? 0;
  const examCategoryId = questionData?.examCategoryId ?? null;
  const examCategoryName = questionData?.examCategoryName ?? null;

  useEffect(() => {
    const data = (questionsError as { response?: { data?: { code?: string; tier?: string } } } | null)?.response?.data;
    if (data?.code === 'RESPONSE_CAP_REACHED') {
      setCapReached({ tier: data.tier ?? 'FREE' });
    } else if (data?.code === 'ATTEMPT_LIMIT_REACHED') {
      setAttemptLimitReached(true);
    }
  }, [questionsError]);

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
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { code?: string; tier?: string } } }).response?.data;
      if (data?.code === 'RESPONSE_CAP_REACHED') {
        setCapReached({ tier: data.tier ?? 'FREE' });
      } else {
        toast.error('Failed to submit quiz');
      }
    },
  });

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  const freeQuestions = isAnonymous ? questions.slice(0, FREE_PREVIEW_LIMIT) : questions;
  const hasLockedQuestions = isAnonymous && questions.length > FREE_PREVIEW_LIMIT;
  // True for any participant (FREE or PAID) who has not purchased this category yet
  const isPreviewLimited = !isAnonymous && user?.role === 'PARTICIPANT' && totalQuestions > questions.length;
  const returnTo = `${location.pathname}?q=${FREE_PREVIEW_LIMIT + 1}`;

  const unanswered = freeQuestions.filter((q) => {
    const ans = answers[q.id];
    if (!ans) return true;
    if (Array.isArray(ans)) return ans.length === 0;
    return String(ans).trim() === '';
  });

  function handleUnlockClick() {
    setShowPaywall(true);
    api.post('/attempts/anonymous-preview', {
      quizId: id,
      quizTitle: quiz?.title,
      examCategory: examCategoryName ?? quiz?.category?.name,
    }).catch(() => {});
  }

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
    });
  }

  if (attemptLimitReached) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-5">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Attempt limit reached</h1>
          <p className="text-slate-500 text-sm">Sorry, your maximum retake attempt limit of 10 is reached.</p>
        </div>
      </div>
    );
  }

  if (capReached) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-5">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Quiz temporarily unavailable</h1>
          <p className="text-slate-500 text-sm">
            {capReached.tier === 'FREE'
              ? 'The quiz creator has reached their lifetime response limit on the free plan. They need to upgrade to accept more responses.'
              : 'The quiz creator has reached their monthly response limit. Please try again next month.'}
          </p>
        </div>
      </div>
    );
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const answeredCount = freeQuestions.length - unanswered.length;
  const displayQuestions = (displayContent.questions.length > 0 ? displayContent.questions : questions);
  const anonDisplayQuestions = isAnonymous ? displayQuestions.slice(0, FREE_PREVIEW_LIMIT) : displayQuestions;
  const isAdminPreview = isStandalone && user?.role === 'ADMIN' && isPreviewParam;

  return (
    <div className="max-w-3xl mx-auto">
      {explainTarget && (
        <ExplainModal
          quizTitle={quiz?.title ?? ''}
          questionText={explainTarget.questionText}
          initialLang={selectedLang}
          onClose={() => setExplainTarget(null)}
        />
      )}
      {isAdminPreview && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 rounded-xl text-sm text-violet-700">
          <Eye className="w-4 h-4 shrink-0" />
          <span className="font-medium">Preview Mode</span>
          <span className="text-violet-500">— You are viewing this quiz as a participant.</span>
        </div>
      )}
      {/* Quiz title — above sticky header so it's always fully visible on mobile */}
      {quiz?.title && (
        <h1 className="font-bold text-slate-900 text-lg leading-snug mb-2 px-1">
          {quiz.category?.name && (
            <span className="text-slate-500 font-medium">{quiz.category.name}, </span>
          )}
          {quiz.title}
        </h1>
      )}

      {/* Sticky header */}
      <div className={`sticky ${isStandalone ? 'top-0' : 'top-16'} z-20 bg-slate-50 py-2 mb-4`}>
        <div className="bg-white rounded-xl border border-slate-200 px-4 pt-3 pb-2.5">
          {/* Controls row — Home, Share, answered count */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => navigate('/')}
              className="shrink-0 px-3 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 hover:bg-slate-100 transition-colors"
            >
              Home
            </button>
            {id && quiz?.title && <ShareMenu quizId={id} quizTitle={quiz.title} />}
            <span className="text-xs text-slate-400 shrink-0 ml-auto">
              {answeredCount}/{freeQuestions.length}
              {hasLockedQuestions && <span className="text-violet-500"> · Free</span>}
              {isPreviewLimited && <span className="text-amber-500"> · Preview</span>}
            </span>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* Study mode */}
            <button
              onClick={() => { setStudyMode((v) => !v); setAnswers({}); setCurrentPage(0); }}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                studyMode
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-violet-400 hover:text-violet-600'
              }`}
            >
              <GraduationCap className="w-3 h-3" />
              Study Mode
            </button>

            {/* Language selector */}
            <div className="flex items-center gap-1">
              {isTranslating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                : <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                disabled={isTranslating}
                className="text-xs border border-slate-300 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-wait bg-white max-w-[120px]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            {/* Timer + progress */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-mono font-medium text-slate-600">{formatTime(elapsed)}</span>
              <div className="hidden sm:block h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(answeredCount / Math.max(freeQuestions.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">This quiz has no questions yet.</p>
        </div>
      ) : quiz?.layout === 'HORIZONTAL' ? (
        /* ── Horizontal: one question per page ── */
        <>
          {showPaywall ? (
            <SignupWall returnTo={returnTo} />
          ) : showUpgradeWall ? (
            <UpgradeWall locked={totalQuestions - questions.length} categoryName={examCategoryName ?? quiz?.category?.name} examCategoryId={examCategoryId} />

          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Question {currentPage + 1} of {anonDisplayQuestions.length}
                  {hasLockedQuestions && <span className="text-violet-400"> (free preview)</span>}
                </span>
              </div>

              <div>
                <QuestionCard
                  question={anonDisplayQuestions[currentPage]}
                  index={currentPage}
                  answer={answers[freeQuestions[currentPage]?.id]}
                  boolLabels={displayContent.boolLabels}
                  onChange={(val) => setAnswer(freeQuestions[currentPage].id, val)}
                  studyMode={studyMode}
                  onExplain={(text) => setExplainTarget({ questionText: text })}
                />
                {submitAttempted && unanswered.some((u) => u.id === freeQuestions[currentPage]?.id) && (
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

                {isAnonymous && hasLockedQuestions && currentPage === anonDisplayQuestions.length - 1 ? (
                  <button
                    onClick={handleUnlockClick}
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <Sparkles className="w-4 h-4" /> Unlock Full Paper →
                  </button>
                ) : isPreviewLimited && currentPage === anonDisplayQuestions.length - 1 ? (
                  <button
                    onClick={() => setShowUpgradeWall(true)}
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <Lock className="w-4 h-4" /> Want to practice all {totalQuestions} questions?
                  </button>
                ) : currentPage < anonDisplayQuestions.length - 1 ? (
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
          )}
        </>
      ) : (
        /* ── Vertical: all questions on one page ── */
        <>
          <div className="space-y-4">
            {anonDisplayQuestions.map((q, idx) => (
              <div key={q.id}>
                <QuestionCard
                  question={q}
                  index={idx}
                  answer={answers[q.id]}
                  boolLabels={displayContent.boolLabels}
                  onChange={(val) => setAnswer(q.id, val)}
                  studyMode={studyMode}
                  onExplain={(text) => setExplainTarget({ questionText: text })}
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

          {isAnonymous ? (
            <div className="mt-6">
              {hasLockedQuestions ? (
                <SignupWall returnTo={returnTo} />
              ) : (
                <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl border-2 border-violet-200 p-6 text-center">
                  <Sparkles className="w-8 h-8 text-violet-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-900 mb-1">Want to save your progress?</p>
                  <p className="text-sm text-slate-500 mb-4">Create a free account to track results and access all subjects.</p>
                  <Link to="/register/learner" state={{ from: location.pathname }} className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
                    <Sparkles className="w-4 h-4" /> Create Free Account
                  </Link>
                </div>
              )}
            </div>
          ) : isPreviewLimited ? (
            <div className="mt-6">
              <UpgradeWall locked={totalQuestions - questions.length} categoryName={examCategoryName ?? quiz?.category?.name} examCategoryId={examCategoryId} />
            </div>
          ) : (
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
          )}
        </>
      )}
    </div>
  );
}
