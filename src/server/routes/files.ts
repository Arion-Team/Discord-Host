import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { requireAuth } from '../middleware/auth.js';
import { dbGet, dbRun } from '../db/database.js';

const router = Router();

const upload = multer({
  dest: path.resolve(process.cwd(), 'tmp', 'uploads'),
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '52428800') },
});

function getBotBase(userId: string, botId: string) {
  return path.resolve(process.cwd(), 'bots', userId, botId);
}

function safePath(base: string, relative: string): string | null {
  const fullPath = path.resolve(base, relative);
  if (!fullPath.startsWith(base)) return null;
  return fullPath;
}

function calcDirSize(dirPath: string): number {
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += calcDirSize(entryPath);
      } else {
        total += fs.statSync(entryPath).size;
      }
    }
  } catch {}
  return total;
}

router.get('/:botId', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const botsBase = getBotBase(req.session.userId!, botId);
    if (!fs.existsSync(botsBase)) {
      fs.mkdirSync(botsBase, { recursive: true });
    }
    const entries = fs.readdirSync(botsBase, { withFileTypes: true });
    const files = entries.map((entry) => {
      const entryStat = fs.statSync(path.join(botsBase, entry.name));
      return {
        name: entry.name,
        path: entry.name,
        isDirectory: entry.isDirectory(),
        size: entryStat.size,
        modifiedAt: entryStat.mtime.toISOString(),
      };
    });
    const storageUsed = calcDirSize(botsBase);
    res.json({ files, storageUsed });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:botId/browse/*', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = decodeURIComponent((req.params as any)[0] || '');
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, relativePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'Path not found' });
      return;
    }

    const stat = fs.statSync(fullPath);
    if (!stat.isDirectory()) {
      res.sendFile(fullPath);
      return;
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = entries.map((entry) => {
      const entryPath = path.join(fullPath, entry.name);
      const entryStat = fs.statSync(entryPath);
      return {
        name: entry.name,
        path: path.relative(botsBase, entryPath),
        isDirectory: entry.isDirectory(),
        size: entryStat.size,
        modifiedAt: entryStat.mtime.toISOString(),
      };
    });

    const storageUsed = calcDirSize(botsBase);
    res.json({ files, currentPath: relativePath, storageUsed });
  } catch (err) {
    console.error('Browse files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:botId/download/*', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = decodeURIComponent((req.params as any)[0] || '');
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, relativePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.download(fullPath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:botId/upload', requireAuth, upload.array('files', 20), (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = (req.body.path as string) || '';
    const botsBase = getBotBase(req.session.userId!, botId);
    const targetDir = safePath(botsBase, relativePath) || botsBase;

    if (!targetDir.startsWith(botsBase)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const uploaded: string[] = [];
    for (const file of files) {
      const destPath = path.join(targetDir, file.originalname);
      if (!destPath.startsWith(botsBase)) {
        fs.unlinkSync(file.path);
        continue;
      }
      fs.renameSync(file.path, destPath);
      uploaded.push(file.originalname);
    }

    res.json({ uploaded });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:botId/upload-zip', requireAuth, upload.single('file'), (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = (req.body.path as string) || '';
    const botsBase = getBotBase(req.session.userId!, botId);
    const targetDir = safePath(botsBase, relativePath) || botsBase;

    if (!targetDir.startsWith(botsBase)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const zip = new AdmZip(req.file.path);
    zip.extractAllTo(targetDir, true);
    fs.unlinkSync(req.file.path);

    res.json({ message: 'ZIP extracted successfully' });
  } catch (err) {
    console.error('Upload ZIP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:botId/mkdir', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const { name, parentPath } = req.body;
    const botsBase = getBotBase(req.session.userId!, botId);
    const targetDir = safePath(botsBase, parentPath || '') || botsBase;
    const newDir = path.join(targetDir, name);

    if (!newDir.startsWith(botsBase)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (fs.existsSync(newDir)) {
      res.status(409).json({ error: 'Folder already exists' });
      return;
    }

    fs.mkdirSync(newDir, { recursive: true });
    res.json({ message: 'Folder created' });
  } catch (err) {
    console.error('Mkdir error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:botId/rename', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const { oldPath, newName } = req.body;
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, oldPath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const newPath = path.join(path.dirname(fullPath), newName);
    if (!newPath.startsWith(botsBase)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (fs.existsSync(newPath)) {
      res.status(409).json({ error: 'Name already exists' });
      return;
    }

    fs.renameSync(fullPath, newPath);
    res.json({ message: 'Renamed successfully' });
  } catch (err) {
    console.error('Rename error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:botId/delete', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const { filePath } = req.body;
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, filePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (fullPath === botsBase) {
      res.status(400).json({ error: 'Cannot delete bot root directory' });
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:botId/read/*', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = decodeURIComponent((req.params as any)[0] || '');
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, relativePath);

    if (!fullPath || !fs.existsSync(fullPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const stat = fs.statSync(fullPath);
    if (stat.size > 1024 * 1024) {
      res.status(400).json({ error: 'File too large to edit' });
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ content, path: relativePath });
  } catch (err) {
    console.error('Read file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:botId/write/*', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const relativePath = decodeURIComponent((req.params as any)[0] || '');
    const botsBase = getBotBase(req.session.userId!, botId);
    const fullPath = safePath(botsBase, relativePath);

    if (!fullPath || !fullPath.startsWith(botsBase)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { content } = req.body;
    if (typeof content !== 'string') {
      res.status(400).json({ error: 'Invalid content' });
      return;
    }

    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, 'utf-8');
    res.json({ message: 'File saved' });
  } catch (err) {
    console.error('Write file error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:botId/search', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const query = (req.query.q as string || '').toLowerCase();
    const botsBase = getBotBase(req.session.userId!, botId);

    if (!query) {
      res.json({ results: [] });
      return;
    }

    const results: any[] = [];
    function searchDir(dir: string, relBase: string) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.toLowerCase().includes(query)) {
            const entryPath = path.join(dir, entry.name);
            const entryStat = fs.statSync(entryPath);
            results.push({
              name: entry.name,
              path: path.relative(botsBase, entryPath),
              isDirectory: entry.isDirectory(),
              size: entryStat.size,
              modifiedAt: entryStat.mtime.toISOString(),
            });
          }
          if (entry.isDirectory() && results.length < 100) {
            searchDir(path.join(dir, entry.name), path.join(relBase, entry.name));
          }
        }
      } catch {}
    }

    searchDir(botsBase, '');
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:botId/env-example', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const botsBase = getBotBase(req.session.userId!, botId);

    const envExamplePath = path.join(botsBase, '.env.example');
    const envPath = path.join(botsBase, '.env');
    const envExists = fs.existsSync(envPath);

    if (!fs.existsSync(envExamplePath)) {
      res.json({ exists: false, envExists, variables: [] });
      return;
    }

    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const variables: { key: string; defaultValue: string; line: string }[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        variables.push({ key, defaultValue: value, line: trimmed });
      }
    }

    res.json({ exists: true, envExists, variables });
  } catch (err) {
    console.error('Parse env-example error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:botId/env-create', requireAuth, (req, res) => {
  try {
    const { botId } = req.params;
    const botsBase = getBotBase(req.session.userId!, botId);
    const { values } = req.body as { values: Record<string, string> };

    if (!values || typeof values !== 'object') {
      res.status(400).json({ error: 'Invalid values' });
      return;
    }

    const envExamplePath = path.join(botsBase, '.env.example');
    let content = '';

    if (fs.existsSync(envExamplePath)) {
      const exampleContent = fs.readFileSync(envExamplePath, 'utf-8');
      const lines = exampleContent.split('\n');
      const result: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
        if (match && match[1] in values) {
          const val = values[match[1]];
          if (val.includes(' ') || val.includes('"')) {
            result.push(`${match[1]}="${val.replace(/"/g, '\\"')}"`);
          } else {
            result.push(`${match[1]}=${val}`);
          }
        } else {
          result.push(line);
        }
      }
      content = result.join('\n');
    } else {
      const lines: string[] = [];
      for (const [key, val] of Object.entries(values)) {
        if (val.includes(' ') || val.includes('"')) {
          lines.push(`${key}="${val.replace(/"/g, '\\"')}"`);
        } else {
          lines.push(`${key}=${val}`);
        }
      }
      content = lines.join('\n');
    }

    const envPath = path.join(botsBase, '.env');
    fs.writeFileSync(envPath, content + '\n', 'utf-8');

    res.json({ success: true });
  } catch (err) {
    console.error('Create env error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
