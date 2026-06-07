import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  getPublicExamContent,
  getAllCategories,
  createCategory, updateCategory, deleteCategory,
  createSubCategory, updateSubCategory, deleteSubCategory,
  createExamQuiz, updateExamQuiz, deleteExamQuiz,
} from '../controllers/examContent.controller';

const router = Router();

// Public
router.get('/public', getPublicExamContent);

// Superadmin
router.get('/', authenticate, requireSuperAdmin, getAllCategories);
router.post('/categories', authenticate, requireSuperAdmin, createCategory);
router.put('/categories/:id', authenticate, requireSuperAdmin, updateCategory);
router.delete('/categories/:id', authenticate, requireSuperAdmin, deleteCategory);

router.post('/sub-categories', authenticate, requireSuperAdmin, createSubCategory);
router.put('/sub-categories/:id', authenticate, requireSuperAdmin, updateSubCategory);
router.delete('/sub-categories/:id', authenticate, requireSuperAdmin, deleteSubCategory);

router.post('/quizzes', authenticate, requireSuperAdmin, createExamQuiz);
router.put('/quizzes/:id', authenticate, requireSuperAdmin, updateExamQuiz);
router.delete('/quizzes/:id', authenticate, requireSuperAdmin, deleteExamQuiz);

export default router;
