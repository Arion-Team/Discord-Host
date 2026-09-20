import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const rows = dbAll('SELECT * FROM hosting_plans WHERE active = 1 ORDER BY sort_order ASC');
    const plans = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priceCents: row.price_cents,
      ramMb: row.ram_mb,
      cpuPercent: row.cpu_percent,
      storageMb: row.storage_mb,
      maxBots: row.max_bots,
      features: row.features,
      active: row.active === 1 || row.active === true,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
    }));
    res.json({ plans });
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAdmin, (req, res) => {
  try {
    const { name, description, priceCents, ramMb, cpuPercent, storageMb, maxBots, features, active, sortOrder } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    dbRun(
      'INSERT INTO hosting_plans (id, name, description, price_cents, ram_mb, cpu_percent, storage_mb, max_bots, features, active, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, name, description || '', priceCents, ramMb, cpuPercent, storageMb, maxBots, JSON.stringify(features || []), active !== false ? 1 : 0, sortOrder || 0, now]
    );

    const row = dbGet('SELECT * FROM hosting_plans WHERE id = ?', [id]);
    res.status(201).json({ plan: row });
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  try {
    const existing = dbGet('SELECT id FROM hosting_plans WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ error: 'Plan not found' }); return; }

    const { name, description, priceCents, ramMb, cpuPercent, storageMb, maxBots, features, active, sortOrder } = req.body;

    dbRun(
      'UPDATE hosting_plans SET name = ?, description = ?, price_cents = ?, ram_mb = ?, cpu_percent = ?, storage_mb = ?, max_bots = ?, features = ?, active = ?, sort_order = ? WHERE id = ?',
      [name, description || '', priceCents, ramMb, cpuPercent, storageMb, maxBots, JSON.stringify(features || []), active ? 1 : 0, sortOrder || 0, req.params.id]
    );

    const row = dbGet('SELECT * FROM hosting_plans WHERE id = ?', [req.params.id]);
    res.json({ plan: row });
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const existing = dbGet('SELECT id FROM hosting_plans WHERE id = ?', [req.params.id]);
    if (!existing) { res.status(404).json({ error: 'Plan not found' }); return; }
    dbRun('DELETE FROM hosting_plans WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
