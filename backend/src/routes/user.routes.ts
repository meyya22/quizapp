import { Router } from 'express';
import { getUsers, updateUser, deleteUser, sendEmailCampaign } from '../controllers/user.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getUsers);
router.put('/:id', authenticate, requireSuperAdmin, updateUser);
router.delete('/:id', authenticate, requireSuperAdmin, deleteUser);
router.post('/email-campaign', authenticate, requireSuperAdmin, sendEmailCampaign);

export default router;
