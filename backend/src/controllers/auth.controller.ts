import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function signToken(user: { id: string; email: string; role: string; tier: string; name: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tier: user.tier, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: assignedRole },
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'No account found with that email address.' });
    return;
  }
  if (!user.passwordHash) {
    res.status(401).json({ error: 'This account was created with Google Sign-In. Please use the Google button to log in.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Incorrect password. Please try again.' });
    return;
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier },
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
      user = await prisma.user.create({
        data: {
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          googleId: payload.sub,
          role: 'PARTICIPANT',
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub },
      });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier },
    });
  } catch {
    res.status(401).json({ error: 'Google token verification failed' });
  }
}

export async function getMe(req: Request & { user?: { id: string } }, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, tier: true, createdAt: true },
  });
  res.json(user);
}

export async function upgradeTier(req: AuthRequest, res: Response): Promise<void> {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { tier: 'PAID' },
  });
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, tier: user.tier },
  });
}
