import { ChildProcess, spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { dbGet, dbRun } from '../db/database.js';

interface RunningBot {
  process: ChildProcess;
  startedAt: number;
  logs: string[];
}

class BotManager {
  private static instance: BotManager;
  private runningBots: Map<string, RunningBot> = new Map();
  private io: any = null;

  private constructor() {}

  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  setSocketIO(io: any) {
    this.io = io;
  }

  private emitLog(botId: string, level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logId = crypto.randomUUID();
    dbRun(
      'INSERT INTO bot_logs (id, bot_id, level, message, timestamp) VALUES (?, ?, ?, ?, ?)',
      [logId, botId, level, message, timestamp]
    );

    if (this.io) {
      this.io.to(`bot:${botId}`).emit('bot-log', { botId, level, message, timestamp });
    }
  }

  private emitStatus(botId: string, status: string) {
    if (this.io) {
      this.io.to(`bot:${botId}`).emit('bot-status', { botId, status });
    }
  }

  startBot(botId: string): boolean {
    const bot = dbGet('SELECT * FROM bots WHERE id = ?', [botId]) as Record<string, any> | undefined;
    if (!bot) return false;

    if (this.runningBots.has(botId)) return true;

    const botDir = path.resolve(process.cwd(), 'bots', bot.user_id, bot.id);
    if (!fs.existsSync(botDir)) {
      fs.mkdirSync(botDir, { recursive: true });
    }

    const envVars: Record<string, string> = {};
    try {
      const parsed = JSON.parse(bot.env_vars || '{}');
      Object.assign(envVars, parsed);
    } catch {}

    envVars.BOT_ID = botId;
    envVars.NODE_ENV = 'production';

    if (!fs.existsSync(botDir) || fs.readdirSync(botDir).length === 0) {
      this.emitLog(botId, 'error', 'Bot directory is empty. Upload your bot files first via the File Manager.');
      dbRun("UPDATE bots SET status = 'stopped', updated_at = ? WHERE id = ?", [new Date().toISOString(), botId]);
      this.emitStatus(botId, 'stopped');
      return false;
    }

    const cwd = bot.working_directory && bot.working_directory !== './'
      ? path.resolve(botDir, bot.working_directory)
      : botDir;

    const runInstall = (): Promise<void> => {
      return new Promise((resolve) => {
        const hasPackageJson = fs.existsSync(path.join(cwd, 'package.json'));
        const hasRequirements = fs.existsSync(path.join(cwd, 'requirements.txt'));

        const installEnv = { ...process.env, ...envVars };
        delete installEnv.NODE_ENV;

        if (hasPackageJson) {
          this.emitLog(botId, 'info', 'Installing npm dependencies...');
          const install = spawn('npm', ['install', '--include=dev'], {
            cwd,
            env: installEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
          });
          install.stdout?.on('data', (d: Buffer) => {
            d.toString().split('\n').filter(Boolean).forEach((line) => this.emitLog(botId, 'info', line));
          });
          install.stderr?.on('data', (d: Buffer) => {
            d.toString().split('\n').filter(Boolean).forEach((line) => this.emitLog(botId, 'info', line));
          });
          install.on('close', () => resolve());
          install.on('error', () => resolve());
        } else if (hasRequirements) {
          this.emitLog(botId, 'info', 'Installing Python dependencies...');
          const install = spawn('pip', ['install', '-r', 'requirements.txt'], {
            cwd,
            env: installEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
          });
          install.stdout?.on('data', (d: Buffer) => {
            d.toString().split('\n').filter(Boolean).forEach((line) => this.emitLog(botId, 'info', line));
          });
          install.stderr?.on('data', (d: Buffer) => {
            d.toString().split('\n').filter(Boolean).forEach((line) => this.emitLog(botId, 'info', line));
          });
          install.on('close', () => resolve());
          install.on('error', () => resolve());
        } else {
          resolve();
        }
      });
    };

    const launchBot = () => {
      let command: string;
      let args: string[];

      if (bot.startup_command) {
        const parts = bot.startup_command.split(/\s+/);
        command = parts[0];
        args = parts.slice(1);
      } else if (bot.runtime === 'node') {
        command = 'node';
        args = ['index.js'];
      } else {
        command = 'python3';
        args = ['main.py'];
      }

      try {
        const child = spawn(command, args, {
          cwd,
          env: { ...process.env, ...envVars },
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: process.platform === 'win32',
        });

      const runningBot: RunningBot = {
        process: child,
        startedAt: Date.now(),
        logs: [],
      };

      child.stdout?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          runningBot.logs.push(msg);
          if (runningBot.logs.length > 1000) runningBot.logs.shift();
          this.emitLog(botId, 'info', msg);
        }
      });

      child.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          runningBot.logs.push(msg);
          if (runningBot.logs.length > 1000) runningBot.logs.shift();
          this.emitLog(botId, 'error', msg);
        }
      });

      child.on('error', (err) => {
        this.emitLog(botId, 'error', `Process error: ${err.message}`);
        this.handleBotCrash(botId);
      });

      child.on('exit', (code, signal) => {
        this.emitLog(botId, 'warn', `Process exited with code ${code}, signal ${signal}`);
        this.runningBots.delete(botId);
        const exitStatus = code === 0 || code === null ? 'stopped' : 'crashed';
        dbRun(`UPDATE bots SET status = '${exitStatus}', updated_at = ? WHERE id = ?`, [new Date().toISOString(), botId]);
        this.emitStatus(botId, exitStatus);

        const updatedBot = dbGet('SELECT auto_restart FROM bots WHERE id = ?', [botId]) as { auto_restart: number } | undefined;
        if (updatedBot?.auto_restart && code !== 0) {
          this.emitLog(botId, 'info', 'Auto-restarting bot...');
          setTimeout(() => this.startBot(botId), 3000);
        }
      });

      this.runningBots.set(botId, runningBot);
      dbRun("UPDATE bots SET status = 'running', updated_at = ? WHERE id = ?", [new Date().toISOString(), botId]);
      this.emitStatus(botId, 'running');
      this.emitLog(botId, 'info', `Bot ${bot.name} started successfully`);

      return true;
    } catch (err: any) {
      this.emitLog(botId, 'error', `Failed to start: ${err.message}`);
      dbRun("UPDATE bots SET status = 'crashed', updated_at = ? WHERE id = ?", [new Date().toISOString(), botId]);
      this.emitStatus(botId, 'crashed');
      return false;
    }
    };

    runInstall().then(() => launchBot());
    return true;
  }

  stopBot(botId: string): boolean {
    const running = this.runningBots.get(botId);
    if (running) {
      try {
        running.process.kill('SIGTERM');
        setTimeout(() => { try { running.process.kill('SIGKILL'); } catch {} }, 5000);
      } catch {}
      this.runningBots.delete(botId);
    }

    dbRun("UPDATE bots SET status = 'stopped', cpu_percent = 0, updated_at = ? WHERE id = ?", [new Date().toISOString(), botId]);
    this.emitStatus(botId, 'stopped');
    return true;
  }

  restartBot(botId: string): boolean {
    this.stopBot(botId);
    setTimeout(() => this.startBot(botId), 1000);
    return true;
  }

  private handleBotCrash(botId: string) {
    this.runningBots.delete(botId);
    dbRun("UPDATE bots SET status = 'crashed', updated_at = ? WHERE id = ?", [new Date().toISOString(), botId]);
    this.emitStatus(botId, 'crashed');
  }

  getRunningBots(): string[] {
    return Array.from(this.runningBots.keys());
  }

  getBotStats(botId: string): { cpu: number; ram: number; uptime: number; status: string } | null {
    const running = this.runningBots.get(botId);
    if (!running) return null;

    let cpu = 0;
    let ram = 0;
    try {
        if (running.process.pid) {
          if (process.platform === 'win32') {
          const output = execSync(`wmic process where ProcessId=${running.process.pid} get WorkingSetSize /value`, { encoding: 'utf-8' });
          const match = output.match(/WorkingSetSize=(\d+)/);
          if (match) ram = parseInt(match[1]) / 1024 / 1024;
        } else {
          const output = execSync(`ps -p ${running.process.pid} -o %cpu,%mem --no-headers`, { encoding: 'utf-8' }).trim();
          const parts = output.split(/\s+/);
          cpu = parseFloat(parts[0]) || 0;
          ram = parseFloat(parts[1]) || 0;
        }
      }
    } catch {}

    return { cpu, ram, uptime: Date.now() - running.startedAt, status: 'running' };
  }

  getBotLogs(botId: string): string[] {
    const running = this.runningBots.get(botId);
    return running?.logs || [];
  }

  initialize(): void {
    const bots = dbGet("SELECT COUNT(*) as count FROM bots WHERE status = 'running'") as { count: number };
    dbRun("UPDATE bots SET status = 'stopped', updated_at = ? WHERE status = 'running'", [new Date().toISOString()]);
    console.log(`BotManager initialized. ${bots.count || 0} bot(s) were running and reset.`);
  }
}

export { BotManager };
