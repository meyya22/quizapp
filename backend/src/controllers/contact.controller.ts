import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import nodemailer from 'nodemailer';

const FREE_LIMIT = 10;
const PAID_LIMIT = 500;

function getLimit(tier: string) {
  return tier === 'PAID' ? PAID_LIMIT : FREE_LIMIT;
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
  const contacts = await prisma.contact.findMany({
    where: { adminId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ contacts, limit: getLimit(admin?.tier ?? 'FREE'), tier: admin?.tier });
}

export async function addContact(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { name, email } = req.body as { name: string; email: string };

  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' });
    return;
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const limit = getLimit(admin?.tier ?? 'FREE');
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

export async function importContacts(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { tier: true } });
  const limit = getLimit(admin?.tier ?? 'FREE');
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

export async function broadcastQuiz(req: AuthRequest, res: Response): Promise<void> {
  const adminId = req.user!.id;
  const { quizId, contactIds } = req.body as { quizId: string; contactIds: string[] };

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

  const contacts = await prisma.contact.findMany({
    where: { id: { in: contactIds }, adminId },
  });

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const quizUrl = `${frontendUrl}/quiz/${quizId}`;
  const admin = await prisma.user.findUnique({ where: { id: adminId }, select: { name: true, email: true } });

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    res.status(200).json({
      sent: 0,
      failed: contacts.length,
      quizUrl,
      error: 'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS environment variables to enable sending.',
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
  let sent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const contact of contacts) {
    try {
      await transporter.sendMail({
        from: `"${admin?.name || 'QuizApp'}" <${fromAddress}>`,
        to: `"${contact.name}" <${contact.email}>`,
        subject: `You're invited: ${quiz.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:24px">
            <h2 style="color:#1e293b">Hi ${contact.name},</h2>
            <p style="color:#475569">You've been invited to take a quiz:</p>
            <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="margin:0 0 8px;color:#1e293b">${quiz.title}</h3>
              ${quiz.description ? `<p style="margin:0;color:#64748b">${quiz.description}</p>` : ''}
              <p style="margin:8px 0 0;color:#64748b;font-size:14px">Passing score: ${quiz.passingScore}%</p>
            </div>
            <a href="${quizUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
              Start Quiz
            </a>
            <p style="color:#94a3b8;font-size:12px;margin-top:24px">Sent by ${admin?.name} via QuizApp</p>
          </div>
        `,
      });
      sent++;
    } catch {
      failed++;
      failures.push(contact.email);
    }
  }

  res.json({ sent, failed, failures, quizUrl });
}
