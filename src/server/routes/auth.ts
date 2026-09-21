import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dbGet, dbRun, dbAll } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendMail, buildVerificationEmail, buildResetEmail } from '../services/email.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30),
});

function logActivity(userId: string | null, action: string, details: string, ip?: string) {
  dbRun(
    'INSERT INTO activity_logs (id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, action, details, ip || null, new Date().toISOString()]
  );
}

function sanitizeUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    planId: row.plan_id,
    storageUsedMb: row.storage_used_mb,
    suspended: row.suspended === 1 || row.suspended === true,
    emailVerified: row.email_verified === 1 || row.email_verified === true,
    discordId: row.discord_id || null,
    discordTag: row.discord_tag || null,
    discordAvatar: row.discord_avatar || null,
    discordBanner: row.discord_banner || null,
    discordDisplayName: row.discord_display_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/setup-check', (_req, res) => {
  const admin = dbGet('SELECT id FROM users WHERE role = ?', ['admin']);
  res.json({ setupRequired: !admin });
});

router.post('/setup', (req, res) => {
  const admin = dbGet('SELECT id FROM users WHERE role = ?', ['admin']);
  if (admin) { res.status(400).json({ error: 'Admin account already exists' }); return; }

  const { email, username, password } = req.body;
  if (!email || !username || !password) { res.status(400).json({ error: 'All fields required' }); return; }
  if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters' }); return; }

  const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) { res.status(400).json({ error: 'Email already in use' }); return; }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  dbRun(
    'INSERT INTO users (id, email, username, password_hash, role, plan_id, storage_used_mb, suspended, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, email, username, hash, 'admin', null, 0, 0, 1, now, now]
  );

  req.session.userId = id;
  res.json({ user: sanitizeUser(dbGet('SELECT * FROM users WHERE id = ?', [id])) });
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 12);
    const now = new Date().toISOString();

    dbRun(
      'INSERT INTO users (id, email, username, password_hash, role, storage_used_mb, suspended, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, email, username, passwordHash, 'user', 0, 0, now, now]
    );

    // Send verification email
    const verifyEnabled = dbGet("SELECT value FROM system_settings WHERE key = 'emailVerification'")?.value;
    if (verifyEnabled === 'true') {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      dbRun(
        'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
        [`verify:${id}`, JSON.stringify({ code, expiresAt }), now]
      );
      try {
        await sendMail(email, 'Verify your DiscordHost account', buildVerificationEmail(username, code));
      } catch (e) {
        console.error('[Email] Failed to send verification:', e);
      }
    }

    req.session.userId = id;

    logActivity(id, 'register', `User ${username} registered`, req.ip);

    res.status(201).json({
      user: { id, email, username, role: 'user', planId: null, storageUsedMb: 0, suspended: false, createdAt: now, updatedAt: now },
      emailSent: verifyEnabled === 'true',
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', validate(loginSchema), (req, res) => {
  try {
    const { email, password } = req.body;

    const row = dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!row) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = bcrypt.compareSync(password, row.password_hash as string);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (row.suspended === 1 || row.suspended === true) {
      res.status(403).json({ error: 'Account suspended' });
      return;
    }

    req.session.userId = row.id as string;

    logActivity(row.id as string, 'login', 'User logged in', req.ip);

    res.json({ user: sanitizeUser(row) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    if (userId) {
      logActivity(userId, 'logout', 'User logged out', req.ip);
    }
    res.json({ success: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId!]);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user: sanitizeUser(row) });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/verify-email', requireAuth, (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.session.userId!;
    const row = dbGet("SELECT value FROM system_settings WHERE key = ?", [`verify:${userId}`]);

    if (!row) {
      res.status(400).json({ error: 'No verification code found' });
      return;
    }

    const data = JSON.parse(row.value as string);
    if (new Date(data.expiresAt) < new Date()) {
      dbRun('DELETE FROM system_settings WHERE key = ?', [`verify:${userId}`]);
      res.status(400).json({ error: 'Verification code expired' });
      return;
    }

    if (data.code !== code) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    dbRun('DELETE FROM system_settings WHERE key = ?', [`verify:${userId}`]);
    dbRun('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), userId]);
    logActivity(userId, 'email_verified', 'Email verified', req.ip);

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/resend-verification', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const user = dbGet('SELECT email, username FROM users WHERE id = ?', [userId]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    dbRun(
      'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
      [`verify:${userId}`, JSON.stringify({ code, expiresAt }), now]
    );

    try {
      await sendMail(user.email as string, 'Verify your DiscordHost account', buildVerificationEmail(user.username as string, code));
    } catch (e) {
      console.error('[Email] Failed to resend verification:', e);
    }

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-discord-code', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;
    const user = dbGet('SELECT discord_id FROM users WHERE id = ?', [userId]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    if (user.discord_id) { res.status(400).json({ error: 'Discord account already linked' }); return; }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    dbRun(
      'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
      [`verify-discord:${userId}`, JSON.stringify({ code, expiresAt }), now]
    );

    res.json({ code, expiresAt });
  } catch (err) {
    console.error('Generate discord code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const row = dbGet('SELECT id, username FROM users WHERE email = ?', [email]);

    if (!row) {
      res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
      return;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    dbRun(
      'INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)',
      [`reset:${row.id}`, JSON.stringify({ token, expiresAt }), new Date().toISOString()]
    );

    const baseUrl = req.headers.origin || `http://${req.headers.host}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
      await sendMail(email, 'Reset your DiscordHost password', buildResetEmail(row.username as string, resetUrl));
    } catch (e) {
      console.error('[Email] Failed to send reset:', e);
    }

    logActivity(row.id as string, 'forgot_password', 'Password reset requested', req.ip);

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', validate(resetPasswordSchema), (req, res) => {
  try {
    const { token, password } = req.body;

    const allSettings = dbAll("SELECT key, value FROM system_settings WHERE key LIKE 'reset:%'");
    let userId: string | null = null;

    for (const row of allSettings) {
      try {
        const data = JSON.parse(row.value as string);
        if (data.token === token) {
          if (new Date(data.expiresAt) < new Date()) {
            res.status(400).json({ error: 'Reset token expired' });
            return;
          }
          userId = (row.key as string).replace('reset:', '');
          break;
        }
      } catch {}
    }

    if (!userId) {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 12);
    const now = new Date().toISOString();

    dbRun('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, userId]);
    dbRun('DELETE FROM system_settings WHERE key = ?', [`reset:${userId}`]);

    logActivity(userId, 'reset_password', 'Password reset completed', req.ip);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/change-password', requireAuth, validate(changePasswordSchema), (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const row = dbGet('SELECT password_hash FROM users WHERE id = ?', [req.session.userId!]);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!bcrypt.compareSync(oldPassword, row.password_hash as string)) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = bcrypt.hashSync(newPassword, 12);
    const now = new Date().toISOString();

    dbRun('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [passwordHash, now, req.session.userId!]);

    logActivity(req.session.userId!, 'change_password', 'Password changed', req.ip);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/update-profile', requireAuth, validate(updateProfileSchema), (req, res) => {
  try {
    const { username } = req.body;
    const now = new Date().toISOString();

    dbRun('UPDATE users SET username = ?, updated_at = ? WHERE id = ?', [username, now, req.session.userId!]);

    const row = dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId!]);

    logActivity(req.session.userId!, 'update_profile', `Username changed to ${username}`, req.ip);

    if (req.session.user) {
      req.session.user.username = username;
      req.session.user.updatedAt = now;
    }

    res.json({ user: sanitizeUser(row!) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/activity', requireAuth, (req, res) => {
  try {
    const rows = dbAll(
      'SELECT action, details, created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.session.userId!]
    );
    res.json({ activity: rows || [] });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/dashboard-stats', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId!;
    const totalBots = dbGet('SELECT COUNT(*) as count FROM bots WHERE user_id = ?', [userId]);
    const runningBots = dbGet("SELECT COUNT(*) as count FROM bots WHERE user_id = ? AND status = 'running'", [userId]);
    const stoppedBots = dbGet("SELECT COUNT(*) as count FROM bots WHERE user_id = ? AND status = 'stopped'", [userId]);
    const crashedBots = dbGet("SELECT COUNT(*) as count FROM bots WHERE user_id = ? AND status = 'crashed'", [userId]);
    const user = dbGet('SELECT storage_used_mb, plan_id FROM users WHERE id = ?', [userId]);
    const plans = dbGet('SELECT * FROM hosting_plans WHERE id = ?', [user?.plan_id || '']);
    const userBots = dbAll('SELECT id, name, ram_mb, status, crash_count, last_crash_error, last_crash_at FROM bots WHERE user_id = ?', [userId]);
    const totalRamUsed = (userBots || []).reduce((sum: number, b: any) => sum + (b.ram_mb || 0), 0);

    res.json({
      stats: {
        totalBots: totalBots?.count || 0,
        runningBots: runningBots?.count || 0,
        stoppedBots: stoppedBots?.count || 0,
        crashedBots: crashedBots?.count || 0,
        storageUsedMb: user?.storage_used_mb || 0,
        storageLimitMb: plans?.storage_mb || 5120,
        planName: plans?.name || 'Free',
        ramLimitMb: plans?.ram_mb || 256,
        maxBots: plans?.max_bots || 3,
        ramUsedMb: totalRamUsed,
        bots: (userBots || []).map((b: any) => ({
          id: b.id, name: b.name, ramMb: b.ram_mb, status: b.status,
          crashCount: b.crash_count || 0, lastCrashError: b.last_crash_error, lastCrashAt: b.last_crash_at,
        })),
      },
    });
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/api-keys', requireAuth, (req, res) => {
  try {
    const rows = dbAll(
      'SELECT id, name, key_prefix, last_used_at, expires_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
      [req.session.userId!]
    );
    res.json({ keys: rows || [] });
  } catch (err) {
    console.error('Get api keys error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api-keys', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.length < 1) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const id = uuidv4();
    const key = `dh_${uuidv4().replace(/-/g, '')}`;
    const keyPrefix = key.slice(0, 8);
    const keyHash = bcrypt.hashSync(key, 10);
    const now = new Date().toISOString();

    dbRun(
      'INSERT INTO api_keys (id, user_id, name, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.session.userId!, name, keyHash, keyPrefix, now]
    );

    logActivity(req.session.userId!, 'create_api_key', `API key "${name}" created`, req.ip);

    res.status(201).json({ key, id, name, keyPrefix, createdAt: now });
  } catch (err) {
    console.error('Create api key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/api-keys/:keyId', requireAuth, (req, res) => {
  try {
    const { keyId } = req.params;
    const row = dbGet('SELECT id FROM api_keys WHERE id = ? AND user_id = ?', [keyId, req.session.userId!]);
    if (!row) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    dbRun('DELETE FROM api_keys WHERE id = ?', [keyId]);
    logActivity(req.session.userId!, 'delete_api_key', 'API key deleted', req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete api key error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
