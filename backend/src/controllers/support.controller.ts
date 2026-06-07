import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

const SUPPORT_EMAIL = 'cs.admin@xambridge.com';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

async function getSmtpConfig(): Promise<{ host: string; port: number; user: string; pass: string; from: string } | null> {
  try {
    const config = await prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (config?.host && config?.user && config?.pass) {
      return {
        host: config.host,
        port: config.port ?? 587,
        user: config.user,
        pass: config.pass,
        from: config.fromEmail ? (config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail) : config.user,
      };
    }
  } catch { /* fall through to env */ }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return {
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: SMTP_FROM || SMTP_USER,
    };
  }

  return null;
}

export async function sendEnquiry(req: Request, res: Response): Promise<void> {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email and message are required' });
    return;
  }
  if (message.length > 1000) {
    res.status(400).json({ error: 'Message must be 1000 characters or less' });
    return;
  }

  const smtp = await getSmtpConfig();
  if (!smtp) {
    res.status(503).json({ error: 'Email service not configured' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:12px">
        General Enquiry — Xam Bridge
      </h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:8px 0;color:#64748b;width:140px">Name</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b">Email</td><td style="padding:8px 0;color:#1e293b">${escapeHtml(email)}</td></tr>
      </table>
      <h3 style="color:#1e293b;margin-bottom:8px">Message</h3>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#334155;white-space:pre-wrap">${escapeHtml(message)}</div>
    </div>
  `;

  await transporter.sendMail({
    from: smtp.from,
    to: SUPPORT_EMAIL,
    replyTo: email.replace(/[\r\n]/g, ''),
    subject: `General Enquiry from ${name.replace(/[\r\n]/g, '')}`,
    html,
  });

  res.json({ success: true });
}
