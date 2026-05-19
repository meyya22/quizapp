import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  createCheckoutSession,
  handleWebhook,
  verifySession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getPaymentMetrics,
} from '../controllers/payment.controller';

const router = Router();

// Webhook must use raw body — registered separately in app.ts
router.post('/webhook', handleWebhook);

// Authenticated routes
router.post('/create-checkout-session', authenticate, createCheckoutSession);
router.get('/verify-session', authenticate, verifySession);
router.get('/subscription', authenticate, getSubscription);
router.post('/cancel', authenticate, cancelSubscription);
router.post('/reactivate', authenticate, reactivateSubscription);
router.get('/invoices', authenticate, getInvoices);

// Super admin only
router.get('/metrics', authenticate, requireSuperAdmin, getPaymentMetrics);

export default router;
