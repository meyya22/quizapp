import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: string;
      tier: string;
      name: string;
    };
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: string;
        email: string;
        role: string;
        tier: string;
        name: string;
      };
      req.user = payload;
    } catch {
      // invalid token — treat as unauthenticated
    }
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Super admin access required' });
    return;
  }
  next();
}
