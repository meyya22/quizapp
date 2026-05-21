import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import nodemailer from 'nodemailer';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function stripNewlines(str: string): string {
  return str.replace(/[\r\n]/g, '');
}

const FREE_CONTACT_LIMIT = 10;
const PAID_CONTACT_LIMIT = 500;
const FREE_EMAIL_LIMIT = 50;
const PAID_EMAIL_LIMIT = 500;

function getContactLimit(tier: string) {
  return tier === 'PAID' ? PAID_CONTACT_LIMIT : FREE_CONTACT_LIMIT;
}

function getEmailLimit(tier: string) {
  return tier === 'PAID' ? PAID_EMAIL_LIMIT : FREE_EMAIL_LIMIT;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getNextMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

async function getMonthlyEmailCount(adminId: string): Promise<number> {
  return prisma.emailHistory.count({
    where: { adminId, sentAt: { gte: getMonthStart() } },
  });
}

function parseCSV(raw: string): { name: string; email: string }[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const firstLower = lines[0].toLowerCase();
  const start = firstLower.includes('email') || firstLower.includes('name') ? 1 : 0;
  const result: { name: string; email: string }[] = [];
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
    const name = parts[0] || '';
    const email = parts[1] || '';
    if (email.includes('@')) result.push({ name, email: email.toLowerCase() });
  }
  return result;
}

export async function getContacts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const tier = admin?.tier ?? 'FREE';

  const [contacts, emailUsed] = await Promise.all([
    prisma.contact.findMany({ where: { adminId }, orderBy: { createdAt: 'desc' } }),
    getMonthlyEmailCount(adminId),
  ]);

  res.json({
    contacts,
    limit: getContactLimit(tier),
    tier,
    emailQuota: {
      used: emailUsed,
      limit: getEmailLimit(tier),
      resetDate: getNextMonthStart().toISOString(),
    },
  });
}

export async function addContact(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { name, email } = req.body as { name: string; email: string };

  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' });
    return;
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const limit = getContactLimit(admin?.tier ?? 'FREE');
  const count = await prisma.contact.count({ where: { adminId } });

  if (count >= limit) {
    res.status(403).json({ error: `Contact limit reached (${limit} for ${admin?.tier ?? 'FREE'} tier). Upgrade to add more.` });
    return;
  }

  try {
    const contact = await prisma.contact.create({
      data: { adminId, name, email: email.toLowerCase() },
    });
    res.status(201).json(contact);
  } catch {
    res.status(409).json({ error: 'This email is already in your contact list.' });
  }
}

export async function deleteContact(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const deleted = await prisma.contact.deleteMany({
    where: { id: req.params.id, adminId },
  });
  if (!deleted.count) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  res.json({ success: true });
}

export async function bulkDeleteContacts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { ids } = req.body as { ids: string[] };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'ids array is required' });
    return;
  }

  const result = await prisma.contact.deleteMany({
    where: { id: { in: ids }, adminId },
  });

  res.json({ deleted: result.count });
}

export async function importContacts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const limit = getContactLimit(admin?.tier ?? 'FREE');
  const existing = await prisma.contact.count({ where: { adminId } });
  const remaining = limit - existing;

  if (remaining <= 0) {
    res.status(403).json({ error: `Contact limit reached (${limit}). Upgrade to add more.` });
    return;
  }

  const parsed = parseCSV(req.file.buffer.toString('utf-8'));
  const toImport = parsed.slice(0, remaining);
  const skipped = parsed.length - toImport.length;

  let added = 0;
  let duplicates = 0;
  for (const { name, email } of toImport) {
    try {
      await prisma.contact.create({ data: { adminId, name, email } });
      added++;
    } catch {
      duplicates++;
    }
  }

  res.json({ added, duplicates, skipped, total: parsed.length });
}

export async function getEmailHistory(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;

  if (req.query.download === 'true') {
    const history = await prisma.emailHistory.findMany({
      where: { adminId },
      orderBy: { sentAt: 'desc' },
    });
    res.json(history);
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const take = 10;

  const [total, history] = await Promise.all([
    prisma.emailHistory.count({ where: { adminId } }),
    prisma.emailHistory.findMany({
      where: { adminId },
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * take,
      take,
    }),
  ]);

  res.json({ history, total, page, pages: Math.ceil(total / take) });
}

export async function broadcastQuiz(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId, contactIds, customSubject, customBody } = req.body as {
    quizId: string;
    contactIds: string[];
    customSubject?: string;
    customBody?: string;
  };

  if (!quizId || !contactIds?.length) {
    res.status(400).json({ error: 'quizId and contactIds are required' });
    return;
  }

  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, category: { adminId } },
  });
  if (!quiz) {
    res.status(404).json({ error: 'Quiz not found' });
    return;
  }
  if (quiz.visibility !== 'PUBLIC') {
    res.status(400).json({ error: 'Only PUBLIC quizzes can be broadcast' });
    return;
  }

  // Check monthly email quota
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true, name: true, email: true } });
  const tier = admin?.tier ?? 'FREE';
  const emailLimit = getEmailLimit(tier);
  const emailUsed = await getMonthlyEmailCount(adminId);
  const remaining = emailLimit - emailUsed;

  if (remaining <= 0) {
    res.status(403).json({
      error: `Monthly email quota reached (${emailLimit} emails/month on ${tier} plan). Resets on the 1st of next month.`,
      emailQuota: { used: emailUsed, limit: emailLimit, resetDate: getNextMonthStart().toISOString() },
    });
    return;
  }

  // Only send up to remaining quota
  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds.slice(0, remaining) }, adminId },
  });
  const skippedByQuota = Math.max(0, contactIds.length - remaining);

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const quizUrl = `${frontendUrl}/quiz/${quizId}`;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    res.status(200).json({
      sent: 0,
      failed: contacts.length,
      quizUrl,
      error: 'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables to enable sending.',
      emailQuota: { used: emailUsed, limit: emailLimit, resetDate: getNextMonthStart().toISOString() },
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  const useCustom = tier === 'PAID' && typeof customSubject === 'string' && customSubject.trim() && typeof customBody === 'string' && customBody.trim();
  let sent = 0;
  let failed = 0;
  const failures: string[] = [];
  const historyEntries: { adminId: string; contactEmail: string; contactName: string; quizTitle: string }[] = [];

  for (const contact of contacts) {
    try {
      let subject: string;
      let html: string;

      if (useCustom) {
        subject = stripNewlines(customSubject!)
          .replace(/\{\{name\}\}/g, stripNewlines(contact.name))
          .replace(/\{\{quiz_title\}\}/g, stripNewlines(quiz.title));
        const bodyHtml = escapeHtml(customBody!)
          .replace(/\{\{name\}\}/g, escapeHtml(contact.name))
          .replace(/\{\{quiz_title\}\}/g, escapeHtml(quiz.title))
          .replace(/\{\{quiz_url\}\}/g, `<a href="${quizUrl}" style="color:#2563eb">${quizUrl}</a>`)
          .replace(/\n/g, '<br>');
        html = `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px;color:#334155">
          ${bodyHtml}
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">Sent by ${escapeHtml(admin?.name || 'Xam Bridge')} via Xam Bridge</p>
        </div>`;
      } else {
        subject = `You're invited: ${stripNewlines(quiz.title)}`;
        html = `<div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px">
          <h2 style="color:#1e293b">Hi ${escapeHtml(contact.name)},</h2>
          <p style="color:#475569">You've been invited to take a quiz:</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0">
            <h3 style="margin:0 0 8px;color:#1e293b">${escapeHtml(quiz.title)}</h3>
            ${quiz.description ? `<p style="margin:0;color:#64748b">${escapeHtml(quiz.description)}</p>` : ''}
            <p style="margin:8px 0 0;color:#64748b;font-size:14px">Passing score: ${quiz.passingScore}%</p>
          </div>
          <a href="${quizUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Start Quiz
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">Sent by ${escapeHtml(admin?.name || 'Xam Bridge')} via Xam Bridge</p>
        </div>`;
      }

      await transporter.sendMail({
        from: `"${stripNewlines(admin?.name || 'Xam Bridge')}" <${fromAddress}>`,
        to: `"${stripNewlines(contact.name)}" <${contact.email}>`,
        subject,
        html,
      });
      sent++;
      historyEntries.push({
        adminId,
        contactEmail: contact.email,
        contactName: contact.name,
        quizTitle: quiz.title,
      });
    } catch {
      failed++;
      failures.push(contact.email);
    }
  }

  // Record history — even if contact is later deleted, these records persist
  if (historyEntries.length > 0) {
    await prisma.emailHistory.createMany({ data: historyEntries });
  }

  const newUsed = emailUsed + sent;

  res.json({
    sent,
    failed,
    failures,
    skippedByQuota,
    quizUrl,
    emailQuota: { used: newUsed, limit: emailLimit, resetDate: getNextMonthStart().toISOString() },
  });
}
