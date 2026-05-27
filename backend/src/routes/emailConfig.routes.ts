import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { getEmailConfig, updateEmailConfig, testEmailConfig } from '../controllers/emailConfig.controller';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getEmailConfig);
router.put('/', authenticate, requireSuperAdmin, updateEmailConfig);
router.post('/test', authenticate, requireSuperAdmin, testEmailConfig);

export default router;
