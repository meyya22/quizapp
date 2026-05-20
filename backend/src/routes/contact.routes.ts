import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { getContacts, addContact, deleteContact, importContacts, broadcastQuiz } from '../controllers/contact.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.get('/', authenticate, getContacts);
router.post('/', authenticate, addContact);
router.delete('/:id', authenticate, deleteContact);
router.post('/import', authenticate, upload.single('file'), importContacts);
router.post('/broadcast', authenticate, broadcastQuiz);

export default router;
