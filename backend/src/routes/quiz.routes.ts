import { Router } from 'express';
import {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  togglePublish,
  toggleVisibility,
  getAdminStats,
} from '../controllers/quiz.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, requireAdmin, getAdminStats);
router.get('/', optionalAuthenticate, getQuizzes);
router.get('/:id', optionalAuthenticate, getQuiz);
router.post('/', authenticate, requireAdmin, createQuiz);
router.put('/:id', authenticate, requireAdmin, updateQuiz);
router.patch('/:id/publish', authenticate, requireAdmin, togglePublish);
router.patch('/:id/visibility', authenticate, requireAdmin, toggleVisibility);
router.delete('/:id', authenticate, requireAdmin, deleteQuiz);

export default router;
