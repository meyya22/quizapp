import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import {
  generateAiQuiz,
  getMyAiQuizzes,
  getAiQuiz,
  submitAiQuizAttempt,
  generatePreviewQuiz,
  submitPreviewSession,
} from '../controllers/aiQuiz.controller';

const router = Router();

// Public preview — no auth, AI rate limited
router.post('/preview/generate', aiLimiter, generatePreviewQuiz);
router.post('/preview/submit', aiLimiter, submitPreviewSession);

// Authenticated routes
router.post('/generate', authenticate, generateAiQuiz);
router.get('/', authenticate, getMyAiQuizzes);
router.get('/:id', authenticate, getAiQuiz);
router.post('/:id/attempt', authenticate, submitAiQuizAttempt);

export default router;
