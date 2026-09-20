import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbRun, dbAll } from '../db/database.js';

let client: Client | null = null;

function getPanelUrl(): string {
  return process.env.PANEL_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function logActivity(userId: string | null, action: string, details: string) {
  dbRun(
    'INSERT INTO activity_logs (id, user_id, action, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, action, details, 'discord-bot', new Date().toISOString()]
  );
}

function findUserByDiscordId(discordId: string) {
  return dbGet('SELECT * FROM users WHERE discord_id = ?', [discordId]);
}

function getDiscordAdminIds(): string[] {
  const row = dbGet("SELECT value FROM system_settings WHERE key = 'discordAdminIds'");
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function isAdminDiscord(discordId: string): boolean {
  const adminIds = getDiscordAdminIds();
  if (adminIds.includes(discordId)) return true;
  const user = dbGet('SELECT role FROM users WHERE discord_id = ?', [discordId]);
  return user?.role === 'admin';
}

function linkDiscordToUser(userId: string, discordId: string, discordTag: string, avatar: string | null, banner: string | null, displayName: string | null) {
  dbRun('UPDATE users SET discord_id = ?, discord_tag = ?, discord_avatar = ?, discord_banner = ?, discord_display_name = ?, updated_at = ? WHERE id = ?',
    [discordId, discordTag, avatar, banner, displayName, new Date().toISOString(), userId]);
}

function isDiscordAlreadyLinked(discordId: string): { linked: boolean; email?: string } {
  const existing = dbGet('SELECT email FROM users WHERE discord_id = ? AND discord_id IS NOT NULL', [discordId]);
  if (existing) return { linked: true, email: existing.email as string };
  return { linked: false };
}

function getAutoRamMb(planId: string | null): number {
  if (!planId) return 256;
  const plan = dbGet('SELECT ram_mb FROM hosting_plans WHERE id = ?', [planId]);
  return plan?.ram_mb || 256;
}

function getMaxBots(planId: string | null): number {
  if (!planId) return 3;
  const plan = dbGet('SELECT max_bots FROM hosting_plans WHERE id = ?', [planId]);
  return plan?.max_bots || 3;
}

const commands = [
  new SlashCommandBuilder().setName('verify').setDescription('Link your Discord account to the panel')
    .addStringOption(opt => opt.setName('code').setDescription('6-digit code from the panel'))
    .addStringOption(opt => opt.setName('email').setDescription('Your panel email (legacy flow)')),

  new SlashCommandBuilder().setName('create').setDescription('Create a new bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true))
    .addStringOption(opt => opt.setName('runtime').setDescription('Runtime').addChoices(
      { name: 'Node.js', value: 'node' }, { name: 'Python', value: 'python' }
    ).setRequired(true))
    .addStringOption(opt => opt.setName('token').setDescription('Bot token').setRequired(true))
    .addStringOption(opt => opt.setName('startup').setDescription('Startup command').setRequired(true)),

  new SlashCommandBuilder().setName('delete').setDescription('Delete a bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),

  new SlashCommandBuilder().setName('start').setDescription('Start a bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),

  new SlashCommandBuilder().setName('stop').setDescription('Stop a bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),

  new SlashCommandBuilder().setName('status').setDescription('Check bot status')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name')),

  new SlashCommandBuilder().setName('bots').setDescription('List all your bots'),
  new SlashCommandBuilder().setName('resources').setDescription('Check your resource usage and plan'),

  // Admin commands
  new SlashCommandBuilder().setName('admin-users').setDescription('[Admin] List all users'),
  new SlashCommandBuilder().setName('admin-bots').setDescription('[Admin] List all bots on the platform'),
  new SlashCommandBuilder().setName('admin-stats').setDescription('[Admin] System statistics'),

  new SlashCommandBuilder().setName('admin-suspend').setDescription('[Admin] Suspend a user')
    .addStringOption(opt => opt.setName('email').setDescription('User email').setRequired(true)),
  new SlashCommandBuilder().setName('admin-unsuspend').setDescription('[Admin] Unsuspend a user')
    .addStringOption(opt => opt.setName('email').setDescription('User email').setRequired(true)),

  new SlashCommandBuilder().setName('admin-bot-start').setDescription('[Admin] Start any bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),
  new SlashCommandBuilder().setName('admin-bot-stop').setDescription('[Admin] Stop any bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),
  new SlashCommandBuilder().setName('admin-bot-delete').setDescription('[Admin] Delete any bot')
    .addStringOption(opt => opt.setName('name').setDescription('Bot name').setRequired(true)),

  new SlashCommandBuilder().setName('admin-logs').setDescription('[Admin] Recent activity logs')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of logs (default 10)').setMinValue(1).setMaxValue(50)),
  new SlashCommandBuilder().setName('admin-broadcast').setDescription('[Admin] Broadcast announcement to all users')
    .addStringOption(opt => opt.setName('message').setDescription('Message to broadcast').setRequired(true)),
  new SlashCommandBuilder().setName('admin-backup').setDescription('[Admin] Create database backup'),
  new SlashCommandBuilder().setName('admin-maintenance').setDescription('[Admin] Toggle maintenance mode'),

  new SlashCommandBuilder().setName('admin-addid').setDescription('[Admin] Add a Discord user as admin')
    .addStringOption(opt => opt.setName('user-id').setDescription('Discord user ID').setRequired(true)),
  new SlashCommandBuilder().setName('admin-removeid').setDescription('[Admin] Remove a Discord admin')
    .addStringOption(opt => opt.setName('user-id').setDescription('Discord user ID').setRequired(true)),
  new SlashCommandBuilder().setName('admin-listids').setDescription('[Admin] List all Discord admin IDs'),
];

export async function startDiscordBot() {
  let token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    const row = dbGet("SELECT value FROM system_settings WHERE key = 'discordToken'");
    token = row?.value;
  }
  if (!token) {
    console.log('[Discord] No bot token found, bot not starting');
    return;
  }

  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
  });

  client.once('ready', async () => {
    console.log(`[Discord] Bot logged in as ${client!.user!.tag}`);
    const rest = new REST({ version: '10' }).setToken(token!);
    try {
      await rest.put(Routes.applicationCommands(client!.user!.id), { body: commands.map(c => c.toJSON()) });
      console.log('[Discord] Slash commands registered');
    } catch (err) {
      console.error('[Discord] Failed to register commands:', err);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, user, options } = interaction;

    // === USER COMMANDS ===

    if (commandName === 'verify') {
      const code = options.getString('code');
      const email = options.getString('email');

      if (code && !email) {
        const allRows = dbAll("SELECT key, value FROM system_settings WHERE key LIKE 'verify-discord:%'");
        let matchedKey: string | null = null;
        let matchedData: any = null;
        let targetUserId: string | null = null;

        for (const row of allRows) {
          try {
            const d = JSON.parse(row.value as string);
            if (d.code === code) {
              matchedKey = row.key as string;
              matchedData = d;
              targetUserId = (row.key as string).replace('verify-discord:', '');
              break;
            }
          } catch {}
        }

        if (!matchedKey || !matchedData || !targetUserId) {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Invalid or expired code. Generate a new one in panel Settings.')], ephemeral: true }); return;
        }
        if (new Date(matchedData.expiresAt) < new Date()) {
          dbRun('DELETE FROM system_settings WHERE key = ?', [matchedKey]);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Code expired. Generate a new one in panel Settings.')], ephemeral: true }); return;
        }

        const targetUser = dbGet('SELECT * FROM users WHERE id = ?', [targetUserId]);
        if (!targetUser) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('User not found.')], ephemeral: true }); return; }

        const alreadyLinked = isDiscordAlreadyLinked(user.id);
        if (alreadyLinked.linked && alreadyLinked.email !== targetUser.email) {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`This Discord account is already linked to **${alreadyLinked.email}**.`)], ephemeral: true }); return;
        }

        let avatarUrl: string | null = null;
        let bannerUrl: string | null = null;
        let displayName: string | null = null;
        try {
          const res = await fetch('https://discord.com/api/v10/users/' + user.id, { headers: { Authorization: `Bot ${token}` } });
          if (res.ok) {
            const data = await res.json();
            displayName = data.global_name || data.username;
            if (data.avatar) { const ext = data.avatar.startsWith('a_') ? 'gif' : 'png'; avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${data.avatar}.${ext}?size=256`; }
            if (data.banner) { const ext = data.banner.startsWith('a_') ? 'gif' : 'png'; bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${data.banner}.${ext}?size=600`; }
          }
        } catch {}

        linkDiscordToUser(targetUser.id as string, user.id, user.tag, avatarUrl, bannerUrl, displayName);
        dbRun('DELETE FROM system_settings WHERE key = ?', [matchedKey]);
        logActivity(targetUser.id as string, 'discord_linked', `Discord ${user.tag} linked`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('Account Linked!').setDescription(`Linked to **${targetUser.username}** (${targetUser.email})`)] });

      } else if (email && code) {
        const targetUser = dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!targetUser) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('No account found with that email.')], ephemeral: true }); return; }
        const stored = dbGet("SELECT value FROM system_settings WHERE key = ?", [`verify-discord:${targetUser.id}`]);
        if (!stored) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('No pending verification. Generate a code in panel Settings first.')], ephemeral: true }); return; }
        const data = JSON.parse(stored.value as string);
        if (new Date(data.expiresAt) < new Date()) { dbRun('DELETE FROM system_settings WHERE key = ?', [`verify-discord:${targetUser.id}`]); await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Code expired.')], ephemeral: true }); return; }
        if (data.code !== code) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Invalid code.')], ephemeral: true }); return; }
        const alreadyLinked2 = isDiscordAlreadyLinked(user.id);
        if (alreadyLinked2.linked && alreadyLinked2.email !== targetUser.email) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`This Discord is already linked to **${alreadyLinked2.email}**.`)], ephemeral: true }); return; }
        let av2: string | null = null; let bn2: string | null = null; let dn2: string | null = null;
        try { const res = await fetch('https://discord.com/api/v10/users/' + user.id, { headers: { Authorization: `Bot ${token}` } }); if (res.ok) { const d = await res.json(); dn2 = d.global_name || d.username; if (d.avatar) { const ext = d.avatar.startsWith('a_') ? 'gif' : 'png'; av2 = `https://cdn.discordapp.com/avatars/${user.id}/${d.avatar}.${ext}?size=256`; } if (d.banner) { const ext = d.banner.startsWith('a_') ? 'gif' : 'png'; bn2 = `https://cdn.discordapp.com/banners/${user.id}/${d.banner}.${ext}?size=600`; } } } catch {}
        linkDiscordToUser(targetUser.id as string, user.id, user.tag, av2, bn2, dn2);
        dbRun('DELETE FROM system_settings WHERE key = ?', [`verify-discord:${targetUser.id}`]);
        logActivity(targetUser.id as string, 'discord_linked', `Discord ${user.tag} linked`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('Account Linked!').setDescription(`Linked to **${targetUser.username}** (${targetUser.email})`)] });

      } else {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Link Your Account').setDescription('**Step 1:** Go to panel Settings → Discord Profile → Click "Link Discord Account"\n**Step 2:** Copy the 6-digit code\n**Step 3:** Run `/verify code:YOUR_CODE`').setFooter({ text: 'One code per account. Expires in 15 min.' })], ephemeral: true });
      }
    }

    if (commandName === 'create') {
      const linked = findUserByDiscordId(user.id);
      if (!linked) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Run `/verify` first.')], ephemeral: true }); return; }
      const botName = options.getString('name', true);
      const runtime = options.getString('runtime', true);
      const token = options.getString('token', true);
      const startup = options.getString('startup', true);

      if (dbGet('SELECT id FROM bots WHERE user_id = ? AND name = ?', [linked.id, botName])) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Bot **${botName}** already exists.`)], ephemeral: true }); return; }
      const count = dbGet('SELECT COUNT(*) as count FROM bots WHERE user_id = ?', [linked.id]);
      if ((count?.count || 0) >= getMaxBots(linked.plan_id as string)) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`Bot limit reached.`)], ephemeral: true }); return; }

      const autoRam = getAutoRamMb(linked.plan_id as string);
      const id = uuidv4(); const now = new Date().toISOString();
      dbRun(`INSERT INTO bots (id, user_id, name, runtime, status, token, startup_command, working_directory, ram_mb, cpu_percent, uptime_ms, auto_restart, env_vars, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, linked.id, botName, runtime, 'stopped', token, startup, '.', autoRam, 0, 0, 1, '{}', now, now]);
      logActivity(linked.id, 'create_bot', `Bot "${botName}" created via Discord`);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('Bot Created!').setDescription(`**${botName}** (${runtime})`).addFields({ name: 'RAM', value: `${autoRam} MB`, inline: true }, { name: 'Status', value: 'Stopped', inline: true })] });
    }

    if (commandName === 'delete') {
      const linked = findUserByDiscordId(user.id);
      if (!linked) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Run `/verify` first.')], ephemeral: true }); return; }
      const bot = dbGet('SELECT id, status FROM bots WHERE user_id = ? AND name = ?', [linked.id, options.getString('name', true)]);
      if (!bot) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Bot not found.')], ephemeral: true }); return; }
      if (bot.status === 'running') { const { BotManager } = await import('../engine/BotManager.js'); BotManager.getInstance().stopBot(bot.id as string); }
      dbRun('DELETE FROM bots WHERE id = ?', [bot.id]);
      logActivity(linked.id, 'delete_bot', `Bot "${options.getString('name', true)}" deleted`);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`**${options.getString('name', true)}** deleted.`)] });
    }

    if (commandName === 'start' || commandName === 'stop') {
      const linked = findUserByDiscordId(user.id);
      if (!linked) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Run `/verify` first.')], ephemeral: true }); return; }
      const bot = dbGet('SELECT id, status FROM bots WHERE user_id = ? AND name = ?', [linked.id, options.getString('name', true)]);
      if (!bot) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Bot not found.')], ephemeral: true }); return; }
      const { BotManager } = await import('../engine/BotManager.js');
      if (commandName === 'start') {
        if (bot.status === 'running') { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('Already running.')], ephemeral: true }); return; }
        BotManager.getInstance().startBot(bot.id as string);
        logActivity(linked.id, 'start_bot', `Bot "${options.getString('name', true)}" started`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`**${options.getString('name', true)}** started.`)] });
      } else {
        BotManager.getInstance().stopBot(bot.id as string);
        logActivity(linked.id, 'stop_bot', `Bot "${options.getString('name', true)}" stopped`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`**${options.getString('name', true)}** stopped.`)] });
      }
    }

    if (commandName === 'status' || commandName === 'bots') {
      const linked = findUserByDiscordId(user.id);
      if (!linked) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Run `/verify` first.')], ephemeral: true }); return; }
      const botName = options.getString('name');
      const bots = botName ? dbAll('SELECT name, runtime, status, ram_mb, uptime_ms FROM bots WHERE user_id = ? AND name = ?', [linked.id, botName]) : dbAll('SELECT name, runtime, status, ram_mb, uptime_ms FROM bots WHERE user_id = ?', [linked.id]);
      if (!bots?.length) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('No bots found.')], ephemeral: true }); return; }
      const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('Your Bots');
      for (const b of bots) { const e = b.status === 'running' ? '🟢' : b.status === 'crashed' ? '🔴' : '⚪'; embed.addFields({ name: `${e} ${b.name}`, value: `${b.runtime} | ${b.ram_mb}MB | ${b.status}`, inline: false }); }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'resources') {
      const linked = findUserByDiscordId(user.id);
      if (!linked) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Run `/verify` first.')], ephemeral: true }); return; }
      const plan = dbGet('SELECT name, ram_mb, storage_mb, max_bots FROM hosting_plans WHERE id = ?', [linked.plan_id]);
      const botCount = dbGet('SELECT COUNT(*) as count FROM bots WHERE user_id = ?', [linked.id]);
      const totalRam = dbGet('SELECT COALESCE(SUM(ram_mb), 0) as total FROM bots WHERE user_id = ?', [linked.id]);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('Resources').addFields(
        { name: 'Plan', value: plan?.name || 'Free', inline: true },
        { name: 'Bots', value: `${botCount?.count || 0} / ${plan?.max_bots || 3}`, inline: true },
        { name: 'RAM', value: `${totalRam?.total || 0} / ${plan?.ram_mb || 256} MB`, inline: true },
        { name: 'Storage', value: `${linked.storage_used_mb || 0} / ${plan?.storage_mb || 5120} MB`, inline: true },
      )], ephemeral: true });
    }

    // === ADMIN COMMANDS ===

    if (commandName.startsWith('admin-')) {
      if (!isAdminDiscord(user.id)) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Admin only.')], ephemeral: true }); return; }

      if (commandName === 'admin-users') {
        const users = dbAll('SELECT id, email, username, role, suspended, email_verified, discord_tag, created_at FROM users ORDER BY created_at DESC');
        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`Users (${users.length})`);
        for (const u of users.slice(0, 25)) {
          const flags = [];
          if (u.role === 'admin') flags.push('👑');
          if (u.suspended) flags.push('🚫');
          if (u.email_verified) flags.push('✅');
          if (u.discord_tag) flags.push('💬');
          embed.addFields({ name: `${u.username}`, value: `${u.email} ${flags.join(' ')}`, inline: true });
        }
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'admin-bots') {
        const bots = dbAll('SELECT b.name, b.runtime, b.status, b.ram_mb, u.username as owner FROM bots b LEFT JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC');
        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`All Bots (${bots.length})`);
        for (const b of bots.slice(0, 25)) {
          const e = b.status === 'running' ? '🟢' : b.status === 'crashed' ? '🔴' : '⚪';
          embed.addFields({ name: `${e} ${b.name}`, value: `Owner: ${b.owner} | ${b.runtime} | ${b.ram_mb}MB | ${b.status}`, inline: false });
        }
        if (!bots.length) embed.setDescription('No bots on the platform.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'admin-stats') {
        const totalUsers = dbGet('SELECT COUNT(*) as c FROM users')?.c || 0;
        const totalBots = dbGet('SELECT COUNT(*) as c FROM bots')?.c || 0;
        const runningBots = dbGet("SELECT COUNT(*) as c FROM bots WHERE status = 'running'")?.c || 0;
        const crashedBots = dbGet("SELECT COUNT(*) as c FROM bots WHERE status = 'crashed'")?.c || 0;
        const os = require('os');
        const mem = Math.round((1 - os.freemem() / os.totalmem()) * 100);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('System Stats').addFields(
          { name: 'Users', value: `${totalUsers}`, inline: true },
          { name: 'Total Bots', value: `${totalBots}`, inline: true },
          { name: 'Running', value: `${runningBots}`, inline: true },
          { name: 'Crashed', value: `${crashedBots}`, inline: true },
          { name: 'RAM Usage', value: `${mem}%`, inline: true },
          { name: 'Node', value: process.version, inline: true },
        )], ephemeral: true });
      }

      if (commandName === 'admin-suspend') {
        const email = options.getString('email', true);
        const u = dbGet('SELECT id, username FROM users WHERE email = ?', [email]);
        if (!u) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('User not found.')], ephemeral: true }); return; }
        dbRun('UPDATE users SET suspended = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), u.id]);
        logActivity(u.id as string, 'suspended', `Suspended by admin via Discord`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`**${u.username}** suspended.`)] });
      }

      if (commandName === 'admin-unsuspend') {
        const email = options.getString('email', true);
        const u = dbGet('SELECT id, username FROM users WHERE email = ?', [email]);
        if (!u) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('User not found.')], ephemeral: true }); return; }
        dbRun('UPDATE users SET suspended = 0, updated_at = ? WHERE id = ?', [new Date().toISOString(), u.id]);
        logActivity(u.id as string, 'unsuspended', `Unsuspended by admin via Discord`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`**${u.username}** unsuspended.`)] });
      }

      if (commandName === 'admin-bot-start' || commandName === 'admin-bot-stop' || commandName === 'admin-bot-delete') {
        const botName = options.getString('name', true);
        const bot = dbGet('SELECT id, status, user_id FROM bots WHERE name = ?', [botName]);
        if (!bot) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Bot not found.')], ephemeral: true }); return; }
        const { BotManager } = await import('../engine/BotManager.js');

        if (commandName === 'admin-bot-start') {
          BotManager.getInstance().startBot(bot.id as string);
          logActivity(bot.user_id as string, 'admin_start', `Admin started bot "${botName}"`);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setDescription(`**${botName}** started.`)] });
        } else if (commandName === 'admin-bot-stop') {
          BotManager.getInstance().stopBot(bot.id as string);
          logActivity(bot.user_id as string, 'admin_stop', `Admin stopped bot "${botName}"`);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`**${botName}** stopped.`)] });
        } else {
          if (bot.status === 'running') BotManager.getInstance().stopBot(bot.id as string);
          dbRun('DELETE FROM bots WHERE id = ?', [bot.id]);
          logActivity(bot.user_id as string, 'admin_delete', `Admin deleted bot "${botName}"`);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`**${botName}** deleted.`)] });
        }
      }

      if (commandName === 'admin-logs') {
        const limit = options.getInteger('limit') || 10;
        const logs = dbAll('SELECT a.action, a.details, a.created_at, u.username FROM activity_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ?', [limit]);
        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`Activity Logs (last ${limit})`);
        for (const l of logs) { embed.addFields({ name: `${l.action}`, value: `${l.username || 'system'}: ${l.details}\n${new Date(l.created_at as string).toLocaleString()}`, inline: false }); }
        if (!logs.length) embed.setDescription('No logs.');
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'admin-broadcast') {
        const message = options.getString('message', true);
        const now = new Date().toISOString();
        dbRun('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)', ['broadcast', JSON.stringify({ title: 'Admin Announcement', message, createdAt: now }), now]);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('Broadcast Sent').setDescription(message)] });
      }

      if (commandName === 'admin-backup') {
        const fs = require('fs'); const path = require('path');
        const dbPath = path.resolve(process.cwd(), 'data', 'discordhost.db');
        const backupDir = path.resolve(process.cwd(), 'data', 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupFile = path.join(backupDir, `backup-${timestamp}.db`);
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, backupFile);
          const size = (fs.statSync(backupFile).size / 1024).toFixed(1);
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('Backup Created').addFields({ name: 'File', value: `backup-${timestamp}.db`, inline: true }, { name: 'Size', value: `${size} KB`, inline: true })] });
        } else {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription('Database not found.')], ephemeral: true });
        }
      }

      if (commandName === 'admin-maintenance') {
        const current = dbGet("SELECT value FROM system_settings WHERE key = 'maintenanceMode'")?.value;
        const newValue = current === 'true' ? 'false' : 'true';
        dbRun('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
          ['maintenanceMode', newValue, new Date().toISOString(), newValue, new Date().toISOString()]);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(newValue === 'true' ? 0xffa500 : 0x00ff00).setDescription(`Maintenance mode **${newValue === 'true' ? 'ON' : 'OFF'}**.`)] });
      }

      if (commandName === 'admin-addid') {
        const targetId = options.getString('user-id', true);
        const ids = getDiscordAdminIds();
        if (ids.includes(targetId)) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription(`\`${targetId}\` is already a Discord admin.`)], ephemeral: true }); return; }
        ids.push(targetId);
        dbRun('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
          ['discordAdminIds', JSON.stringify(ids), new Date().toISOString(), JSON.stringify(ids), new Date().toISOString()]);
        logActivity(null, 'admin_add_discord_id', `Added Discord admin: ${targetId}`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00ff00).setTitle('Discord Admin Added').setDescription(`\`${targetId}\` is now a Discord admin.`).addFields({ name: 'Total admins', value: `${ids.length}`, inline: true })] });
      }

      if (commandName === 'admin-removeid') {
        const targetId = options.getString('user-id', true);
        const ids = getDiscordAdminIds();
        if (!ids.includes(targetId)) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setDescription(`\`${targetId}\` is not a Discord admin.`)], ephemeral: true }); return; }
        const updated = ids.filter(id => id !== targetId);
        dbRun('INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
          ['discordAdminIds', JSON.stringify(updated), new Date().toISOString(), JSON.stringify(updated), new Date().toISOString()]);
        logActivity(null, 'admin_remove_discord_id', `Removed Discord admin: ${targetId}`);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xff0000).setTitle('Discord Admin Removed').setDescription(`\`${targetId}\` is no longer a Discord admin.`).addFields({ name: 'Total admins', value: `${updated.length}`, inline: true })] });
      }

      if (commandName === 'admin-listids') {
        const ids = getDiscordAdminIds();
        if (!ids.length) { await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xffa500).setDescription('No Discord admin IDs configured.')], ephemeral: true }); return; }
        const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('Discord Admin IDs').setDescription(ids.map(id => `\`${id}\``).join('\n')).setFooter({ text: `${ids.length} admin(s)` });
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  });

  try {
    await client.login(token);
  } catch (err) {
    console.error('[Discord] Login failed:', err);
  }
}

export function getDiscordClient() {
  return client;
}
