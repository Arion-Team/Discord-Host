import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { BotManager } from '../engine/BotManager.js';
import multer from 'multer';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

const router = Router();

const upload = multer({
  dest: path.resolve(process.cwd(), 'tmp', 'uploads'),
  limits: { fileSize: 52428800 },
});

const createBotSchema = z.object({
  name: z.string().min(1).max(50),
  runtime: z.enum(['node', 'python']),
  token: z.string().min(1),
  startupCommand: z.string().optional().default(''),
  workingDirectory: z.string().optional().default('./'),
  ramMb: z.number().int().min(64).optional().default(128),
  autoRestart: z.boolean().optional().default(false),
  envVars: z.record(z.string()).optional().default({}),
});

const updateBotSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  startupCommand: z.string().optional(),
  ramMb: z.number().int().min(64).optional(),
  autoRestart: z.boolean().optional(),
  envVars: z.record(z.string()).optional(),
});

function sanitizeBot(row: Record<string, unknown>) {
  let envVars = {};
  if (row.env_vars) {
    try {
      envVars = typeof row.env_vars === 'string' ? JSON.parse(row.env_vars) : row.env_vars;
    } catch {}
  }
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    runtime: row.runtime,
    status: row.status,
    startupCommand: row.startup_command,
    workingDirectory: row.working_directory,
    ramMb: row.ram_mb,
    cpuPercent: row.cpu_percent,
    uptimeMs: row.uptime_ms,
    autoRestart: row.auto_restart === 1 || row.auto_restart === true,
    envVars,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List bots
router.get('/', requireAuth, (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM bots WHERE user_id = ? ORDER BY created_at DESC', [req.session.userId!]);
    res.json({ bots: rows.map(sanitizeBot) });
  } catch (err) {
    console.error('Get bots error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user can create a bot — MUST be before /:id
router.get('/check/create', requireAuth, (req, res) => {
  try {
    const botCreationSetting = dbGet("SELECT value FROM system_settings WHERE key = 'botCreationDisabled'");
    if (botCreationSetting?.value === 'true') {
      res.status(403).json({ error: 'Bot creation is currently disabled by an administrator' });
      return;
    }

    const userId = req.session.userId!;
    const user = dbGet('SELECT * FROM users WHERE id = ?', [userId]) as Record<string, any>;
    const userBots = dbGet('SELECT COUNT(*) as count FROM bots WHERE user_id = ?', [userId]) as { count: number };

    let planLimit = 1;
    if (user?.plan_id) {
      const plan = dbGet('SELECT max_bots FROM hosting_plans WHERE id = ?', [user.plan_id]) as { max_bots: number } | undefined;
      if (plan) planLimit = plan.max_bots;
    }

    const maxBotsSetting = dbGet("SELECT value FROM system_settings WHERE key = 'maxBotsPerUser'");
    if (maxBotsSetting?.value) {
      planLimit = Math.min(planLimit, parseInt(maxBotsSetting.value));
    }

    if (userBots.count >= planLimit) {
      res.status(403).json({ error: `Bot limit reached (${planLimit}). Upgrade your plan to create more bots.` });
      return;
    }

    res.json({ allowed: true, currentBots: userBots.count, limit: planLimit });
  } catch (err) {
    console.error('Check create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import from GitHub — MUST be before /:id
router.post('/import-github', requireAuth, (req, res) => {
  try {
    const { name, runtime, token, repoUrl, startupCommand, ramMb, autoRestart, envVars } = req.body;

    const botCreationSetting = dbGet("SELECT value FROM system_settings WHERE key = 'botCreationDisabled'");
    if (botCreationSetting?.value === 'true') {
      res.status(403).json({ error: 'Bot creation is currently disabled by an administrator' });
      return;
    }

    const httpsUrl = repoUrl.replace(/\.git$/, '').replace('github.com/', 'github.com/');
    const match = httpsUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      res.status(400).json({ error: 'Invalid GitHub URL' });
      return;
    }

    const [, owner, repo] = match;
    const id = uuidv4();
    const now = new Date().toISOString();
    const userId = req.session.userId!;
    const botDir = path.resolve(process.cwd(), 'bots', userId, id);

    fs.mkdirSync(botDir, { recursive: true });

    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;

    dbRun(
      `INSERT INTO bots (id, user_id, name, runtime, status, token, startup_command, working_directory, ram_mb, cpu_percent, uptime_ms, auto_restart, env_vars, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, name, runtime, 'stopped', token || '', startupCommand || '', './', ramMb || 128, 0, 0, autoRestart ? 1 : 0, JSON.stringify(envVars || {}), now, now]
    );

    const row = dbGet('SELECT * FROM bots WHERE id = ?', [id]);

    fetch(zipUrl).then(async (response) => {
      if (!response.ok) return;
      const buffer = Buffer.from(await response.arrayBuffer());
      const tmpZip = path.resolve(process.cwd(), 'tmp', 'uploads', `${id}.zip`);
      fs.writeFileSync(tmpZip, buffer);
      const zip = new AdmZip(tmpZip);
      const entries = zip.getEntries();
      for (const entry of entries) {
        const entryPath = entry.entryName;
        const parts = entryPath.split('/');
        if (parts.length > 1) {
          const relativePath = parts.slice(1).join('/');
          if (relativePath && !entry.isDirectory) {
            const targetPath = path.join(botDir, relativePath);
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            fs.writeFileSync(targetPath, entry.getData());
          }
        }
      }
      fs.unlinkSync(tmpZip);
    }).catch(() => {});

    res.status(201).json({ bot: sanitizeBot(row!) });
  } catch (err) {
    console.error('Import GitHub error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create bot
router.post('/', requireAuth, validate(createBotSchema), (req, res) => {
  try {
    // Check email verification if required
    const verifyEnabled = dbGet("SELECT value FROM system_settings WHERE key = 'emailVerification'")?.value;
    if (verifyEnabled === 'true') {
      const user = dbGet('SELECT email_verified FROM users WHERE id = ?', [req.session.userId!]);
      if (user && !user.email_verified) {
        res.status(403).json({ error: 'Please verify your email before creating a bot.' });
        return;
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const { name, runtime, token, startupCommand, workingDirectory, autoRestart, envVars } = req.body;

    // Auto-assign RAM based on plan
    const user = dbGet('SELECT plan_id FROM users WHERE id = ?', [req.session.userId!]);
    let autoRamMb = 256;
    if (user?.plan_id) {
      const plan = dbGet('SELECT ram_mb FROM hosting_plans WHERE id = ?', [user.plan_id]);
      autoRamMb = plan?.ram_mb || 256;
    }

    dbRun(
      `INSERT INTO bots (id, user_id, name, runtime, status, token, startup_command, working_directory, ram_mb, cpu_percent, uptime_ms, auto_restart, env_vars, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.session.userId!, name, runtime, 'stopped', token, startupCommand, workingDirectory || '.', autoRamMb, 0, 0, autoRestart ? 1 : 0, JSON.stringify(envVars || {}), now, now]
    );

    const row = dbGet('SELECT * FROM bots WHERE id = ?', [id]);
    res.status(201).json({ bot: sanitizeBot(row!) });
  } catch (err) {
    console.error('Create bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single bot
router.get('/:id', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    res.json({ bot: sanitizeBot(row) });
  } catch (err) {
    console.error('Get bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bot stats
router.get('/:id/stats', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }

    const bm = BotManager.getInstance();
    const stats = bm.getBotStats(req.params.id);
    res.json({ stats: stats || { cpu: 0, ram: 0, uptime: 0, status: row.status } });
  } catch (err) {
    console.error('Get bot stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bot logs (in-memory from BotManager)
router.get('/:id/logs', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT id FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }

    const botManager = BotManager.getInstance();
    const logs = botManager.getBotLogs(req.params.id);
    res.json({ logs });
  } catch (err) {
    console.error('Get bot logs error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bot
router.put('/:id', requireAuth, validate(updateBotSchema), (req, res) => {
  try {
    const existing = dbGet('SELECT id FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!existing) { res.status(404).json({ error: 'Bot not found' }); return; }

    const now = new Date().toISOString();
    const { name, startupCommand, ramMb, autoRestart, envVars } = req.body;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { setClauses.push('name = ?'); values.push(name); }
    if (startupCommand !== undefined) { setClauses.push('startup_command = ?'); values.push(startupCommand); }
    if (ramMb !== undefined) { setClauses.push('ram_mb = ?'); values.push(ramMb); }
    if (autoRestart !== undefined) { setClauses.push('auto_restart = ?'); values.push(autoRestart ? 1 : 0); }
    if (envVars !== undefined) { setClauses.push('env_vars = ?'); values.push(JSON.stringify(envVars)); }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(req.params.id);
      values.push(req.session.userId!);
      dbRun(`UPDATE bots SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`, values);
    }

    const row = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ bot: sanitizeBot(row!) });
  } catch (err) {
    console.error('Update bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete bot
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const existing = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!existing) { res.status(404).json({ error: 'Bot not found' }); return; }

    const bm = BotManager.getInstance();
    bm.stopBot(req.params.id);
    dbRun('DELETE FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start bot
router.post('/:id/start', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    if (row.status === 'running') { res.status(400).json({ error: 'Bot is already running' }); return; }

    const bm = BotManager.getInstance();
    const started = bm.startBot(req.params.id);
    if (!started) { res.status(500).json({ error: 'Failed to start bot' }); return; }

    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot started', bot: sanitizeBot(updated!) });
  } catch (err) {
    console.error('Start bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stop bot
router.post('/:id/stop', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }
    if (row.status === 'stopped') { res.status(400).json({ error: 'Bot is already stopped' }); return; }

    const bm = BotManager.getInstance();
    bm.stopBot(req.params.id);

    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot stopped', bot: sanitizeBot(updated!) });
  } catch (err) {
    console.error('Stop bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restart bot
router.post('/:id/restart', requireAuth, (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }

    const bm = BotManager.getInstance();
    bm.restartBot(req.params.id);

    const updated = dbGet('SELECT * FROM bots WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bot restarted', bot: sanitizeBot(updated!) });
  } catch (err) {
    console.error('Restart bot error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload files
router.post('/:id/upload-files', requireAuth, upload.array('files', 50), (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }

    const botDir = path.resolve(process.cwd(), 'bots', req.session.userId!, req.params.id);
    if (!fs.existsSync(botDir)) fs.mkdirSync(botDir, { recursive: true });

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) { res.status(400).json({ error: 'No files uploaded' }); return; }

    const uploaded: string[] = [];
    for (const file of files) {
      const destPath = path.join(botDir, file.originalname);
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      fs.renameSync(file.path, destPath);
      uploaded.push(file.originalname);
    }

    res.json({ uploaded });
  } catch (err) {
    console.error('Upload files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload ZIP
router.post('/:id/upload-zip', requireAuth, upload.single('file'), (req, res) => {
  try {
    const row = dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId!]);
    if (!row) { res.status(404).json({ error: 'Bot not found' }); return; }

    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    const botDir = path.resolve(process.cwd(), 'bots', req.session.userId!, req.params.id);
    if (!fs.existsSync(botDir)) fs.mkdirSync(botDir, { recursive: true });

    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(botDir, true);
    fs.unlinkSync(req.file.path);

    res.json({ message: 'ZIP extracted successfully' });
  } catch (err) {
    console.error('Upload ZIP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ads/active', requireAuth, (_req, res) => {
  try {
    const ads = dbAll(
      "SELECT id, title, description, image_url, link_url, button_text, current_uses, max_uses FROM bot_ads WHERE active = 1 AND (max_uses = 0 OR current_uses < max_uses) ORDER BY sort_order ASC LIMIT 5"
    );
    res.json({ ads });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ads' });
  }
});

router.post('/ads/:id/track', requireAuth, (req, res) => {
  try {
    const ad = dbGet('SELECT id, max_uses, current_uses FROM bot_ads WHERE id = ?', [req.params.id]);
    if (!ad) { res.status(404).json({ error: 'Ad not found' }); return; }
    dbRun('UPDATE bot_ads SET current_uses = current_uses + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to track ad' });
  }
});

export default router;
