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
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bots.js';
import adminRoutes from './routes/admin.js';
import brandingRoutes from './routes/branding.js';
import plansRoutes from './routes/plans.js';
import filesRoutes from './routes/files.js';

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

  // Auto-login: every request is the demo user
  app.use((req, _res, next) => {
    req.session.userId = demoUser.id;
    next();
  });

  // Override auth endpoints for demo
  app.get('/api/auth/me', (_req, res) => {
    const user = dbGet('SELECT id, email, username, role, plan_id, storage_used_mb, suspended, created_at, updated_at FROM users WHERE id = ?', [demoUser.id]);
    res.json({ user });
  });

  app.get('/api/auth/setup-check', (_req, res) => res.json({ setupRequired: false }));
  app.get('/api/auth/demo-check', (_req, res) => res.json({ demoMode: true }));

  // Use all main server routes (auto-logged-in session handles auth)
  app.use('/api/auth', authRoutes);
  app.use('/api/bots', botRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/branding', brandingRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/files', filesRoutes);

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
