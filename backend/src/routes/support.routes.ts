import { Router } from 'express';
import { sendEnquiry } from '../controllers/support.controller';

const router = Router();

router.post('/enquiry', sendEnquiry);

export default router;
