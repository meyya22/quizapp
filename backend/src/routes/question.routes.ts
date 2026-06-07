import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  bulkDeleteQuestions,
  importQuestions,
  downloadSampleCsv,
} from '../controllers/question.controller';
import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth';

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

const router = Router({ mergeParams: true });

router.get('/sample-csv', authenticate, requireAdmin, downloadSampleCsv);
router.get('/', optionalAuthenticate, getQuestions);
router.post('/', authenticate, requireAdmin, createQuestion);
router.put('/:id', authenticate, requireAdmin, updateQuestion);
router.delete('/', authenticate, requireAdmin, bulkDeleteQuestions);
router.delete('/:id', authenticate, requireAdmin, deleteQuestion);
router.post('/import', authenticate, requireAdmin, upload.single('file'), importQuestions);

export default router;
