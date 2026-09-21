import { Router } from 'express';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { requireAdmin } from '../middleware/auth.js';
import { BotManager } from '../engine/BotManager.js';
import { sendMail, testResendConnection, sendTestEmail } from '../services/email.js';
import { startDiscordBot, getDiscordClient } from '../services/discord.js';

import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/stats', requireAdmin, (_req, res) => {
  try {
    const totalUsersRow = dbGet('SELECT COUNT(*) as count FROM users');
    const totalBotsRow = dbGet('SELECT COUNT(*) as count FROM bots');
    const runningBotsRow = dbGet("SELECT COUNT(*) as count FROM bots WHERE status = 'running'");
    const crashedBotsRow = dbGet("SELECT COUNT(*) as count FROM bots WHERE status = 'crashed'");

    res.json({
      stats: {
        totalUsers: totalUsersRow?.count || 0,
        totalBots: totalBotsRow?.count || 0,
        runningBots: runningBotsRow?.count || 0,
        crashedBots: crashedBotsRow?.count || 0,
        systemCpu: 0,
        systemRam: 0,
        storageUsed: 0,
        storageTotal: 0,
      },
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users', requireAdmin, (_req, res) => {
  try {
    const rows = dbAll('SELECT id, email, username, role, plan_id, storage_used_mb, suspended, created_at, updated_at FROM users ORDER BY created_at DESC');
    const users = rows.map((row) => ({
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role,
      planId: row.plan_id,
      storageUsedMb: row.storage_used_mb,
      suspended: row.suspended === 1 || row.suspended === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    res.json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/role', requireAdmin, (req, res) => {
  try {
    const { role } = req.body;
    if (role !== 'user' && role !== 'admin') { res.status(400).json({ error: 'Invalid role' }); return; }
    dbRun('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [role, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/suspend', requireAdmin, (req, res) => {
  try {
    const { suspended } = req.body;
    dbRun('UPDATE users SET suspended = ?, updated_at = ? WHERE id = ?', [suspended ? 1 : 0, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bots', requireAdmin, (_req, res) => {
  try {
    const rows = dbAll(`SELECT b.*, u.username as owner_username FROM bots b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC`);
    const bots = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      ownerUsername: row.owner_username,
      name: row.name,
      runtime: row.runtime,
      status: row.status,
      ramMb: row.ram_mb,
      cpuPercent: row.cpu_percent,
      uptimeMs: row.uptime_ms,
      autoRestart: row.auto_restart === 1 || row.auto_restart === true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    res.json({ bots });
  } catch (err) {
    console.error('Get admin bots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/activity', requireAdmin, (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const rows = dbAll('SELECT a.*, u.username FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?', [limit]);
    const logs = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      action: row.action,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
    }));
    res.json({ logs });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/broadcast', requireAdmin, (req, res) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) { res.status(400).json({ error: 'Title and message are required' }); return; }
    const now = new Date().toISOString();
    dbRun('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)', ['broadcast', JSON.stringify({ title, message, createdAt: now }), now]);
    res.json({ success: true });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bots/:id/start', requireAdmin, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    const bm = BotManager.getInstance();
    const started = bm.startBot(req.params.id);
    if (!started) { res.status(500).json({ error: 'Failed to start bot' }); return; }
    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot started', bot: updated });
  } catch (err) {
    console.error('Admin start bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bots/:id/stop', requireAdmin, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    const bm = BotManager.getInstance();
    bm.stopBot(req.params.id);
    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot stopped', bot: updated });
  } catch (err) {
    console.error('Admin stop bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bots/:id/restart', requireAdmin, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    const bm = BotManager.getInstance();
    bm.restartBot(req.params.id);
    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot restarted', bot: updated });
  } catch (err) {
    console.error('Admin restart bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/bots/:id', requireAdmin, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    const bm = BotManager.getInstance();
    bm.stopBot(req.params.id);
    dbRun('DELETE FROM bots WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!row) { res.status(404).json({ error: 'User not found' }); return; }
    if (row.role === 'admin') { res.status(400).json({ error: 'Cannot delete admin users' }); return; }

    const bots = dbAll('SELECT id FROM bots WHERE user_id = ?', [req.params.id]);
    const bm = BotManager.getInstance();
    for (const bot of bots) bm.stopBot(bot.id as string);

    dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/plan', requireAdmin, (req, res) => {
  try {
    const { planId } = req.body;
    dbRun('UPDATE users SET plan_id = ?, updated_at = ? WHERE id = ?', [planId || null, new Date().toISOString(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update user plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/settings', requireAdmin, (_req, res) => {
  try {
    const rows = dbAll('SELECT key, value FROM system_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (!(row.key as string).startsWith('reset:')) {
        settings[row.key as string] = row.value as string;
      }
    }

    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const cpus = os.cpus();

    const systemInfo = {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.arch()}`,
      uptime: Math.floor(os.uptime()),
      cpu: Math.round((1 - freeMem / totalMem) * 100 * cpus.length / cpus.length),
      ram: Math.round((1 - freeMem / totalMem) * 100),
      storage: 0,
      totalMemory: `${Math.round(totalMem / 1024 / 1024 / 1024)} GB`,
      freeMemory: `${Math.round(freeMem / 1024 / 1024 / 1024)} GB`,
    };

    res.json({ settings, system: systemInfo });
  } catch (err) {
    console.error('Get admin settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/settings', requireAdmin, (req, res) => {
  try {
    const now = new Date().toISOString();
    const { registrationEnabled, maintenanceMode, maxBotsPerUser, maxRamMb, maxStorageMb, botCreationDisabled, welcomeAnimation, emailVerification, resendApiKey, resendFromEmail, demoMode } = req.body;

    const settings: Record<string, string> = {};
    if (registrationEnabled !== undefined) settings.registrationEnabled = String(registrationEnabled);
    if (maintenanceMode !== undefined) settings.maintenanceMode = String(maintenanceMode);
    if (maxBotsPerUser !== undefined) settings.maxBotsPerUser = String(maxBotsPerUser);
    if (maxRamMb !== undefined) settings.maxRamMb = String(maxRamMb);
    if (maxStorageMb !== undefined) settings.maxStorageMb = String(maxStorageMb);
    if (botCreationDisabled !== undefined) settings.botCreationDisabled = String(botCreationDisabled);
    if (welcomeAnimation !== undefined) settings.welcomeAnimation = String(welcomeAnimation);
    if (emailVerification !== undefined) settings.emailVerification = String(emailVerification);
    if (demoMode !== undefined) settings.demoMode = String(demoMode);
    if (req.body.demoAccessCode !== undefined) settings.demoAccessCode = String(req.body.demoAccessCode);
    if (resendApiKey !== undefined) settings.resendApiKey = String(resendApiKey);
    if (resendFromEmail !== undefined) settings.resendFromEmail = String(resendFromEmail);
    if (req.body.discordToken !== undefined) settings.discordToken = String(req.body.discordToken);
    if (req.body.discordAdminIds !== undefined) settings.discordAdminIds = JSON.stringify(req.body.discordAdminIds);

    for (const [key, value] of Object.entries(settings)) {
      dbRun(
        'INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        [key, value, now, value, now]
      );
    }

    if (registrationEnabled !== undefined) {
      dbRun(
        'INSERT INTO branding_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        ['registrationEnabled', String(registrationEnabled), now, String(registrationEnabled), now]
      );
    }

    if (welcomeAnimation !== undefined) {
      dbRun(
        'INSERT INTO branding_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        ['welcomeAnimation', String(welcomeAnimation), now, String(welcomeAnimation), now]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Update admin settings error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/discord-status', requireAdmin, (_req, res) => {
  try {
    const token = dbGet("SELECT value FROM system_settings WHERE key = 'discordToken'")?.value;
    const client = getDiscordClient();
    res.json({
      hasToken: !!token,
      connected: !!client && client.isReady(),
    });
  } catch {
    res.json({ hasToken: false, connected: false });
  }
});

router.post('/discord-start', requireAdmin, async (_req, res) => {
  try {
    const existing = getDiscordClient();
    if (existing && existing.isReady()) {
      existing.destroy();
    }
    await startDiscordBot();
    const client = getDiscordClient();
    res.json({ success: true, message: 'Discord bot started', connected: !!client && client.isReady() });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start bot' });
  }
});

router.get('/system-status', requireAdmin, (_req, res) => {
  try {
    const os = require('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    const totalBots = dbGet('SELECT COUNT(*) as count FROM bots')?.count || 0;
    const runningBots = dbGet("SELECT COUNT(*) as count FROM bots WHERE status = 'running'")?.count || 0;
    const totalUsers = dbGet('SELECT COUNT(*) as count FROM users')?.count || 0;

    res.json({
      status: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        nodeVersion: process.version,
        cpuCount: cpus.length,
        cpuModel: cpus[0]?.model || 'Unknown',
        cpuUsage: loadAvg[0] / cpus.length * 100,
        loadAverage: { '1m': loadAvg[0], '5m': loadAvg[1], '15m': loadAvg[2] },
        memory: {
          total: Math.round(totalMem / 1024 / 1024),
          used: Math.round(usedMem / 1024 / 1024),
          free: Math.round(freeMem / 1024 / 1024),
          percent: Math.round((usedMem / totalMem) * 100),
        },
        stats: { totalBots, runningBots, totalUsers },
      },
    });
  } catch (err) {
    console.error('System status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const { apiKey, fromEmail, toEmail } = req.body;
    if (!apiKey) { res.status(400).json({ error: 'API key is required' }); return; }
    if (!toEmail) { res.status(400).json({ error: 'Recipient email is required' }); return; }
    const from = fromEmail || 'DiscordHost <onboarding@resend.dev>';
    const result = await sendTestEmail(apiKey, from, toEmail);
    res.json(result);
  } catch (err: any) {
    console.error('Test email error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to send email' });
  }
});

router.post('/test-email-key', requireAdmin, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) { res.status(400).json({ error: 'API key is required' }); return; }
    const result = await testResendConnection(apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to verify key' });
  }
});

router.post('/backup', requireAdmin, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve(process.cwd(), 'data', 'discordhost.db');
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(backupDir, `backup-${timestamp}.db`);

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupFile);
      const size = fs.statSync(backupFile).size;
      res.json({ success: true, file: `backup-${timestamp}.db`, size });
    } else {
      res.status(404).json({ error: 'Database file not found' });
    }
  } catch (err: any) {
    console.error('Backup error:', err);
    res.status(500).json({ error: err.message || 'Backup failed' });
  }
});

router.get('/backups', requireAdmin, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');

    if (!fs.existsSync(backupDir)) {
      res.json({ backups: [] });
      return;
    }

    const files = fs.readdirSync(backupDir)
      .filter((f: string) => f.endsWith('.db'))
      .map((f: string) => {
        const stat = fs.statSync(path.join(backupDir, f));
        return { name: f, size: stat.size, createdAt: stat.birthtime.toISOString() };
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ backups: files });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list backups' });
  }
});

router.get('/ads', requireAdmin, (_req, res) => {
  try {
    const ads = dbAll('SELECT * FROM bot_ads ORDER BY sort_order ASC, created_at DESC');
    res.json({ ads });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ads' });
  }
});

router.post('/ads', requireAdmin, (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, buttonText, maxUses, active } = req.body;
    if (!title || !description) { res.status(400).json({ error: 'Title and description required' }); return; }
    const id = uuidv4();
    const now = new Date().toISOString();
    dbRun(
      'INSERT INTO bot_ads (id, title, description, image_url, link_url, button_text, max_uses, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, title, description, imageUrl || null, linkUrl || null, buttonText || 'Learn More', maxUses || 0, active !== false ? 1 : 0, now, now]
    );
    const ad = dbGet('SELECT * FROM bot_ads WHERE id = ?', [id]);
    res.json({ ad });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create ad' });
  }
});

router.put('/ads/:id', requireAdmin, (req, res) => {
  try {
    const { title, description, imageUrl, linkUrl, buttonText, maxUses, active, sortOrder } = req.body;
    const existing = dbGet('SELECT id FROM bot_ads WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ error: 'Ad not found' }); return; }
    const now = new Date().toISOString();
    dbRun(
      'UPDATE bot_ads SET title = ?, description = ?, image_url = ?, link_url = ?, button_text = ?, max_uses = ?, active = ?, sort_order = ?, updated_at = ? WHERE id = ?',
      [title, description, imageUrl || null, linkUrl || null, buttonText || 'Learn More', maxUses || 0, active ? 1 : 0, sortOrder || 0, now, req.params.id]
    );
    const ad = dbGet('SELECT * FROM bot_ads WHERE id = ?', [req.params.id]);
    res.json({ ad });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update ad' });
  }
});

router.delete('/ads/:id', requireAdmin, (req, res) => {
  try {
    dbRun('DELETE FROM bot_ads WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete ad' });
  }
});

export default router;
