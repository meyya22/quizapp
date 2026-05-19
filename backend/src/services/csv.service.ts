import * as XLSX from 'xlsx';
import { QuestionType } from '../types';

export interface ParsedQuestion {
  text: string;
  type: QuestionType;
  options: Record<string, string> | null;
  correctAnswer: string | string[];
  explanation?: string;
}

function normalizeType(raw: string): QuestionType {
  const t = raw.trim().toUpperCase();
  const map: Record<string, QuestionType> = {
    MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
    MC: 'MULTIPLE_CHOICE',
    MULTIPLE_RESPONSE: 'MULTIPLE_RESPONSE',
    MR: 'MULTIPLE_RESPONSE',
    TRUE_FALSE: 'TRUE_FALSE',
    TF: 'TRUE_FALSE',
    FREE_TEXT: 'FREE_TEXT',
    FT: 'FREE_TEXT',
    FILL_IN_THE_BLANK: 'FREE_TEXT',
  };
  if (!map[t]) throw new Error(`Unknown question type: "${raw}"`);
  return map[t];
}

export function parseQuestionsFile(filePath: string): ParsedQuestion[] {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  if (rows.length < 2) throw new Error('File must have a header row and at least one data row');

  const questions: ParsedQuestion[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const [questionText, typeRaw, optA, optB, optC, optD, correctRaw, explanationRaw] = row.map((v) =>
      v != null ? String(v).trim() : ''
    );

    if (!questionText || !typeRaw) continue;

    const type = normalizeType(typeRaw);

    let options: Record<string, string> | null = null;
    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_RESPONSE') {
      options = {};
      if (optA) options['A'] = optA;
      if (optB) options['B'] = optB;
      if (optC) options['C'] = optC;
      if (optD) options['D'] = optD;
      if (Object.keys(options).length === 0) {
        throw new Error(`Row ${i + 1}: ${type} requires at least one option`);
      }
    }

    let correctAnswer: string | string[];
    if (type === 'MULTIPLE_RESPONSE') {
      correctAnswer = correctRaw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = correctRaw.toLowerCase() === 'true' ? 'true' : 'false';
    } else {
      correctAnswer = correctRaw;
    }

    questions.push({
      text: questionText,
      type,
      options,
      correctAnswer,
      explanation: explanationRaw || undefined,
    });
  }

  return questions;
}

export function generateSampleCsvBuffer(): Buffer {
  const rows = [
    ['QuestionText', 'Type', 'OptionA', 'OptionB', 'OptionC', 'OptionD', 'CorrectAnswer', 'Explanation'],
    ['What is 7 × 8?', 'MULTIPLE_CHOICE', '54', '56', '58', '64', 'B', '7 multiplied by 8 equals 56.'],
    ['Is the Earth flat?', 'TRUE_FALSE', '', '', '', '', 'False', 'The Earth is an oblate spheroid, not flat.'],
    ['Which are prime numbers < 10?', 'MULTIPLE_RESPONSE', '2', '3', '4', '6', 'A,B', '2 and 3 are prime; 4 and 6 are divisible by 2.'],
    ['What is the capital of France?', 'FREE_TEXT', '', '', '', '', 'Paris', 'Paris has been the capital of France since 987 AD.'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  return XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
}
