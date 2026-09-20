import type { Request, Response, NextFunction } from 'express';
import { dbGet } from '../db/database.js';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    user?: {
      id: string;
      email: string;
      username: string;
      role: 'user' | 'admin';
      planId: string | null;
      storageUsedMb: number;
      suspended: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }
}

export function getCurrentUser(req: Request): NonNullable<Request['session']['user']> | null {
  const userId = req.session.userId;
  if (!userId) return null;

  if (req.session.user && req.session.user.id === userId) {
    return req.session.user;
  }

  const row = dbGet(
    'SELECT id, email, username, role, plan_id, storage_used_mb, suspended, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );

  if (!row) return null;

  const user = {
    id: row.id as string,
    email: row.email as string,
    username: row.username as string,
    role: row.role as 'user' | 'admin',
    planId: row.plan_id as string | null,
    storageUsedMb: row.storage_used_mb as number,
    suspended: row.suspended === 1 || row.suspended === true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };

  req.session.user = user;
  return user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = getCurrentUser(req);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (user.suspended) {
    res.status(403).json({ error: 'Account suspended' });
    return;
  }

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = getCurrentUser(req);
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: 'User not found' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
