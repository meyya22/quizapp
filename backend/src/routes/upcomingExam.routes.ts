import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  getPublicExams,
  getAllExams,
  createExam,
  updateExam,
  deleteExam,
} from '../controllers/upcomingExam.controller';

const router = Router();

// Public — landing page
router.get('/public', getPublicExams);

// Super-admin only
router.get('/', authenticate, requireSuperAdmin, getAllExams);
router.post('/', authenticate, requireSuperAdmin, createExam);
router.put('/:id', authenticate, requireSuperAdmin, updateExam);
router.delete('/:id', authenticate, requireSuperAdmin, deleteExam);

export default router;
