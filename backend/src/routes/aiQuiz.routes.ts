import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  generateAiQuiz,
  getMyAiQuizzes,
  getAiQuiz,
  submitAiQuizAttempt,
} from '../controllers/aiQuiz.controller';

const router = Router();

router.post('/generate', authenticate, generateAiQuiz);
router.get('/', authenticate, getMyAiQuizzes);
router.get('/:id', authenticate, getAiQuiz);
router.post('/:id/attempt', authenticate, submitAiQuizAttempt);

export default router;
