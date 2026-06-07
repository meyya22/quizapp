import express, { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import {
  createCheckoutSession,
  createParticipantCheckoutSession,
  handleWebhook,
  verifySession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  getInvoices,
  getPaymentMetrics,
} from '../controllers/payment.controller';
import {
  handlePaymentCallback,
  createPendingRecord,
  initiatePayment,
  handleRazorpayWebhook,
  verifyPayment,
  checkActivationStatus,
  getPurchases,
} from '../controllers/razorpay.controller';

const router = Router();

// Stripe webhook — raw body registered in app.ts
router.post('/webhook', handleWebhook);

// Razorpay webhook — raw body registered in app.ts
router.post('/razorpay/webhook-rz', handleRazorpayWebhook);

// Razorpay Payment Button POST callback → converts to GET redirect for the React SPA
router.post('/razorpay/callback', express.urlencoded({ extended: false }), handlePaymentCallback);

// Authenticated routes
router.post('/create-checkout-session', authenticate, createCheckoutSession);
router.post('/create-participant-checkout-session', authenticate, createParticipantCheckoutSession);
router.get('/verify-session', authenticate, verifySession);
router.get('/subscription', authenticate, getSubscription);
router.post('/cancel', authenticate, cancelSubscription);
router.post('/reactivate', authenticate, reactivateSubscription);
router.get('/invoices', authenticate, getInvoices);

// Razorpay
router.post('/razorpay/create-pending', authenticate, createPendingRecord);
router.post('/razorpay/create-link', authenticate, initiatePayment);
router.get('/razorpay/verify-payment', authenticate, verifyPayment);
router.get('/razorpay/activation-status', authenticate, checkActivationStatus);
router.get('/razorpay/purchases', authenticate, getPurchases);

// Super admin only
router.get('/metrics', authenticate, requireSuperAdmin, getPaymentMetrics);

export default router;
