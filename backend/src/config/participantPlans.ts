export type ParticipantPlanKey = 'STARTER' | 'PREPREADY' | 'EXAMELITE';

export interface PlanConfig {
  name: string;
  priceMonthly: number; // cents
  aiQuizLimit: number;
  allowedQuestionCounts: number[];
  allowedDifficulties: string[];
  monthlyReset: boolean;
  pdfExport: boolean;
  studyMode: boolean;
  stripeProductId?: string;
}

export const PARTICIPANT_PLANS: Record<ParticipantPlanKey, PlanConfig> = {
  STARTER: {
    name: 'Starter',
    priceMonthly: 0,
    aiQuizLimit: 5,
    allowedQuestionCounts: [5, 10],
    allowedDifficulties: ['Easy', 'Moderate'],
    monthlyReset: false,
    pdfExport: false,
    studyMode: false,
  },
  PREPREADY: {
    name: 'PrepReady',
    priceMonthly: 499,
    aiQuizLimit: 35,
    allowedQuestionCounts: [5, 10, 15],
    allowedDifficulties: ['Easy', 'Moderate', 'Difficult'],
    monthlyReset: true,
    pdfExport: true,
    studyMode: true,
    stripeProductId: 'prod_UZlhovyqrKZLGx',
  },
  EXAMELITE: {
    name: 'ExamElite',
    priceMonthly: 999,
    aiQuizLimit: 68,
    allowedQuestionCounts: [5, 10, 15],
    allowedDifficulties: ['Easy', 'Moderate', 'Difficult'],
    monthlyReset: true,
    pdfExport: true,
    studyMode: true,
    stripeProductId: 'prod_UZliCwsgyIWrqs',
  },
};

export function getPlanKey(tier: string, subscriptionPlan: string | null | undefined): ParticipantPlanKey {
  if (tier === 'PAID' && subscriptionPlan === 'EXAMELITE') return 'EXAMELITE';
  if (tier === 'PAID' && subscriptionPlan === 'PREPREADY') return 'PREPREADY';
  return 'STARTER';
}
