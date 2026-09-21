import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import session from 'express-session';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { initDb, dbGet, dbRun } from './db/database.js';
import { BotManager } from './engine/BotManager.js';
import brandingRoutes from './routes/branding.js';
import plansRoutes from './routes/plans.js';

const DEMO_PORT = parseInt(process.env.DEMO_PORT || '3001', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'demo-secret';
const DEMO_DB_PATH = process.env.DEMO_DB_PATH || './data/demo.db';

async function main() {
  process.env.DB_PATH = DEMO_DB_PATH;
  await initDb();
  console.log('Demo database initialized');

  let demoUser = dbGet("SELECT * FROM users WHERE email = 'demo@discordhost.com'");
  if (!demoUser) {
    const id = uuidv4();
    const hash = bcrypt.hashSync('demo1234', 10);
    const now = new Date().toISOString();
    dbRun(
      'INSERT INTO users (id, email, username, password_hash, role, plan_id, storage_used_mb, suspended, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, 'demo@discordhost.com', 'Demo User', hash, 'user', null, 0, 0, 1, now, now]
    );
    demoUser = dbGet('SELECT * FROM users WHERE id = ?', [id]);
    console.log('Demo user created');
  }
  console.log(`Demo user: ${demoUser.email} (${demoUser.id})`);

  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      },
    })
  );

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
  });

  app.use((req, _res, next) => {
    (req as any).io = io;
    next();
  });

  // Auto-login: every request session is the demo user
  app.use((req, _res, next) => {
    req.session.userId = demoUser.id;
    next();
  });

  // Block destructive actions
  app.use('/api/bots', (req, res, next) => {
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      if (req.method === 'POST' && (req.path === '/' || req.path === '/import-github')) {
        return res.status(403).json({ error: 'Demo mode: bot creation disabled' });
      }
      if (req.method === 'DELETE') {
        return res.status(403).json({ error: 'Demo mode: deletion disabled' });
      }
      if (req.path.includes('/start') || req.path.includes('/stop') || req.path.includes('/restart')) {
        return res.status(403).json({ error: 'Demo mode: bot control disabled' });
      }
    }
    next();
  });

  app.use('/api/admin', (req, res, next) => {
    if (['PUT', 'POST', 'DELETE'].includes(req.method)) {
      return res.status(403).json({ error: 'Demo mode: admin changes disabled' });
    }
    next();
  });

  // Minimal auth endpoints for demo
  app.get('/api/auth/me', (_req, res) => {
    res.json({
      user: {
        id: demoUser.id,
        email: demoUser.email,
        username: demoUser.username,
        role: demoUser.role,
        planId: demoUser.plan_id,
        storageUsedMb: demoUser.storage_used_mb,
        suspended: false,
        createdAt: demoUser.created_at,
        updatedAt: demoUser.updated_at,
      },
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });

  // Minimal endpoints for demo browsing
  app.get('/api/auth/setup-check', (_req, res) => res.json({ setupRequired: false }));
  app.get('/api/auth/demo-check', (_req, res) => res.json({ demoMode: true }));

  app.use('/api/branding', brandingRoutes);
  app.use('/api/plans', plansRoutes);

  // Bot listing (read-only)
  app.get('/api/bots', (req, res) => {
    try {
      const bots = dbRun ? require('./db/database.js').dbAll('SELECT * FROM bots WHERE user_id = ?', [demoUser.id]) : [];
      res.json({ bots: (bots || []).map((b: any) => ({
        id: b.id, name: b.name, status: 'stopped', ramMb: b.ram_mb,
        createdAt: b.created_at, updatedAt: b.updated_at,
      }))});
    } catch { res.json({ bots: [] }); }
  });

  app.get('/api/bots/ads/active', (_req, res) => {
    try {
      const ads = require('./db/database.js').dbAll('SELECT * FROM bot_ads WHERE active = 1 ORDER BY created_at DESC') || [];
      res.json({ ads });
    } catch { res.json({ ads: [] }); }
  });

  app.get('/api/bots/:id', (req, res) => {
    try {
      const bot = require('./db/database.js').dbGet('SELECT * FROM bots WHERE id = ? AND user_id = ?', [req.params.id, demoUser.id]);
      if (!bot) return res.status(404).json({ error: 'Bot not found' });
      res.json({ bot: { ...bot, status: 'stopped' } });
    } catch { res.status(404).json({ error: 'Bot not found' }); }
  });

  // System status
  app.get('/api/admin/system-status', (_req, res) => {
    const os = require('os');
    res.json({
      cpu: { model: os.cpus()[0]?.model || 'Unknown', cores: os.cpus().length, usage: 0 },
      memory: { totalMb: Math.round(os.totalmem() / 1024 / 1024), usedMb: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024), freeMb: Math.round(os.freemem() / 1024 / 1024) },
      platform: os.platform(), uptime: os.uptime(),
    });
  });

  // Serve frontend
  const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  io.on('connection', (socket) => {
    socket.on('join-bot', (botId: string) => socket.join(`bot:${botId}`));
    socket.on('leave-bot', (botId: string) => socket.leave(`bot:${botId}`));
    socket.on('disconnect', () => {});
  });

  const botManager = BotManager.getInstance();
  botManager.setSocketIO(io);
  botManager.initialize();

  server.listen(DEMO_PORT, () => {
    console.log(`\n  DiscordHost Demo running on http://localhost:${DEMO_PORT}`);
    console.log(`  Demo user auto-logged in: ${demoUser.email}\n`);
  });
}

main().catch((err) => {
  console.error('Failed to start demo server:', err);
  process.exit(1);
});
