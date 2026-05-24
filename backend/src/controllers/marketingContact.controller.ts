import { Response } from 'express';
import nodemailer from 'nodemailer';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

function buildMarketingEmailHtml(name: string, body: string, appUrl: string): string {
  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${p.replace(/\n/g, '<br/>')}</p>`)
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
            <span style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">&#10024; XamGeni by Xam Bridge</span>
            <p style="margin:6px 0 0;color:#ddd6fe;font-size:13px;">AI-powered quiz prep for every learner</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            ${paragraphs}
            <table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
              <tr>
                <td style="background:#7c3aed;border-radius:10px;padding:12px 28px;">
                  <a href="${appUrl}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Try XamGeni Free &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              &copy; ${new Date().getFullYear()} Xam Bridge &middot; You are receiving this as part of an educational outreach programme.
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

const PAGE_SIZE = 25;

export async function getContacts(req: AuthRequest, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const search = (req.query.search as string || '').trim();
  const location = (req.query.location as string || '').trim();

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(location && { location: { contains: location, mode: 'insensitive' as const } }),
  };

  const [contacts, total] = await Promise.all([
    prisma.marketingContact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.marketingContact.count({ where }),
  ]);

  res.json({ contacts, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
}

export async function addContact(req: AuthRequest, res: Response): Promise<void> {
  const { name, email, location } = req.body as { name: string; email: string; location?: string };

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required.' }); return;
  }

  const contact = await prisma.marketingContact.upsert({
    where: { email: email.trim().toLowerCase() },
    update: {
      name: name?.trim() || email.split('@')[0],
      location: location?.trim() || null,
    },
    create: {
      name: name?.trim() || email.split('@')[0],
      email: email.trim().toLowerCase(),
      location: location?.trim() || null,
      source: 'manual',
    },
  });

  res.status(201).json({ contact });
}

export async function bulkAddContacts(req: AuthRequest, res: Response): Promise<void> {
  const { contacts } = req.body as {
    contacts: { name: string; email: string; location?: string }[];
  };

  if (!Array.isArray(contacts) || contacts.length === 0) {
    res.status(400).json({ error: 'contacts array is required.' }); return;
  }

  let added = 0;
  let skipped = 0;

  for (const c of contacts.slice(0, 500)) {
    const email = c.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) { skipped++; continue; }
    try {
      await prisma.marketingContact.upsert({
        where: { email },
        update: { name: c.name?.trim() || email.split('@')[0], location: c.location?.trim() || null },
        create: {
          name: c.name?.trim() || email.split('@')[0],
          email,
          location: c.location?.trim() || null,
          source: 'csv',
        },
      });
      added++;
    } catch {
      skipped++;
    }
  }

  res.json({ added, skipped });
}

export async function deleteContacts(req: AuthRequest, res: Response): Promise<void> {
  const { ids } = req.body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required.' }); return;
  }

  const { count } = await prisma.marketingContact.deleteMany({
    where: { id: { in: ids } },
  });

  res.json({ deleted: count });
}

export async function sendMarketingCampaign(req: AuthRequest, res: Response): Promise<void> {
  const { contactIds, subject, body, templateName } = req.body as {
    contactIds: string[];
    subject: string;
    body: string;
    templateName: string;
  };

  if (!Array.isArray(contactIds) || !contactIds.length || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'contactIds, subject, and body are required.' }); return;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    res.status(503).json({ error: 'Email service not configured.' }); return;
  }

  const contacts = await prisma.marketingContact.findMany({
    where: { id: { in: contactIds } },
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

  for (const c of contacts) {
    const personalizedSubject = subject.replace(/\{name\}/g, c.name);
    const personalizedBody = body.replace(/\{name\}/g, c.name);
    try {
      await transporter.sendMail({
        from: SMTP_FROM || SMTP_USER,
        to: c.email,
        subject: personalizedSubject,
        html: buildMarketingEmailHtml(c.name, personalizedBody, appUrl),
      });
      sent++;
      sentRecipients.push({ name: c.name, email: c.email });
    } catch {
      failed++;
    }
  }

  await prisma.campaignHistory.create({
    data: {
      type: 'MARKETING',
      templateName: templateName || 'Custom',
      subject,
      sent,
      failed,
      recipients: {
        create: sentRecipients.map((c) => ({ name: c.name, email: c.email })),
      },
    },
  });

  res.json({ sent, failed, total: contacts.length });
}

export async function getMarketingCampaignHistory(_req: AuthRequest, res: Response): Promise<void> {
  const history = await prisma.campaignHistory.findMany({
    where: { type: 'MARKETING' },
    orderBy: { sentAt: 'desc' },
    take: 50,
  });
  res.json(history);
}
