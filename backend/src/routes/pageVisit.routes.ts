import { Router } from 'express';
import { recordVisit, getVisitCount } from '../controllers/pageVisit.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.post('/', recordVisit);
router.get('/count', authenticate, requireSuperAdmin, getVisitCount);

export default router;
