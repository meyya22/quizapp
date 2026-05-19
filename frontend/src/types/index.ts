export type Role = 'ADMIN' | 'PARTICIPANT' | 'SUPER_ADMIN';
export type Tier = 'FREE' | 'PAID';
export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_RESPONSE' | 'TRUE_FALSE' | 'FREE_TEXT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tier: Tier;
}

export interface Category {
  id: string;
  adminId: string;
  name: string;
  description?: string;
  createdAt: string;
  _count?: { quizzes: number };
}

export type Visibility = 'PUBLIC' | 'PRIVATE';
export type Layout = 'VERTICAL' | 'HORIZONTAL';

export interface Quiz {
  id: string;
  categoryId: string;
  title: string;
  description?: string;
  passingScore: number;
  published: boolean;
  visibility: Visibility;
  layout: Layout;
  createdAt: string;
  category: { id: string; name: string };
  _count?: { questions: number; attempts?: number };
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  type: QuestionType;
  options: Record<string, string> | null;
  correctAnswer: string | string[];
  explanation?: string | null;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  passed: boolean;
  timeTaken: number;
  startedAt: string;
  completedAt: string;
  quiz?: { title: string; category?: { name: string } };
  user?: { id: string; name: string; email: string };
}

export interface AttemptResult {
  id: string;
  score: number;
  passed: boolean;
  timeTaken: number;
  completedAt: string;
  quiz: { title: string; passingScore: number };
  answers: {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    options: Record<string, string> | null;
    explanation: string | null;
    userAnswer: string | string[];
    correctAnswer: string | string[];
    isCorrect: boolean;
  }[];
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  tier: Tier;
  createdAt: string;
  quizCount: number;
  _count: { attempts: number };
}

export interface AdminStats {
  categories: number;
  quizzes: number;
  participants: number;
  attempts: number;
}

export type SubscriptionPlan = 'MONTHLY' | 'YEARLY';

export interface SubscriptionInfo {
  id: string;
  status: string;
  plan: SubscriptionPlan;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: { brand: string; last4: string } | null;
}

export interface PaymentMetrics {
  totalPaid: number;
  monthlyPlan: number;
  yearlyPlan: number;
  totalRevenue: number;
  monthRevenue: number;
  mrr: number;
  recentTransactions: {
    id: string;
    amountPaid: number;
    currency: string;
    date: string;
    customerEmail: string | null;
    description: string | null;
    invoiceUrl: string | null;
  }[];
}

export interface Invoice {
  id: string;
  amountPaid: number;
  currency: string;
  status: string | null;
  date: string;
  periodStart: string;
  periodEnd: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
  description: string | null;
}
