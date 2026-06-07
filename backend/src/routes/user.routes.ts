import { Router } from 'express';
import { getUsers, updateUser, deleteUser, resetAiUsage, setComplimentaryQuiz, sendEmailCampaign, sendParticipantEmailCampaign, getCampaignHistory, getCampaignRecipients, getParticipantAiQuizReport, getAnonymousQuizSessions, getAnonymousAttempts, getAnonymousAttemptsStats, deleteAnonymousAttempts, grantCategories, revokeCategory } from '../controllers/user.controller';
import { authenticate, requireSuperAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getUsers);
router.patch('/me/complimentary-quiz', authenticate, setComplimentaryQuiz);
router.put('/:id', authenticate, requireSuperAdmin, updateUser);
router.get('/campaign-history', authenticate, requireSuperAdmin, getCampaignHistory);
router.get('/campaign-history/:id/recipients', authenticate, requireSuperAdmin, getCampaignRecipients);
router.get('/ai-quiz-report', authenticate, requireSuperAdmin, getParticipantAiQuizReport);
router.get('/preview-sessions', authenticate, requireSuperAdmin, getAnonymousQuizSessions);
router.get('/anonymous-attempts/stats', authenticate, requireSuperAdmin, getAnonymousAttemptsStats);
router.get('/anonymous-attempts', authenticate, requireSuperAdmin, getAnonymousAttempts);
router.delete('/anonymous-attempts', authenticate, requireSuperAdmin, deleteAnonymousAttempts);
router.delete('/:id', authenticate, requireSuperAdmin, deleteUser);
router.post('/:id/reset-ai-usage', authenticate, requireSuperAdmin, resetAiUsage);
router.post('/:id/grant-categories', authenticate, requireSuperAdmin, grantCategories);
router.post('/:id/revoke-category', authenticate, requireSuperAdmin, revokeCategory);
router.post('/email-campaign', authenticate, requireSuperAdmin, sendEmailCampaign);
router.post('/participant-email-campaign', authenticate, requireSuperAdmin, sendParticipantEmailCampaign);

export default router;
