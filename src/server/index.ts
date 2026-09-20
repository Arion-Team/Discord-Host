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
import { initDb } from './db/database.js';
import { BotManager } from './engine/BotManager.js';
import authRoutes from './routes/auth.js';
import botRoutes from './routes/bots.js';
import adminRoutes from './routes/admin.js';
import brandingRoutes from './routes/branding.js';
import plansRoutes from './routes/plans.js';
import filesRoutes from './routes/files.js';
import { startDiscordBot } from './services/discord.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me-in-production';

async function main() {
  await initDb();
  console.log('Database initialized');

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
    cors: {
      origin: true,
      credentials: true,
    },
  });

  app.use((req, _res, next) => {
    (req as any).io = io;
    next();
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/bots', botRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/branding', brandingRoutes);
  app.use('/api/plans', plansRoutes);
  app.use('/api/files', filesRoutes);

  const clientDistPath = path.resolve(process.cwd(), 'dist', 'client');

  if (NODE_ENV === 'production' && fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      app.use(express.static(clientDistPath));
      app.get('*', (_req, res) => {
        res.sendFile(indexPath);
      });
    }
  }

  io.on('connection', (socket) => {
    console.log(`Socket.IO client connected: ${socket.id}`);

    socket.on('join-bot', (botId: string) => {
      socket.join(`bot:${botId}`);
    });

    socket.on('leave-bot', (botId: string) => {
      socket.leave(`bot:${botId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket.IO client disconnected: ${socket.id}`);
    });
  });

  const botManager = BotManager.getInstance();
  botManager.setSocketIO(io);
  botManager.initialize();

  server.listen(PORT, () => {
    console.log(`DiscordHost server running on http://localhost:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    startDiscordBot();
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
