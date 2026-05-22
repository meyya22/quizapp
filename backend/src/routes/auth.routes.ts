import { Router } from 'express';
import { register, login, googleAuth, microsoftAuth, getMe, upgradeTier } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/microsoft', authLimiter, microsoftAuth);
router.get('/me', authenticate, getMe);
router.patch('/upgrade', authenticate, upgradeTier);

export default router;
