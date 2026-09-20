import { initDb, dbRun, dbGet } from './database.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const now = () => new Date().toISOString();

async function seed() {
  console.log('Initializing database...');
  const db = await initDb();

  const adminId = uuidv4();
  const starterPlanId = uuidv4();
  const proPlanId = uuidv4();
  const premiumPlanId = uuidv4();
  const superAdminRoleId = uuidv4();
  const moderatorRoleId = uuidv4();

  const existing = dbGet('SELECT id FROM users WHERE id = ?', [adminId]);
  if (!existing) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    dbRun(
      'INSERT INTO users (id, email, username, password_hash, role, plan_id, storage_used_mb, suspended, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, 'admin@discordhost.com', 'admin', adminHash, 'admin', null, 0, 0, now(), now()]
    );
    console.log('Created admin user (admin@discordhost.com / admin123)');

    const ts = now();

    dbRun(
      'INSERT INTO hosting_plans (id, name, description, price_cents, ram_mb, cpu_percent, storage_mb, max_bots, features, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [starterPlanId, 'Starter', 'Perfect for getting started with one bot', 500, 512, 25, 1024, 1, JSON.stringify(['1 Bot', '512MB RAM', '25% CPU', '1GB Storage', 'Basic Support']), 1, 1, ts]
    );
    dbRun(
      'INSERT INTO hosting_plans (id, name, description, price_cents, ram_mb, cpu_percent, storage_mb, max_bots, features, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [proPlanId, 'Pro', 'Ideal for running multiple bots with more resources', 1500, 1024, 50, 5120, 5, JSON.stringify(['5 Bots', '1GB RAM', '50% CPU', '5GB Storage', 'Priority Support', 'Auto Restart']), 1, 2, ts]
    );
    dbRun(
      'INSERT INTO hosting_plans (id, name, description, price_cents, ram_mb, cpu_percent, storage_mb, max_bots, features, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [premiumPlanId, 'Premium', 'Maximum performance for serious bot operators', 3000, 2048, 100, 20480, 25, JSON.stringify(['25 Bots', '2GB RAM', '100% CPU', '20GB Storage', '24/7 Support', 'Auto Restart', 'Custom Domains', 'API Access']), 1, 3, ts]
    );
    console.log('Created 3 hosting plans: Starter, Pro, Premium');

    const brandingEntries: [string, string][] = [
      ['siteName', 'DiscordHost'],
      ['siteLogo', ''],
      ['favicon', ''],
      ['backgroundImage', ''],
      ['bgColor', '#020617'],
      ['bgGradient', 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #0a111c 100%)'],
      ['primaryColor', '#3b82f6'],
      ['accentColor', '#8b5cf6'],
      ['theme', 'dark'],
      ['loginSubtitle', 'Professional Discord Bot Hosting'],
      ['registrationEnabled', 'true'],
      ['footerText', 'DiscordHost'],
      ['supportUrl', ''],
      ['seoTitle', 'DiscordHost - Discord Bot Hosting'],
      ['seoDescription', 'Professional Discord bot hosting platform'],
      ['announcementBanner', ''],
      ['announcementEnabled', 'false'],
    ];

    for (const [key, value] of brandingEntries) {
      dbRun('INSERT INTO branding_settings (key, value, updated_at) VALUES (?, ?, ?)', [key, value, ts]);
    }
    console.log('Created default branding settings');

    dbRun(
      'INSERT INTO admin_roles (id, name, permissions, created_at) VALUES (?, ?, ?, ?)',
      [superAdminRoleId, 'SuperAdmin', JSON.stringify(['users:read', 'users:write', 'users:delete', 'bots:read', 'bots:write', 'bots:delete', 'plans:read', 'plans:write', 'plans:delete', 'branding:read', 'branding:write', 'settings:read', 'settings:write', 'logs:read', 'roles:read', 'roles:write', 'roles:delete', 'admin:full']), ts]
    );

    dbRun(
      'INSERT INTO admin_roles (id, name, permissions, created_at) VALUES (?, ?, ?, ?)',
      [moderatorRoleId, 'Moderator', JSON.stringify(['users:read', 'bots:read', 'bots:write', 'plans:read', 'branding:read', 'logs:read']), ts]
    );
    console.log('Created admin roles: SuperAdmin, Moderator');
  } else {
    console.log('Database already seeded, skipping.');
  }

  console.log('Database seeded successfully!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
