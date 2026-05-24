import { Router } from 'express';
import { getUsers, updateUser, deleteUser, sendEmailCampaign, sendParticipantEmailCampaign, getCampaignHistory, getCampaignRecipients, getParticipantAiQuizReport, getAnonymousQuizSessions } from '../controllers/user.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getUsers);
router.put('/:id', authenticate, requireSuperAdmin, updateUser);
router.delete('/:id', authenticate, requireSuperAdmin, deleteUser);
router.post('/email-campaign', authenticate, requireSuperAdmin, sendEmailCampaign);
router.post('/participant-email-campaign', authenticate, requireSuperAdmin, sendParticipantEmailCampaign);
router.get('/campaign-history', authenticate, requireSuperAdmin, getCampaignHistory);
router.get('/campaign-history/:id/recipients', authenticate, requireSuperAdmin, getCampaignRecipients);
router.get('/ai-quiz-report', authenticate, requireSuperAdmin, getParticipantAiQuizReport);
router.get('/preview-sessions', authenticate, requireSuperAdmin, getAnonymousQuizSessions);

export default router;
