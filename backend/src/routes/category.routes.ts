import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getCategories);
router.post('/', authenticate, requireAdmin, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
