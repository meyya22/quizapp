import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tier: string;
    name: string;
  };
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_RESPONSE' | 'TRUE_FALSE' | 'FREE_TEXT';

export interface QuestionOptions {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
}

export interface SubmittedAnswer {
  questionId: string;
  answer: string | string[];
}
