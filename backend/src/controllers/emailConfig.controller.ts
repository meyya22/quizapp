import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import { AuthRequest } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;
const MASK = '••••••••';

function buildFrom(fromEmail: string, fromName: string): string {
  const addr = fromEmail || '';
  return fromName && addr ? `"${fromName}" <${addr}>` : addr || fromName;
}

export async function getEmailConfig(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const config = await prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (config) {
      res.json({
        host: config.host,
        port: config.port,
        user: config.user,
        pass: MASK,
        fromEmail: config.fromEmail ?? '',
        fromName: config.fromName ?? '',
        source: 'database',
        updatedAt: config.updatedAt,
      });
      return;
    }
    // Fall back to env vars
    res.json({
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      user: process.env.SMTP_USER ?? '',
      pass: process.env.SMTP_PASS ? MASK : '',
      fromEmail: process.env.SMTP_FROM ?? '',
      fromName: '',
      source: 'environment',
      updatedAt: null,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load email config.' });
  }
}

export async function updateEmailConfig(req: AuthRequest, res: Response): Promise<void> {
  const { host, port, user, pass, fromEmail, fromName } = req.body;
  if (!host || !user) {
    res.status(400).json({ error: 'host and user are required.' });
    return;
  }

  try {
    let resolvedPass = pass as string;
    if (resolvedPass === MASK) {
      const existing = await prisma.emailConfig.findUnique({ where: { id: 1 } });
      if (!existing) {
        res.status(400).json({ error: 'No saved config found — please enter the password.' });
        return;
      }
      resolvedPass = existing.pass;
    }
    if (!resolvedPass) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const config = await prisma.emailConfig.upsert({
      where: { id: 1 },
      update: { host, port: Number(port) || 587, user, pass: resolvedPass, fromEmail: fromEmail || null, fromName: fromName || null },
      create: { id: 1, host, port: Number(port) || 587, user, pass: resolvedPass, fromEmail: fromEmail || null, fromName: fromName || null },
    });
    res.json({ success: true, updatedAt: config.updatedAt });
  } catch {
    res.status(500).json({ error: 'Failed to save email config.' });
  }
}

export async function testEmailConfig(req: AuthRequest, res: Response): Promise<void> {
  const { host, port, user, pass, fromEmail, fromName, testTo } = req.body;
  if (!host || !user || !testTo) {
    res.status(400).json({ error: 'host, user, and testTo are required.' });
    return;
  }

  try {
    let resolvedPass = pass as string;
    if (resolvedPass === MASK) {
      const existing = await prisma.emailConfig.findUnique({ where: { id: 1 } });
      resolvedPass = existing?.pass ?? '';
    }
    if (!resolvedPass) {
      res.status(400).json({ error: 'Password is required for test.' });
      return;
    }

    const portNum = Number(port) || 587;
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: portNum === 465,
      auth: { user, pass: resolvedPass },
    });

    await transporter.verify();
    const from = buildFrom(fromEmail, fromName);
    await transporter.sendMail({
      from,
      to: testTo,
      subject: 'Test Email — Xam Bridge SMTP',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <h2 style="color:#1e293b;margin:0 0 12px;">SMTP Test Successful</h2>
          <p style="color:#475569;margin:0 0 8px;">This is a test email sent from the Xam Bridge Super Admin panel.</p>
          <p style="color:#94a3b8;font-size:13px;margin:0;">SMTP Host: ${host} · Port: ${portNum}</p>
        </div>`,
    });

    res.json({ success: true, message: `Test email sent to ${testTo}` });
  } catch (err) {
    const msg = (err as { message?: string }).message ?? 'SMTP connection failed.';
    res.status(400).json({ error: msg });
  }
}
