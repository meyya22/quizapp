import { Router } from 'express';
import { sendEnquiry } from '../controllers/support.controller';
import { supportLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/enquiry', supportLimiter, sendEnquiry);

export default router;
