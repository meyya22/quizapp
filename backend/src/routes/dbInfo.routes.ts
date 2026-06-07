import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { getDbInfo } from '../controllers/dbInfo.controller';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getDbInfo);

export default router;
