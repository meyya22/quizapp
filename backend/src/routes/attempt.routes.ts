import { Router } from 'express';
import {
  submitAttempt,
  getAttempt,
  getMyAttempts,
  getAllAttempts,
  getAttemptsSummary,
} from '../controllers/attempt.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuthenticate, submitAttempt);
router.get('/my', authenticate, getMyAttempts);
router.get('/all', authenticate, requireAdmin, getAllAttempts);
router.get('/summary', authenticate, requireAdmin, getAttemptsSummary);
router.get('/:id', optionalAuthenticate, getAttempt);

export default router;
