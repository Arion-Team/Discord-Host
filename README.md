# Discord-Host

A professional Discord bot hosting panel built with Node.js, React, TypeScript, Tailwind CSS, and SQLite. Manage Discord bots with a modern dark UI, Discord bot integration, and full admin controls.

## Features

### Bot Hosting
- Create and manage Discord bots (Node.js & Python)
- In-browser code editor with upload/download
- Real-time console logs
- Auto-restart on crash
- File manager with ZIP upload and GitHub import
- Per-bot RAM and CPU allocation
- Environment variable management (.env)

### Discord Bot Integration
- `/verify code:` - Link Discord account to panel
- `/create` `/delete` `/start` `/stop` - Manage bots from Discord
- `/status` `/bots` `/resources` - Check bot status
- Full admin commands (`/admin-users`, `/admin-bots`, `/admin-stats`, etc.)
- Discord admin IDs for panel management without linked accounts

### Admin Panel
- Dashboard with system stats (users, bots, RAM, CPU, storage)
- User management (suspend, unsuspend, roles)
- Hosting plan management (RAM, storage, bot limits)
- Bot ads system (create, edit, delete ads shown in bot section)
- Branding customization (logo, favicon, colors, background)
- Database backup and restore
- Maintenance mode
- Welcome animation toggle
- Email verification settings
- Broadcast announcements

### User Features
- Discord profile auto-show (avatar, banner, display name)
- API key management
- Password change
- 1 Discord = 1 panel account
- Auto RAM assignment based on plan

### UI/UX
- Pure black `#0a0a0a` theme with white accents
- Split-screen login/register with landscape imagery
- Cinematic canvas-based welcome animation
- Lazy-loaded pages with code splitting
- Discord-style sidebar navigation
- Responsive design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Node.js, Express, Socket.IO |
| Database | SQLite (sql.js - pure WASM, no native deps) |
| Discord | discord.js v14 |
| Auth | bcryptjs, express-session |
| Process | tsx (TypeScript execution) |

## Quick Start

```bash
# Clone
git clone https://github.com/Arion-Team/Discord-Host.git
cd Discord-Host

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your settings

# Build frontend
npx vite build

# Start
node node_modules/tsx/dist/cli.mjs src/server/index.ts
```

Default admin: `admin@discordhost.com` / `admin123`

## Environment Variables

```env
PORT=3000
SESSION_SECRET=your-secret-key
PANEL_URL=http://localhost:3000
DISCORD_BOT_TOKEN=your-discord-bot-token
```

## Production Deployment

```bash
# Install production dependencies only
npm install --omit=dev

# Build
npx vite build

# Start with PM2
pm2 start ecosystem.config.cjs

# Or start directly
NODE_ENV=production node node_modules/tsx/dist/cli.mjs src/server/index.ts
```

Use nginx/caddy as reverse proxy with HTTPS.

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application → Bot → Copy Token
3. Go to OAuth2 → URL Generator → Select `bot` + `applications.commands`
4. Scopes: `bot`, `applications.commands`
5. Bot Permissions: Send Messages, Read Message History, Use Slash Commands
6. Invite bot with generated URL
7. Paste token in Admin Settings → Discord Bot → Bot Token
8. Click "Start Bot"

## Commands

### User Commands
| Command | Description |
|---------|------------|
| `/verify code:` | Link Discord to panel account |
| `/create name: runtime: token: startup:` | Create a bot |
| `/delete name:` | Delete a bot |
| `/start name:` | Start a bot |
| `/stop name:` | Stop a bot |
| `/status name:` | Check bot status |
| `/bots` | List your bots |
| `/resources` | Check resource usage |

### Admin Commands
| Command | Description |
|---------|------------|
| `/admin-users` | List all users |
| `/admin-bots` | List all bots |
| `/admin-stats` | System statistics |
| `/admin-suspend email:` | Suspend a user |
| `/admin-unsuspend email:` | Unsuspend a user |
| `/admin-bot-start name:` | Start any bot |
| `/admin-bot-stop name:` | Stop any bot |
| `/admin-bot-delete name:` | Delete any bot |
| `/admin-addid user-id:` | Add Discord admin |
| `/admin-removeid user-id:` | Remove Discord admin |
| `/admin-listids` | List Discord admins |
| `/admin-logs` | Activity logs |
| `/admin-broadcast message:` | Broadcast announcement |
| `/admin-backup` | Database backup |
| `/admin-maintenance` | Toggle maintenance mode |

## RAM Usage

| Component | RAM |
|-----------|-----|
| Panel server (idle) | ~110-120MB |
| Per Node.js bot | ~50-80MB |
| Per Python bot | ~30-50MB |

A 4GB VPS can run the panel + ~30 Node.js bots.

## License

MIT
