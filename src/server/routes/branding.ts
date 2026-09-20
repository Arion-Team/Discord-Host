import { Router } from 'express';
import { dbAll, dbRun } from '../db/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const rows = dbAll('SELECT key, value FROM branding_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key as string] = row.value as string;
    }
    res.json({ settings });
  } catch (err) {
    console.error('Get branding error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', requireAdmin, (req, res) => {
  try {
    const now = new Date().toISOString();
    let updates: Record<string, string>;

    if (req.body.settings && typeof req.body.settings === 'object') {
      updates = req.body.settings;
    } else {
      updates = req.body;
    }

    for (const [key, value] of Object.entries(updates)) {
      const strValue = String(value);
      dbRun(
        'INSERT INTO branding_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?',
        [key, strValue, now, strValue, now]
      );
    }

    const rows = dbAll('SELECT key, value FROM branding_settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key as string] = row.value as string;
    }

    res.json({ settings });
  } catch (err) {
    console.error('Update branding error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
