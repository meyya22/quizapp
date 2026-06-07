import { Request, Response } from 'express';
import crypto from 'crypto';
import https from 'https';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

function fetchRazorpayPayment(paymentId: string): Promise<{ order_id?: string; method?: string; amount?: number; status?: string }> {
  return new Promise((resolve) => {
    const keyId = process.env.RAZORPAY_KEY_ID ?? '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const options = {
      hostname: 'api.razorpay.com',
      path: `/v1/payments/${paymentId}`,
      method: 'GET',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({}); }
      });
    });
    req.on('error', () => resolve({}));
    // 8-second timeout — resolve empty rather than hanging indefinitely
    req.setTimeout(8000, () => { req.destroy(); resolve({}); });
    req.end();
  });
}

const PAYMENT_PAGE_URL = process.env.RAZORPAY_PAYMENT_PAGE_URL || 'https://rzp.io/rzp/hPTduUUc';

// ── helpers ──────────────────────────────────────────────────────────────────

export async function completePurchase(
  userId: string,
  examCategoryId: string,
  categoryName: string,
  paymentId: string,
  orderId?: string | null,
  paymentMethod?: string | null,
  amountPaise?: number | null,
) {
  await (prisma as any).categoryPurchase.upsert({
    where: { userId_examCategoryId: { userId, examCategoryId } },
    create: { userId, examCategoryId, categoryName, paymentId, orderId, paymentMethod, amountPaise },
    update: { paymentId, orderId, paymentMethod, amountPaise, purchasedAt: new Date() },
  });

  const user = await (prisma as any).user.findUnique({ where: { id: userId }, select: { purchasedCategoryIds: true } });
  const existing: string[] = JSON.parse(user?.purchasedCategoryIds || '[]');
  if (!existing.includes(examCategoryId)) {
    await (prisma as any).user.update({
      where: { id: userId },
      data: { purchasedCategoryIds: JSON.stringify([...existing, examCategoryId]) },
    });
  }

  await (prisma as any).pendingPurchase.deleteMany({ where: { userId, examCategoryId } });

  // Mark user as PAID tier so the admin user report reflects the purchase
  await prisma.user.update({ where: { id: userId }, data: { tier: 'PAID' } });
}

// ── handlers ─────────────────────────────────────────────────────────────────

// Razorpay Payment Button POSTs here after payment.
// Converts the POST to a GET redirect so the React SPA can read the params.
export function handlePaymentCallback(req: Request, res: Response): void {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = req.body as Record<string, string>;

  const base = `${process.env.FRONTEND_URL || 'https://www.xambridge.com'}/payment/razorpay/success`;
  const params = new URLSearchParams();
  if (razorpay_payment_id)                 params.set('razorpay_payment_id', razorpay_payment_id);
  if (razorpay_payment_link_id)            params.set('razorpay_payment_link_id', razorpay_payment_link_id);
  if (razorpay_payment_link_reference_id)  params.set('razorpay_payment_link_reference_id', razorpay_payment_link_reference_id);
  if (razorpay_payment_link_status)        params.set('razorpay_payment_link_status', razorpay_payment_link_status);
  if (razorpay_signature)                  params.set('razorpay_signature', razorpay_signature);

  res.redirect(302, `${base}?${params.toString()}`);
}

// Creates a pending purchase record so the webhook can match the payment to this user+category.
// Called by the checkout page before showing the Razorpay Payment Button.
export async function createPendingRecord(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examCategoryId, categoryName } = req.body as { examCategoryId?: string; categoryName?: string };
    if (!examCategoryId) { res.status(400).json({ error: 'examCategoryId is required' }); return; }

    const userId = req.user!.id;

    const existing = await (prisma as any).categoryPurchase.findUnique({
      where: { userId_examCategoryId: { userId, examCategoryId } },
    });
    if (existing) { res.json({ ok: true, alreadyPurchased: true }); return; }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await (prisma as any).pendingPurchase.upsert({
      where: { userId_examCategoryId: { userId, examCategoryId } },
      create: { userId, examCategoryId, categoryName: categoryName ?? '', expiresAt },
      update: { expiresAt, categoryName: categoryName ?? '' },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('createPendingRecord error:', err);
    res.status(500).json({ error: 'Failed to initialise payment' });
  }
}

export async function initiatePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const { examCategoryId, categoryName } = req.body as { examCategoryId?: string; categoryName?: string };

    if (examCategoryId) {
      const existing = await (prisma as any).categoryPurchase.findUnique({
        where: { userId_examCategoryId: { userId: user.id, examCategoryId } },
      });
      if (existing) { res.status(400).json({ error: 'Already purchased this category' }); return; }

      // Store pending purchase (expires in 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await (prisma as any).pendingPurchase.upsert({
        where: { userId_examCategoryId: { userId: user.id, examCategoryId } },
        create: { userId: user.id, examCategoryId, categoryName: categoryName ?? '', expiresAt },
        update: { expiresAt, categoryName: categoryName ?? '' },
      });
    }

    // Dynamically create a Razorpay Payment Link with customer info baked in
    const keyId = process.env.RAZORPAY_KEY_ID ?? '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? '';
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.xambridge.com';

    const payload = JSON.stringify({
      amount: 29900,
      currency: 'INR',
      accept_partial: false,
      description: categoryName ? `Unlock ${categoryName} Mock Tests` : 'Xam Bridge — Unlock Mock Tests',
      customer: { name: user.name, email: user.email },
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: {
        userId: user.id,
        examCategoryId: examCategoryId ?? '',
        categoryName: categoryName ?? '',
      },
      callback_url: `${frontendUrl}/payment/razorpay/success`,
      callback_method: 'get',
      expire_by: Math.floor(Date.now() / 1000) + 3600,
    });

    const shortUrl = await new Promise<string>((resolve, reject) => {
      const options = {
        hostname: 'api.razorpay.com',
        path: '/v1/payment_links',
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };
      const apiReq = https.request(options, (apiRes) => {
        let data = '';
        apiRes.on('data', (chunk) => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.short_url) resolve(parsed.short_url);
            else reject(new Error(parsed.description || 'Failed to create payment link'));
          } catch { reject(new Error('Invalid API response')); }
        });
      });
      apiReq.on('error', reject);
      apiReq.setTimeout(10000, () => { apiReq.destroy(); reject(new Error('Request timeout')); });
      apiReq.write(payload);
      apiReq.end();
    });

    res.json({ url: shortUrl });
  } catch (err) {
    console.error('initiatePayment error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  try {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Razorpay webhook: RAZORPAY_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Webhook not configured' });
      return;
    }
    if (!signature) {
      console.error('Razorpay webhook: missing x-razorpay-signature header');
      res.status(400).json({ error: 'Missing webhook signature' });
      return;
    }
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(rawBody);
    const expected = hmac.digest('hex');
    if (expected !== signature) {
      console.error('Razorpay webhook: invalid signature');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = typeof req.body === 'string' || req.body instanceof Buffer
      ? JSON.parse(req.body.toString())
      : req.body;

    console.log('Razorpay webhook event:', event.event);

    // Handle both authorized and captured (test mode may only fire authorized)
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      const payment = event.payload?.payment?.entity;
      if (!payment) { res.json({ received: true }); return; }

      const paymentId: string = payment.id;
      const orderId: string | null = payment.order_id ?? null;
      const paymentMethod: string | null = payment.method ?? null;
      const amountPaise: number | null = payment.amount ?? null;
      const email: string = payment.email ?? '';
      const notes = payment.notes ?? {};

      console.log('Razorpay webhook payment:', { paymentId, orderId, paymentMethod, email, notes });

      let userId: string | null = notes.userId || null;
      let examCategoryId: string | null = notes.examCategoryId || null;
      let categoryName: string = notes.categoryName || '';

      // Fallback: look up user by email
      if (!userId && email) {
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
        userId = user?.id ?? null;
        console.log('Razorpay webhook email lookup:', { email, userId });
      }

      let pending: any = null;

      if (userId && examCategoryId) {
        // notes had everything — complete directly
        console.log('Razorpay webhook: completing via notes', { userId, examCategoryId });
        await completePurchase(userId, examCategoryId, categoryName, paymentId, orderId, paymentMethod, amountPaise);
      } else if (userId) {
        // Found user by email — look for their pending purchase
        pending = await (prisma as any).pendingPurchase.findFirst({
          where: { userId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        });
        console.log('Razorpay webhook pending by userId:', pending ? { examCategoryId: pending.examCategoryId } : 'NOT FOUND');
        if (pending) {
          await completePurchase(userId, pending.examCategoryId, pending.categoryName, paymentId, orderId, paymentMethod, amountPaise);
        }
      } else {
        // Email didn't match any user — fall back to most recent pending purchase
        // (safe for small platforms where payments don't happen simultaneously)
        const recentWindow = new Date(Date.now() - 30 * 60 * 1000); // last 30 min
        pending = await (prisma as any).pendingPurchase.findFirst({
          where: { expiresAt: { gt: new Date() }, createdAt: { gt: recentWindow } },
          orderBy: { createdAt: 'desc' },
        });
        console.log('Razorpay webhook fallback pending (no userId):', pending ? { userId: pending.userId, examCategoryId: pending.examCategoryId } : 'NOT FOUND');
        if (pending) {
          await completePurchase(pending.userId, pending.examCategoryId, pending.categoryName, paymentId, orderId, paymentMethod, amountPaise);
        } else {
          console.error('Razorpay webhook: no pending purchase found at all');
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Razorpay webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export async function verifyPayment(req: AuthRequest, res: Response): Promise<void> {
  const {
    razorpay_payment_id,
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_signature,
  } = req.query as Record<string, string>;

  if (!razorpay_payment_id) {
    res.status(400).json({ error: 'Missing payment ID' });
    return;
  }

  // Cached Razorpay API result — fetched at most once across both paths
  let cachedDetails: { order_id?: string; method?: string; amount?: number; status?: string } | null = null;

  // Path A: HMAC signature from Payment Link — no API call needed, signature proves validity
  if (razorpay_signature) {
    const body = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(body);
    const expected = hmac.digest('hex');
    if (expected !== razorpay_signature) {
      console.error('verifyPayment: HMAC mismatch', { body, expected, got: razorpay_signature });
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }
  } else {
    // Path B: Payment Page redirect — fetch once, cache result for reuse below
    cachedDetails = await fetchRazorpayPayment(razorpay_payment_id);
    const status = cachedDetails.status;
    console.log('verifyPayment API check:', { paymentId: razorpay_payment_id, status });
    if (status !== 'captured' && status !== 'authorized') {
      res.status(400).json({ error: `Payment not captured (status: ${status})` });
      return;
    }
  }

  const userId = req.user!.id;

  // Idempotency: already processed this payment
  const alreadyDone = await (prisma as any).categoryPurchase.findFirst({
    where: { userId, paymentId: razorpay_payment_id },
    select: { categoryName: true, examCategoryId: true },
  });
  if (alreadyDone) {
    res.json({ success: true, categoryName: alreadyDone.categoryName, examCategoryId: alreadyDone.examCategoryId });
    return;
  }

  // Find the pending purchase for this user
  const pending = await (prisma as any).pendingPurchase.findFirst({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  console.log('verifyPayment pending lookup:', { userId, found: !!pending });

  if (!pending) {
    res.status(400).json({ error: 'No pending purchase found — it may have expired' });
    return;
  }

  // Use cached result (Path B) or fetch once now (Path A) — never fetches twice
  const details = cachedDetails ?? await fetchRazorpayPayment(razorpay_payment_id);
  const orderId = details.order_id ?? null;
  const paymentMethod = details.method ?? null;
  const amountPaise = details.amount ?? 29900;

  await completePurchase(userId, pending.examCategoryId, pending.categoryName, razorpay_payment_id, orderId, paymentMethod, amountPaise);

  console.log('verifyPayment: purchase completed', { userId, examCategoryId: pending.examCategoryId });
  res.json({ success: true, categoryName: pending.categoryName, examCategoryId: pending.examCategoryId });
}

export async function checkActivationStatus(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);

  const recent = await (prisma as any).categoryPurchase.findFirst({
    where: { userId, purchasedAt: { gt: tenMinAgo } },
    orderBy: { purchasedAt: 'desc' },
    select: { examCategoryId: true, categoryName: true, purchasedAt: true },
  });

  res.json({
    activated: !!recent,
    examCategoryId: recent?.examCategoryId ?? null,
    categoryName: recent?.categoryName ?? null,
  });
}

export async function getPurchases(req: AuthRequest, res: Response): Promise<void> {
  const purchases = await (prisma as any).categoryPurchase.findMany({
    where: { userId: req.user!.id },
    orderBy: { purchasedAt: 'desc' },
    select: { id: true, examCategoryId: true, categoryName: true, paymentId: true, orderId: true, paymentMethod: true, amountPaise: true, purchasedAt: true },
  });
  res.json(purchases);
}
