import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { sendWelcomeEmail, sendNewUserNotification, sendPasswordResetEmail } from '../services/email.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function getLocationFromIp(ip: string): Promise<{ country: string; city: string } | null> {
  const clean = (ip || '').replace(/^::ffff:/, '');
  if (!clean || clean === '::1' || clean.startsWith('127.') || clean.startsWith('10.') || clean.startsWith('192.168.')) return null;
  try {
    const res = await fetch(`http://ip-api.com/json/${clean}?fields=status,country,city`);
    const data = await res.json() as { status: string; country: string; city: string };
    return data.status === 'success' ? { country: data.country, city: data.city } : null;
  } catch { return null; }
}

function signToken(user: { id: string; email: string; role: string; tier: string; name: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tier: user.tier, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'PARTICIPANT';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const location = await getLocationFromIp(req.ip || '');
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: assignedRole, country: location?.country, city: location?.city },
  });

  sendWelcomeEmail(user.email, user.name, user.role);
  sendNewUserNotification(user.name, user.email, user.role);

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier, complimentaryQuizId: (user as any).complimentaryQuizId ?? null },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    // Generic message — avoids revealing whether the email exists
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier, complimentaryQuizId: (user as any).complimentaryQuizId ?? null },
  });
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: 'idToken is required' });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });

    if (!user) {
      const location = await getLocationFromIp(req.ip || '');
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          googleId: payload.sub,
          role: 'PARTICIPANT',
          country: location?.country,
          city: location?.city,
        },
      });
      sendWelcomeEmail(user.email, user.name, user.role);
      sendNewUserNotification(user.name, user.email, user.role);
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier, complimentaryQuizId: (user as any).complimentaryQuizId ?? null },
    });
  } catch {
    res.status(401).json({ error: 'Google token verification failed' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email is required' }); return; }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always respond 200 — never reveal whether the email exists
    if (!user || !user.passwordHash) {
      res.json({ message: 'If that email is registered, a reset link has been sent.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'https://quizapp-frontend-552535177061.us-central1.run.app'}/reset-password?token=${token}`;
    sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      res.status(400).json({ error: 'Valid token and a password of at least 8 characters are required.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch {
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

export async function getMe(req: Request & { user?: { id: string } }, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, tier: true, createdAt: true },
  });
  res.json(user);
}

