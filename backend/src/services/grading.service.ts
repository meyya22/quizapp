import { QuestionType, SubmittedAnswer } from '../types';

interface Question {
  id: string;
  type: string;
  correctAnswer: string;
}

export function gradeAnswer(
  question: Question,
  submittedAnswer: SubmittedAnswer
): boolean {
  const correct = JSON.parse(question.correctAnswer);
  const submitted = submittedAnswer.answer;
  const type = question.type as QuestionType;

  switch (type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      return String(submitted).trim().toLowerCase() === String(correct).trim().toLowerCase();

    case 'MULTIPLE_RESPONSE': {
      const correctSet = new Set((correct as string[]).map((a: string) => a.trim().toLowerCase()));
      const submittedSet = new Set(
        (Array.isArray(submitted) ? submitted : [submitted]).map((a: string) =>
          a.trim().toLowerCase()
        )
      );
      if (correctSet.size !== submittedSet.size) return false;
      for (const item of correctSet) {
        if (!submittedSet.has(item)) return false;
      }
      return true;
    }

    case 'FREE_TEXT': {
      const normalize = (s: string) =>
        String(s)
          .trim()
          .toLowerCase()
          .replace(/\s*=\s*/g, '=')
          .replace(/\s+/g, ' ');
      const normSub = normalize(String(submitted));
      if (!normSub) return false;
      const normCorr = normalize(String(correct));
      // Support "X or Y or Z" as multiple acceptable answers
      const alternatives = normCorr.split(/\s+or\s+/).map(s => s.trim()).filter(Boolean);
      for (const alt of alternatives) {
        if (normSub === alt) return true;
        // Keyword prefix: "geothermal" matches "geothermal energy"
        if (alt.startsWith(normSub + ' ')) return true;
        // When AI stored a full explanation, the answer appears in the last sentence
        if (alt.length > 60) {
          const sentences = alt.split(/\.\s+/);
          const lastSentence = sentences[sentences.length - 1].replace(/\.$/, '').trim();
          const escaped = normSub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:^|[\\s=,;:(])${escaped}(?:[\\s.,;:!?)]|$)`);
          if (regex.test(lastSentence)) return true;
        }
      }
      return false;
    }

    default:
      return false;
  }
}

export function calculateScore(
  questions: Question[],
  answers: SubmittedAnswer[]
): { score: number; gradedAnswers: { questionId: string; isCorrect: boolean }[] } {
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const gradedAnswers: { questionId: string; isCorrect: boolean }[] = [];
  let correct = 0;

  for (const question of questions) {
    const submitted = answerMap.get(question.id);
    const isCorrect = submitted ? gradeAnswer(question, submitted) : false;
    gradedAnswers.push({ questionId: question.id, isCorrect });
    if (isCorrect) correct++;
  }

  const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
  return { score: Math.round(score * 10) / 10, gradedAnswers };
}
