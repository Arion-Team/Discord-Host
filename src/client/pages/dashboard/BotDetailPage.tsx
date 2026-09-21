import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Terminal,
  FolderOpen,
  Play,
  Square,
  RotateCw,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Cpu,
  MemoryStick,
  Clock,
  Save,
  X,
  FileKey,
  FileText,
} from 'lucide-react';
import api from '../../lib/api';

interface BotData {
  id: string;
  name: string;
  status: string;
  runtime: string;
  startupCommand: string;
  workingDirectory: string;
  ramMb: number;
  cpuPercent: number;
  uptimeMs: number;
  autoRestart: boolean;
  envVars: Record<string, string>;
  crashCount: number;
  lastCrashError: string | null;
  lastCrashAt: string | null;
  createdAt: string;
}

interface BotStats {
  cpu: number;
  ram: number;
  uptime: number;
  status: string;
}

interface EnvVariable {
  key: string;
  defaultValue: string;
  line: string;
}

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const BotDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotData | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [hasFiles, setHasFiles] = useState<boolean | null>(null);
  const [envSetup, setEnvSetup] = useState<{ show: boolean; variables: EnvVariable[]; envExists: boolean }>({ show: false, variables: [], envExists: true });
  const [envValues, setEnvValues] = useState<Record<string, string>>({});
  const [envSaving, setEnvSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartupCommand, setEditStartupCommand] = useState('');
  const [editRamMb, setEditRamMb] = useState(128);
  const [editAutoRestart, setEditAutoRestart] = useState(false);
  const [editEnvVars, setEditEnvVars] = useState<{ key: string; value: string }[]>([]);

  const fetchBot = useCallback(async () => {
    if (!id) return;
    try {
      const [botData, filesData] = await Promise.all([
        api.get(`/bots/${id}`),
        api.get(`/files/${id}`).catch(() => ({ files: [] })),
      ]);
      setBot(botData.bot);
      const fileCount = filesData.files?.length || 0;
      setHasFiles(fileCount > 0);

      if (fileCount > 0) {
        try {
          const envData = await api.get(`/files/${id}/env-example`);
          if (envData.exists && !envData.envExists) {
            setEnvSetup({ show: true, variables: envData.variables, envExists: false });
            const defaults: Record<string, string> = {};
            envData.variables.forEach((v: EnvVariable) => { defaults[v.key] = v.defaultValue; });
            setEnvValues(defaults);
          }
        } catch {}
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bot');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get(`/bots/${id}/stats`);
      setStats(data.stats);
    } catch {
      // stats might not be available yet
    }
  }, [id]);

  useEffect(() => {
    fetchBot();
    fetchStats();
  }, [fetchBot, fetchStats]);

  useEffect(() => {
    if (!id || bot?.status !== 'running') return;
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [id, bot?.status, fetchStats]);

  useEffect(() => {
    if (bot && editing) {
      setEditName(bot.name);
      setEditStartupCommand(bot.startupCommand);
      setEditRamMb(bot.ramMb);
      setEditAutoRestart(bot.autoRestart);
      const ev = bot.envVars || {};
      setEditEnvVars(
        Object.entries(ev).map(([key, value]) => ({ key, value }))
      );
    }
  }, [bot, editing]);

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    if (!id) return;
    if (!confirm(`Are you sure you want to ${action} this bot?`)) return;
    setActionLoading(action);
    try {
      await api.post(`/bots/${id}/${action}`, {});
      await fetchBot();
      await fetchStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to ${action} bot`);
    } finally {
      setActionLoading('');
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setActionLoading('save');
    const envObject: Record<string, string> = {};
    editEnvVars.forEach((ev) => {
      if (ev.key.trim()) envObject[ev.key.trim()] = ev.value;
    });
    try {
      await api.put(`/bots/${id}`, {
        name: editName,
        startupCommand: editStartupCommand,
        ramMb: editRamMb,
        autoRestart: editAutoRestart,
        envVars: envObject,
      });
      setEditing(false);
      await fetchBot();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update bot');
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this bot? This cannot be undone.')) return;
    setActionLoading('delete');
    try {
      await api.delete(`/bots/${id}`);
      navigate('/bots');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete bot');
      setActionLoading('');
    }
  };

  const handleEnvSave = async () => {
    if (!id) return;
    setEnvSaving(true);
    try {
      await api.post(`/files/${id}/env-create`, { values: envValues });
      setEnvSetup(prev => ({ ...prev, show: false, envExists: true }));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create .env file');
    } finally {
      setEnvSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        <p className="mt-3 text-sm text-gray-400">Loading bot...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
        <AlertCircle className="h-4 w-4" />
        {error}
      </div>
    );
  }

  if (!bot) return null;

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{bot.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                bot.status === 'running'
                  ? 'bg-green-500/10 text-green-400'
                  : bot.status === 'crashed'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-gray-500/10 text-gray-400'
              }`}
            >
              {bot.status}
            </span>
          </div>
          <p className="mt-1 text-gray-400">
            {bot.runtime} &middot; ID: {bot.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/bots/${id}/console`}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <Terminal className="h-4 w-4" />
            Console
          </Link>
          <Link
            to={`/bots/${id}/files`}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <FolderOpen className="h-4 w-4" />
            Files
          </Link>
          <Link
            to={`/bots/${id}/logs`}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <FileText className="h-4 w-4" />
            Logs
          </Link>
        </div>
      </div>

      {hasFiles === false && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">No bot files uploaded yet</p>
            <p className="text-xs text-amber-400/70">
              Upload your bot files before starting. Go to Files to upload, or use the GitHub import.
            </p>
          </div>
          <Link
            to={`/bots/${id}/files`}
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            <FolderOpen className="h-4 w-4" />
            Upload Files
          </Link>
        </div>
      )}

      {envSetup.show && envSetup.variables.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
          <FileKey className="h-5 w-5 flex-shrink-0 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-300">Environment variables needed</p>
            <p className="text-xs text-blue-400/70">
              This bot has a <code>.env.example</code> but no <code>.env</code> file. Set your values before starting.
            </p>
          </div>
          <button
            onClick={() => setEnvSetup(prev => ({ ...prev, show: true }))}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <FileKey className="h-4 w-4" />
            Configure
          </button>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold text-white">Status & Resources</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </div>
            <p className="mt-1 text-lg font-medium text-white">
              {stats?.cpu?.toFixed(1) || bot.cpuPercent?.toFixed(1) || '0.0'}%
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MemoryStick className="h-4 w-4" />
              Memory
            </div>
            <p className="mt-1 text-lg font-medium text-white">
              {stats?.ram ? `${(stats.ram / 1024 / 1024).toFixed(0)} MB` : `${bot.ramMb} MB limit`}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              Uptime
            </div>
            <p className="mt-1 text-lg font-medium text-white">
              {formatUptime(stats?.uptime || bot.uptimeMs)}
            </p>
          </div>
        </div>
        {bot.status === 'crashed' && bot.lastCrashError && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-red-400 mb-2">
              <AlertTriangle className="h-4 w-4" />
              Crash Error (x{bot.crashCount || 1})
            </div>
            <p className="text-xs text-red-400/70 font-mono break-all">{bot.lastCrashError}</p>
            {bot.lastCrashAt && (
              <p className="mt-1 text-[10px] text-gray-600">Last crash: {new Date(bot.lastCrashAt).toLocaleString()}</p>
            )}
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {bot.status !== 'running' && (
            <button
              onClick={() => handleAction('start')}
              disabled={!!actionLoading || hasFiles === false}
              title={hasFiles === false ? 'Upload files first' : undefined}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'start' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start
            </button>
          )}
          {bot.status === 'running' && (
            <>
              <button
                onClick={() => handleAction('stop')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {actionLoading === 'stop' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop
              </button>
              <button
                onClick={() => handleAction('restart')}
                disabled={!!actionLoading}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
              >
                {actionLoading === 'restart' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                Restart
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!!actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {actionLoading === 'save' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
              >
                Edit Settings
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Startup Command</label>
              <input
                type="text"
                value={editStartupCommand}
                onChange={(e) => setEditStartupCommand(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                RAM Limit (MB): {editRamMb}
              </label>
              <input
                type="range"
                min={64}
                max={2048}
                step={64}
                value={editRamMb}
                onChange={(e) => setEditRamMb(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditAutoRestart(!editAutoRestart)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  editAutoRestart ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    editAutoRestart ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <label className="text-sm font-medium text-gray-300">Auto-restart</label>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Environment Variables</label>
                <button
                  type="button"
                  onClick={() => setEditEnvVars([...editEnvVars, { key: '', value: '' }])}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {editEnvVars.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ev.key}
                      onChange={(e) => {
                        const updated = [...editEnvVars];
                        updated[i].key = e.target.value;
                        setEditEnvVars(updated);
                      }}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="KEY"
                    />
                    <input
                      type="text"
                      value={ev.value}
                      onChange={(e) => {
                        const updated = [...editEnvVars];
                        updated[i].value = e.target.value;
                        setEditEnvVars(updated);
                      }}
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="value"
                    />
                    <button
                      type="button"
                      onClick={() => setEditEnvVars(editEnvVars.filter((_, idx) => idx !== i))}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Startup Command</span>
              <span className="text-white font-mono">{bot.startupCommand || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Working Directory</span>
              <span className="text-white font-mono">{bot.workingDirectory}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">RAM Limit</span>
              <span className="text-white">{bot.ramMb} MB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Auto-restart</span>
              <span className="text-white">{bot.autoRestart ? 'Enabled' : 'Disabled'}</span>
            </div>
            {Object.keys(bot.envVars || {}).length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-400 mb-1">Environment Variables</p>
                {Object.entries(bot.envVars).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-500 font-mono">{key}</span>
                    <span className="text-gray-400 font-mono">***</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="mt-1 text-sm text-gray-400">
          Permanently delete this bot and all its data. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={!!actionLoading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {actionLoading === 'delete' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete Bot
        </button>
      </div>
    </div>

    {envSetup.show && envSetup.variables.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-lg rounded-xl border border-white/10 bg-surface p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
              <FileKey className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Environment Variables</h3>
              <p className="text-xs text-gray-400">Found in <code>.env.example</code> — values will be saved to <code>.env</code></p>
            </div>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {envSetup.variables.map((v) => (
              <div key={v.key}>
                <label className="mb-1 block text-xs font-medium text-gray-300">{v.key}</label>
                <input
                  type={v.key.toLowerCase().includes('token') || v.key.toLowerCase().includes('secret') || v.key.toLowerCase().includes('password') ? 'password' : 'text'}
                  value={envValues[v.key] ?? v.defaultValue}
                  onChange={(e) => setEnvValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                  placeholder={v.defaultValue || `Enter ${v.key}`}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setEnvSetup(prev => ({ ...prev, show: false }))}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
            >
              Skip
            </button>
            <button
              onClick={handleEnvSave}
              disabled={envSaving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {envSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save .env
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default BotDetailPage;
