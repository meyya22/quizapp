import { Request, Response } from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { sendSubscriptionConfirmationEmail } from '../services/email.service';
import { PARTICIPANT_PLANS } from '../config/participantPlans';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' } as any);

const PLANS = {
  MONTHLY: { product: process.env.STRIPE_MONTHLY_PRODUCT_ID!, unit_amount: 500, interval: 'month' as const },
  YEARLY:  { product: process.env.STRIPE_YEARLY_PRODUCT_ID!,  unit_amount: 5000, interval: 'year'  as const },
};

function periodEndFromSub(sub: { items: { data: Array<{ current_period_end: number }> }; cancel_at?: number | null }): Date {
  const fromItem = sub.items.data[0]?.current_period_end;
  if (fromItem) return new Date(fromItem * 1000);
  if (sub.cancel_at) return new Date(sub.cancel_at * 1000);
  return new Date();
}

export async function createCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
  const { plan } = req.body as { plan: 'MONTHLY' | 'YEARLY' };
  if (!plan || !PLANS[plan]) {
    res.status(400).json({ error: 'plan must be MONTHLY or YEARLY' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const p = PLANS[plan];
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        product: p.product,
        unit_amount: p.unit_amount,
        recurring: { interval: p.interval },
      },
    }],
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
  });

  res.json({ url: session.url });
}

export async function createParticipantCheckoutSession(req: AuthRequest, res: Response): Promise<void> {
  const { plan } = req.body as { plan: 'PREPREADY' | 'EXAMELITE' };
  if (!['PREPREADY', 'EXAMELITE'].includes(plan)) {
    res.status(400).json({ error: 'plan must be PREPREADY or EXAMELITE' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  if (user.tier === 'PAID') {
    res.status(400).json({ error: 'You already have an active subscription.' });
    return;
  }

  const planConfig = PARTICIPANT_PLANS[plan];
  if (!planConfig.stripeProductId) {
    res.status(503).json({ error: 'Plan not configured.' });
    return;
  }

  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        product: planConfig.stripeProductId,
        unit_amount: planConfig.priceMonthly,
        recurring: { interval: 'month' },
      },
    }],
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/participant`,
    metadata: { userId: user.id, plan },
    subscription_data: { metadata: { userId: user.id, plan } },
  });

  res.json({ url: session.url });
}

export async function handleWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { type: string; data: { object: any } };
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret) as typeof event;
    } else {
      event = JSON.parse((req.body as Buffer).toString()) as typeof event;
    }
  } catch (err) {
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  try {
    const obj = event.data.object;
    switch (event.type) {
      case 'checkout.session.completed': {
        if (obj.mode === 'subscription' && obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription as string);
          const plan = (obj.metadata?.plan ?? 'MONTHLY') as string;
          const periodEnd = periodEndFromSub(sub);
          const updatedUsers = await prisma.user.findMany({
            where: { stripeCustomerId: obj.customer as string },
            select: { email: true, name: true },
          });
          await prisma.user.updateMany({
            where: { stripeCustomerId: obj.customer as string },
            data: {
              tier: 'PAID',
              stripeSubscriptionId: sub.id,
              subscriptionStatus: sub.status,
              subscriptionPlan: plan,
              subscriptionCurrentPeriodEnd: periodEnd,
            },
          });
          for (const u of updatedUsers) {
            sendSubscriptionConfirmationEmail(u.email, u.name, plan, periodEnd);
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const isActive = obj.status === 'active' || obj.status === 'trialing';
        await prisma.user.updateMany({
          where: { stripeCustomerId: obj.customer as string },
          data: {
            tier: isActive ? 'PAID' : 'FREE',
            subscriptionStatus: obj.status as string,
            subscriptionCurrentPeriodEnd: periodEndFromSub(obj),
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        await prisma.user.updateMany({
          where: { stripeCustomerId: obj.customer as string },
          data: {
            tier: 'FREE',
            stripeSubscriptionId: null,
            subscriptionStatus: 'canceled',
            subscriptionPlan: null,
            subscriptionCurrentPeriodEnd: null,
          },
        });
        break;
      }
      case 'invoice.payment_failed': {
        await prisma.user.updateMany({
          where: { stripeCustomerId: obj.customer as string },
          data: { subscriptionStatus: 'past_due' },
        });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
}

export async function verifySession(req: AuthRequest, res: Response): Promise<void> {
  const { session_id } = req.query as { session_id: string };
  if (!session_id) { res.status(400).json({ error: 'session_id required' }); return; }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['subscription'],
  });

  if (session.payment_status !== 'paid' || !session.subscription) {
    res.status(400).json({ error: 'Payment not completed' });
    return;
  }

  const sub = session.subscription as { id: string; status: string; items: { data: Array<{ current_period_end: number }> }; cancel_at?: number | null };
  const plan = (session.metadata?.plan ?? 'MONTHLY') as string;

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      tier: 'PAID',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionPlan: plan,
      subscriptionCurrentPeriodEnd: periodEndFromSub(sub),
    },
  });

  const token = jwt.sign(
    { id: updatedUser.id, role: updatedUser.role, tier: updatedUser.tier },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as Parameters<typeof jwt.sign>[2] extends { expiresIn?: infer T } ? T : never },
  );

  res.json({
    user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, tier: updatedUser.tier },
    token,
  });
}

export async function getSubscription(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.stripeSubscriptionId) { res.json(null); return; }

  try {
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
      expand: ['default_payment_method'],
    });

    const pm = sub.default_payment_method as { card?: { brand: string; last4: string } } | null;
    res.json({
      id: sub.id,
      status: sub.status,
      plan: user.subscriptionPlan,
      currentPeriodEnd: periodEndFromSub(sub).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      paymentMethod: pm?.card ? { brand: pm.card.brand, last4: pm.card.last4 } : null,
    });
  } catch {
    res.json(null);
  }
}

export async function cancelSubscription(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.stripeSubscriptionId) {
    res.status(404).json({ error: 'No active subscription found' });
    return;
  }

  const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: sub.status } });

  res.json({
    cancelAtPeriodEnd: true,
    currentPeriodEnd: periodEndFromSub(sub).toISOString(),
  });
}

export async function reactivateSubscription(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.stripeSubscriptionId) {
    res.status(404).json({ error: 'No subscription found' });
    return;
  }

  const sub = await stripe.subscriptions.update(user.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  res.json({
    cancelAtPeriodEnd: false,
    currentPeriodEnd: periodEndFromSub(sub).toISOString(),
  });
}

export async function getInvoices(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.stripeCustomerId) { res.json([]); return; }

  const invoices = await stripe.invoices.list({ customer: user.stripeCustomerId, limit: 24 });

  res.json(
    invoices.data.map((inv) => ({
      id: inv.id,
      amountPaid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status,
      date: new Date(inv.created * 1000).toISOString(),
      periodStart: new Date(inv.period_start * 1000).toISOString(),
      periodEnd: new Date(inv.period_end * 1000).toISOString(),
      invoiceUrl: inv.hosted_invoice_url,
      pdfUrl: inv.invoice_pdf,
      description: inv.lines.data[0]?.description ?? null,
    })),
  );
}

export async function getPaymentMetrics(_req: AuthRequest, res: Response): Promise<void> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const startOfMonthTs = Math.floor(startOfMonth.getTime() / 1000);

  const [
    totalPaid, monthlyPlan, yearlyPlan, allInvoices, monthInvoices,
    rzTotalCount, rzMonthCount, rzAllPurchases, rzMonthPurchases,
  ] = await Promise.all([
    prisma.user.count({ where: { tier: 'PAID' } }),
    prisma.user.count({ where: { tier: 'PAID', subscriptionPlan: 'MONTHLY' } }),
    prisma.user.count({ where: { tier: 'PAID', subscriptionPlan: 'YEARLY' } }),
    stripe.invoices.list({ status: 'paid', limit: 100 }),
    stripe.invoices.list({ status: 'paid', created: { gte: startOfMonthTs }, limit: 100 }),
    (prisma as any).categoryPurchase.count(),
    (prisma as any).categoryPurchase.count({ where: { purchasedAt: { gte: startOfMonth } } }),
    (prisma as any).categoryPurchase.findMany({
      orderBy: { purchasedAt: 'desc' },
      take: 20,
      select: {
        id: true, categoryName: true, paymentId: true, orderId: true,
        paymentMethod: true, amountPaise: true, purchasedAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
    (prisma as any).categoryPurchase.findMany({
      where: { purchasedAt: { gte: startOfMonth } },
      select: { amountPaise: true },
    }),
  ]);

  const totalRevenue = allInvoices.data.reduce((sum: number, inv: any) => sum + inv.amount_paid, 0);
  const monthRevenue = monthInvoices.data.reduce((sum: number, inv: any) => sum + inv.amount_paid, 0);
  const mrr = monthlyPlan * 500 + Math.round((yearlyPlan * 5000) / 12);

  const recentTransactions = allInvoices.data.slice(0, 15).map((inv: any) => ({
    id: inv.id,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    date: new Date(inv.created * 1000).toISOString(),
    customerEmail: inv.customer_email,
    description: inv.lines.data[0]?.description ?? null,
    invoiceUrl: inv.hosted_invoice_url,
  }));

  const rzTotalRevenuePaise = rzAllPurchases.reduce((sum: number, p: any) => sum + (p.amountPaise ?? 29900), 0);
  const rzMonthRevenuePaise = rzMonthPurchases.reduce((sum: number, p: any) => sum + (p.amountPaise ?? 29900), 0);

  res.json({
    totalPaid,
    monthlyPlan,
    yearlyPlan,
    totalRevenue,
    monthRevenue,
    mrr,
    recentTransactions,
    razorpay: {
      totalPurchases: rzTotalCount,
      monthPurchases: rzMonthCount,
      totalRevenueINR: Math.round(rzTotalRevenuePaise / 100),
      monthRevenueINR: Math.round(rzMonthRevenuePaise / 100),
      recentTransactions: rzAllPurchases.map((p: any) => ({
        id: p.id,
        categoryName: p.categoryName,
        customerEmail: p.user?.email ?? null,
        customerName: p.user?.name ?? null,
        paymentId: p.paymentId ?? null,
        orderId: p.orderId ?? null,
        paymentMethod: p.paymentMethod ?? null,
        amountPaise: p.amountPaise ?? 29900,
        purchasedAt: p.purchasedAt.toISOString(),
      })),
    },
  });
}
