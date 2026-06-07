import { Router } from 'express';
import {
  submitAttempt,
  getAttempt,
  getMyAttempts,
  getAllAttempts,
  getAttemptsSummary,
  logAnonymousPreview,
} from '../controllers/attempt.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuthenticate, submitAttempt);
router.post('/anonymous-preview', logAnonymousPreview);
router.get('/my', authenticate, getMyAttempts);
router.get('/all', authenticate, requireAdmin, getAllAttempts);
router.get('/summary', authenticate, requireAdmin, getAttemptsSummary);
router.get('/:id', optionalAuthenticate, getAttempt);

export default router;
