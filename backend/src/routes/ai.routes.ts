import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import { getAiUsage, generateQuestions } from '../controllers/ai.controller';

const router = Router();

router.get('/usage', authenticate, requireAdmin, getAiUsage);
router.post('/generate-questions', authenticate, requireAdmin, aiLimiter, generateQuestions);

export default router;
