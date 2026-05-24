import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  getContacts,
  addContact,
  bulkAddContacts,
  deleteContacts,
  sendMarketingCampaign,
  getMarketingCampaignHistory,
} from '../controllers/marketingContact.controller';

const router = Router();

router.get('/', authenticate, requireSuperAdmin, getContacts);
router.post('/', authenticate, requireSuperAdmin, addContact);
router.post('/bulk', authenticate, requireSuperAdmin, bulkAddContacts);
router.delete('/', authenticate, requireSuperAdmin, deleteContacts);
router.post('/campaign', authenticate, requireSuperAdmin, sendMarketingCampaign);
router.get('/campaign-history', authenticate, requireSuperAdmin, getMarketingCampaignHistory);

export default router;
