export type Role = 'ADMIN' | 'PARTICIPANT' | 'SUPER_ADMIN';
export type Tier = 'FREE' | 'PAID';
export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_RESPONSE' | 'TRUE_FALSE' | 'FREE_TEXT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  tier: Tier;
  complimentaryQuizId: string | null;
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
  defaultLanguage: string;
  randomizeQuestions: boolean;
  createdAt: string;
  category: { id: string; name: string; admin?: { name: string } };
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
  tags?: string | null;
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
  participantName?: string;
  participantEmail?: string;
}

export interface AttemptResult {
  id: string;
  quizId: string;
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
  country?: string;
  city?: string;
  createdAt: string;
  googleId?: string | null;
  complimentaryQuizId?: string | null;
  complimentaryQuizTitle?: string | null;
  hearAboutUs?: string | null;
  quizCount: number;
  aiQuizCount: number;
  aiGenerationsUsed: number;
  purchaseCount: number;
  grantedCategories: { id: string; name: string }[];
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
  razorpay: {
    totalPurchases: number;
    monthPurchases: number;
    totalRevenueINR: number;
    monthRevenueINR: number;
    recentTransactions: {
      id: string;
      categoryName: string;
      customerEmail: string | null;
      customerName: string | null;
      paymentId: string | null;
      orderId: string | null;
      paymentMethod: string | null;
      amountPaise: number;
      purchasedAt: string;
    }[];
  } | null;
}

export interface Contact {
  id: string;
  adminId: string;
  name: string;
  email: string;
  createdAt: string;
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
