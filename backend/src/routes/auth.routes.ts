import { Router } from 'express';
import { register, login, googleAuth, getMe, upgradeTier } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticate, getMe);
router.patch('/upgrade', authenticate, upgradeTier);

export default router;
