import { Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

function buildCampaignHtml(name: string, body: string, appUrl: string): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br/>')}</p>`)
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

export async function getUsers(_req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tier: true,
      createdAt: true,
      _count: { select: { attempts: true } },
      categories: { select: { _count: { select: { quizzes: true } } } },
    },
  });

  const result = users.map(({ categories, ...u }) => ({
    ...u,
    quizCount: categories.reduce((sum, c) => sum + c._count.quizzes, 0),
  }));

  res.json(result);
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
    },
  });

  res.json({ sent, failed, total: recipients.length });
}

export async function getCampaignHistory(_req: AuthRequest, res: Response): Promise<void> {
  const history = await prisma.campaignHistory.findMany({
    orderBy: { sentAt: 'desc' },
    take: 50,
  });
  res.json(history);
}
