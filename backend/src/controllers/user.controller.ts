import { Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { completePurchase } from './razorpay.controller';

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function buildCampaignHtml(name: string, body: string, appUrl: string): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">&#128218; Xam Bridge</span>
            <p style="margin:6px 0 0;color:#bfdbfe;font-size:13px;">The smart quiz platform for educators &amp; trainers</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${paragraphs}
            <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr>
                <td style="background:#2563eb;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}/subscribe" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Upgrade to Pro &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &middot; You are receiving this because you signed up for a free account.
              &middot; <a href="${appUrl}" style="color:#94a3b8;">xambridge.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await (prisma as any).user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tier: true,
      country: true,
      city: true,
      createdAt: true,
      googleId: true,
      complimentaryQuizId: true,
      aiGenerationsUsed: true,
      aiGenerationsResetAt: true,
      _count: { select: { attempts: true, aiQuizzes: true, categoryPurchases: true } },
      categories: { select: { _count: { select: { quizzes: true } } } },
      categoryPurchases: { select: { examCategoryId: true, categoryName: true } },
    },
  });

  const quizIds = [...new Set((users as any[]).map((u: any) => u.complimentaryQuizId).filter(Boolean))];
  const quizTitleMap: Record<string, string> = {};
  if (quizIds.length > 0) {
    const quizzes = await prisma.quiz.findMany({
      where: { id: { in: quizIds as string[] } },
      select: { id: true, title: true },
    });
    quizzes.forEach((q) => { quizTitleMap[q.id] = q.title; });
  }

  const monthStart = getMonthStart();
  const result = users.map(({ categories, _count, aiGenerationsUsed, aiGenerationsResetAt, categoryPurchases, ...u }: any) => ({
    ...u,
    complimentaryQuizTitle: u.complimentaryQuizId ? (quizTitleMap[u.complimentaryQuizId] ?? null) : null,
    _count: { attempts: _count.attempts },
    purchaseCount: _count.categoryPurchases,
    quizCount: categories.reduce((sum: number, c: any) => sum + c._count.quizzes, 0),
    aiQuizCount: _count.aiQuizzes,
    aiGenerationsUsed: aiGenerationsResetAt < monthStart ? 0 : aiGenerationsUsed,
    grantedCategories: (categoryPurchases as { examCategoryId: string; categoryName: string }[]).map((p) => ({
      id: p.examCategoryId,
      name: p.categoryName,
    })),
  }));

  res.json(result);
}

export async function resetAiUsage(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  await prisma.user.update({
    where: { id },
    data: { aiGenerationsUsed: 0, aiGenerationsResetAt: new Date() },
  });
  res.json({ success: true });
}

export async function setComplimentaryQuiz(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { quizId } = req.body;
  if (!quizId) { res.status(400).json({ error: 'quizId is required' }); return; }

  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { id: true } });
  if (!quiz) { res.status(404).json({ error: 'Quiz not found' }); return; }

  const user = await (prisma as any).user.findUnique({ where: { id: userId }, select: { complimentaryQuizId: true } });

  if (!user?.complimentaryQuizId) {
    await (prisma as any).user.update({ where: { id: userId }, data: { complimentaryQuizId: quizId } });
  }

  res.json({ complimentaryQuizId: user?.complimentaryQuizId ?? quizId });
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, role, tier } = req.body as { name?: string; role?: string; tier?: string };

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(tier !== undefined && { tier }),
    },
    select: {
      id: true, name: true, email: true, role: true, tier: true, createdAt: true,
      _count: { select: { attempts: true } },
      categories: { select: { _count: { select: { quizzes: true } } } },
    },
  });

  const { categories, ...rest } = updated;
  res.json({ ...rest, quizCount: categories.reduce((sum, c) => sum + c._count.quizzes, 0) });
}

export async function deleteUser(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (existing.role === 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Cannot delete super admin' });
    return;
  }

  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}

export async function sendEmailCampaign(req: AuthRequest, res: Response): Promise<void> {
  const { recipientIds, subject, body, templateName } = req.body as {
    recipientIds: string[];
    subject: string;
    body: string;
    templateName: string;
  };

  if (!Array.isArray(recipientIds) || !recipientIds.length || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'recipientIds, subject, and body are required' });
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const recipients = await prisma.user.findMany({
    where: { id: { in: recipientIds }, role: 'ADMIN', tier: 'FREE' },
    select: { id: true, name: true, email: true },
  });

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const appUrl = FRONTEND_URL || 'https://www.xambridge.com';
  let sent = 0;
  let failed = 0;
  const sentRecipients: { name: string; email: string }[] = [];

  for (const user of recipients) {
    const personalizedSubject = subject.replace(/\{name\}/g, user.name);
    const personalizedBody = body.replace(/\{name\}/g, user.name);
    try {
      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: user.email,
        subject: personalizedSubject,
        html: buildCampaignHtml(user.name, personalizedBody, appUrl),
      });
      sent++;
      sentRecipients.push({ name: user.name, email: user.email });
    } catch {
      failed++;
    }
  }

  await prisma.campaignHistory.create({
    data: {
      templateName: templateName || 'Custom',
      subject,
      sent,
      failed,
      recipients: {
        create: sentRecipients.map((u) => ({ name: u.name, email: u.email })),
      },
    },
  });

  res.json({ sent, failed, total: recipients.length });
}

function buildParticipantCampaignHtml(name: string, body: string, appUrl: string): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">&#128218; Practice smarter, score higher</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${paragraphs}
            <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr>
                <td style="background:#7c3aed;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Visit XamBridge &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &middot; You are receiving this because you registered as a learner.
              &middot; <a href="${appUrl}" style="color:#94a3b8;">xambridge.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendParticipantEmailCampaign(req: AuthRequest, res: Response): Promise<void> {
  const { recipientIds, subject, body, templateName } = req.body as {
    recipientIds: string[];
    subject: string;
    body: string;
    templateName: string;
  };

  if (!Array.isArray(recipientIds) || !recipientIds.length || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'recipientIds, subject, and body are required' });
    return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const recipients = await prisma.user.findMany({
    where: { id: { in: recipientIds }, role: 'PARTICIPANT' },
    select: { id: true, name: true, email: true },
  });

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  const appUrl = FRONTEND_URL || 'https://www.xambridge.com';
  let sent = 0;
  let failed = 0;
  const sentRecipients: { name: string; email: string }[] = [];

  for (const user of recipients) {
    const personalizedSubject = subject.replace(/\{name\}/g, user.name);
    const personalizedBody = body.replace(/\{name\}/g, user.name);
    try {
      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: user.email,
        subject: personalizedSubject,
        html: buildParticipantCampaignHtml(user.name, personalizedBody, appUrl),
      });
      sent++;
      sentRecipients.push({ name: user.name, email: user.email });
    } catch {
      failed++;
    }
  }

  await prisma.campaignHistory.create({
    data: {
      templateName: templateName || 'Custom',
      subject,
      sent,
      failed,
      type: 'LEARNER',
      recipients: {
        create: sentRecipients.map((u) => ({ name: u.name, email: u.email })),
      },
    },
  });

  res.json({ sent, failed, total: recipients.length });
}

export async function getParticipantAiQuizReport(_req: AuthRequest, res: Response): Promise<void> {
  const quizzes = await prisma.aiQuiz.findMany({
    where: { user: { role: 'PARTICIPANT' } },
    select: {
      id: true,
      topic: true,
      difficulty: true,
      numQuestions: true,
      questions: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(quizzes);
}

export async function getCampaignHistory(_req: AuthRequest, res: Response): Promise<void> {
  const history = await prisma.campaignHistory.findMany({
    orderBy: { sentAt: 'desc' },
    take: 50,
  });
  res.json(history);
}

export async function getCampaignRecipients(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const campaign = await prisma.campaignHistory.findUnique({
    where: { id },
    include: { recipients: { orderBy: { name: 'asc' } } },
  });
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }
  res.json(campaign.recipients);
}

export async function getAnonymousQuizSessions(_req: AuthRequest, res: Response): Promise<void> {
  const sessions = await prisma.previewSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json({ sessions });
}

export async function getAnonymousAttempts(req: AuthRequest, res: Response): Promise<void> {
  const { page: pageStr, pageSize: pageSizeStr } = req.query as { page?: string; pageSize?: string };
  const validSizes = [10, 25, 50];
  const pageSize = validSizes.includes(parseInt(pageSizeStr || '')) ? parseInt(pageSizeStr!) : 10;
  const page = Math.max(1, parseInt(pageStr || '1'));

  const [total, attempts] = await Promise.all([
    (prisma as any).anonymousAttempt.count(),
    (prisma as any).anonymousAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  res.json({ attempts, total, page, pages: Math.ceil(total / pageSize) || 1, pageSize });
}

export async function getAnonymousAttemptsStats(_req: AuthRequest, res: Response): Promise<void> {
  const groups = await (prisma as any).anonymousAttempt.groupBy({
    by: ['examSubCategory'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
    where: { examSubCategory: { not: null } },
  });

  const stats = await Promise.all(
    groups.map(async (g: any) => {
      // Find the most common examCategory for this subject
      const catGroups = await (prisma as any).anonymousAttempt.groupBy({
        by: ['examCategory'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
        where: { examSubCategory: g.examSubCategory, examCategory: { not: null } },
      });

      let category: string = catGroups[0]?.examCategory;

      if (!category) {
        const adminCatGroups = await (prisma as any).anonymousAttempt.groupBy({
          by: ['adminCategory'],
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
          where: { examSubCategory: g.examSubCategory, adminCategory: { not: null } },
        });
        category = adminCatGroups[0]?.adminCategory ?? 'Unknown';
      }

      return {
        subject: g.examSubCategory as string,
        category,
        count: g._count.id as number,
      };
    })
  );

  res.json({ stats });
}

export async function deleteAnonymousAttempts(req: AuthRequest, res: Response): Promise<void> {
  const { ids } = req.body as { ids?: string[] };
  if (ids && ids.length > 0) {
    await (prisma as any).anonymousAttempt.deleteMany({ where: { id: { in: ids } } });
  } else {
    await (prisma as any).anonymousAttempt.deleteMany();
  }
  res.json({ success: true });
}

export async function grantCategories(req: AuthRequest, res: Response): Promise<void> {
  const { id: userId } = req.params;
  const { categories } = req.body as { categories: { id: string; name: string }[] };

  if (!Array.isArray(categories) || categories.length === 0) {
    res.status(400).json({ error: 'categories array is required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  for (const cat of categories) {
    await completePurchase(userId, cat.id, cat.name, 'manual', null, 'manual', null);
  }

  res.json({ success: true, granted: categories.length });
}

export async function revokeCategory(req: AuthRequest, res: Response): Promise<void> {
  const { id: userId } = req.params;
  const { categoryId } = req.body as { categoryId: string };

  if (!categoryId) { res.status(400).json({ error: 'categoryId is required' }); return; }

  await (prisma as any).categoryPurchase.deleteMany({ where: { userId, examCategoryId: categoryId } });

  const user = await (prisma as any).user.findUnique({ where: { id: userId }, select: { purchasedCategoryIds: true } });
  const existing: string[] = JSON.parse(user?.purchasedCategoryIds || '[]');
  await (prisma as any).user.update({
    where: { id: userId },
    data: { purchasedCategoryIds: JSON.stringify(existing.filter((id: string) => id !== categoryId)) },
  });

  const remaining = await (prisma as any).categoryPurchase.count({ where: { userId } });
  if (remaining === 0) {
    await prisma.user.update({ where: { id: userId }, data: { tier: 'FREE' } });
  }

  res.json({ success: true });
}
