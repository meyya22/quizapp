import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { getContacts, addContact, deleteContact, bulkDeleteContacts, importContacts, broadcastQuiz, getEmailHistory } from '../controllers/contact.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.get('/', authenticate, getContacts);
router.post('/', authenticate, addContact);
router.delete('/:id', authenticate, deleteContact);
router.post('/bulk-delete', authenticate, bulkDeleteContacts);
router.post('/import', authenticate, upload.single('file'), importContacts);
router.post('/broadcast', authenticate, broadcastQuiz);
router.get('/email-history', authenticate, getEmailHistory);

export default router;
