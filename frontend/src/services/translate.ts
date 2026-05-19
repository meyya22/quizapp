import { Question, AttemptResult } from '../types';

export interface Language {
  code: string;
  label: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English (Default)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
];

export interface TranslatedResultContent {
  answers: AttemptResult['answers'];
  boolLabels: { true: string; false: string };
}

export async function translateResultContent(
  answers: AttemptResult['answers'],
  targetLang: string
): Promise<TranslatedResultContent> {
  if (targetLang === 'en') {
    return { answers, boolLabels: { true: 'True', false: 'False' } };
  }

  const texts: string[] = [];
  const meta: { textIdx: number; optionIdxMap: Record<string, number>; explanationIdx: number | null }[] = [];

  for (const a of answers) {
    const m = { textIdx: texts.length, optionIdxMap: {} as Record<string, number>, explanationIdx: null as number | null };
    texts.push(a.questionText);
    if (a.options) {
      for (const [key, value] of Object.entries(a.options)) {
        m.optionIdxMap[key] = texts.length;
        texts.push(value);
      }
    }
    if (a.explanation) {
      m.explanationIdx = texts.length;
      texts.push(a.explanation);
    }
    meta.push(m);
  }

  const boolStart = texts.length;
  texts.push('True', 'False');

  const BATCH = 8;
  const translated: string[] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const results = await Promise.all(texts.slice(i, i + BATCH).map((t) => translateOne(t, targetLang)));
    translated.push(...results);
  }

  const translatedAnswers = answers.map((a, i) => {
    const m = meta[i];
    let options = a.options;
    if (options) {
      options = Object.fromEntries(Object.keys(options).map((k) => [k, translated[m.optionIdxMap[k]]]));
    }
    return {
      ...a,
      questionText: translated[m.textIdx],
      options,
      explanation: m.explanationIdx !== null ? translated[m.explanationIdx] : a.explanation,
    };
  });

  return {
    answers: translatedAnswers,
    boolLabels: { true: translated[boolStart], false: translated[boolStart + 1] },
  };
}

async function translateOne(text: string, targetLang: string): Promise<string> {
  if (!text.trim() || targetLang === 'en') return text;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation request failed: ${res.status}`);
  const data: string[][][] = await res.json();
  return data[0].map((chunk) => chunk[0]).join('');
}

export interface TranslatedQuizContent {
  questions: Question[];
  boolLabels: { true: string; false: string };
}

export async function translateQuizContent(
  questions: Question[],
  targetLang: string
): Promise<TranslatedQuizContent> {
  if (targetLang === 'en') {
    return { questions, boolLabels: { true: 'True', false: 'False' } };
  }

  // Flatten all texts that need translation into one batch
  const originalTexts: string[] = [];
  const questionMeta: { textIdx: number; optionIdxMap: Record<string, number> }[] = [];

  for (const q of questions) {
    const meta = { textIdx: originalTexts.length, optionIdxMap: {} as Record<string, number> };
    originalTexts.push(q.text);
    if (q.options) {
      for (const [key, value] of Object.entries(q.options)) {
        meta.optionIdxMap[key] = originalTexts.length;
        originalTexts.push(value);
      }
    }
    questionMeta.push(meta);
  }

  // Add True/False at the end
  const trueFalseStart = originalTexts.length;
  originalTexts.push('True', 'False');

  // Translate all in parallel (capped at 8 concurrent to avoid rate limiting)
  const BATCH = 8;
  const translated: string[] = [];
  for (let i = 0; i < originalTexts.length; i += BATCH) {
    const batch = originalTexts.slice(i, i + BATCH);
    const results = await Promise.all(batch.map((t) => translateOne(t, targetLang)));
    translated.push(...results);
  }

  // Rebuild questions with translations
  const translatedQuestions = questions.map((q, i) => {
    const meta = questionMeta[i];
    let translatedOptions: Record<string, string> | null = null;
    if (q.options) {
      translatedOptions = {};
      for (const key of Object.keys(q.options)) {
        translatedOptions[key] = translated[meta.optionIdxMap[key]];
      }
    }
    return { ...q, text: translated[meta.textIdx], options: translatedOptions };
  });

  return {
    questions: translatedQuestions,
    boolLabels: {
      true: translated[trueFalseStart],
      false: translated[trueFalseStart + 1],
    },
  };
}
