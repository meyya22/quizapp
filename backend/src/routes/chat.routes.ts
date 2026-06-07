import { Router } from 'express';
import { chat } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, chat);

export default router;
