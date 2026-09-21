import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Settings,
  RefreshCw,
  AlertTriangle,
  Save,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Info,
  Megaphone,
  Shield,
  Clock,
  Bot,
  Users,
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Send,
  KeyRound,
  Zap,
  ArrowRight,
  Database,
  Download,
  Play,
  Plus,
} from 'lucide-react';
import api from '../../lib/api';

interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
  cpu: number;
  ram: number;
  storage: number;
  totalMemory?: string;
  freeMemory?: string;
}

const AdminSettingsPage: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxBotsPerUser, setMaxBotsPerUser] = useState('5');
  const [maxRamMb, setMaxRamMb] = useState('2048');
  const [maxStorageMb, setMaxStorageMb] = useState('5120');
  const [botCreationDisabled, setBotCreationDisabled] = useState(false);
  const [welcomeAnimation, setWelcomeAnimation] = useState(true);
  const [emailVerification, setEmailVerification] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [demoAccessCode, setDemoAccessCode] = useState('');
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromEmail, setResendFromEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'error'>('info');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [backups, setBackups] = useState<{ name: string; size: number; createdAt: string }[]>([]);
  const [backing, setBacking] = useState(false);

  const [discordToken, setDiscordToken] = useState('');
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [discordBotConnected, setDiscordBotConnected] = useState(false);
  const [startingDiscord, setStartingDiscord] = useState(false);
  const [discordAdminIds, setDiscordAdminIds] = useState<string[]>([]);
  const [newDiscordAdminId, setNewDiscordAdminId] = useState('');
  const [savingAdminIds, setSavingAdminIds] = useState(false);

  const [ads, setAds] = useState<any[]>([]);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adForm, setAdForm] = useState({ title: '', description: '', imageUrl: '', linkUrl: '', buttonText: 'Learn More', maxUses: '0', active: true });
  const [adLoading, setAdLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/settings');
      setSystemInfo(data.system || null);
      const s = data.settings || {};
      setRegistrationEnabled(s.registrationEnabled !== 'false');
      setMaintenanceMode(s.maintenanceMode === 'true');
      setMaxBotsPerUser(s.maxBotsPerUser || '5');
      setMaxRamMb(s.maxRamMb || '2048');
      setMaxStorageMb(s.maxStorageMb || '5120');
      setBotCreationDisabled(s.botCreationDisabled === 'true');
      try {
        const brand = await api.get('/branding');
        setWelcomeAnimation(brand.settings?.welcomeAnimation !== 'false');
      } catch {
        setWelcomeAnimation(s.welcomeAnimation !== 'false');
      }
      setEmailVerification(s.emailVerification === 'true');
      setDemoMode(s.demoMode === 'true');
      setDemoAccessCode(s.demoAccessCode || '');
      setResendApiKey(s.resendApiKey || '');
      setResendFromEmail(s.resendFromEmail || '');

      try {
        const backupData = await api.get('/admin/backups');
        setBackups(backupData.backups || []);
      } catch {}

      setDiscordToken(s.discordToken || '');
      try {
        const statusData = await api.get('/admin/discord-status');
        setDiscordBotConnected(statusData.connected || false);
      } catch {}

      try {
        const idsRaw = s.discordAdminIds;
        if (idsRaw) {
          const parsed = typeof idsRaw === 'string' ? JSON.parse(idsRaw) : idsRaw;
          setDiscordAdminIds(Array.isArray(parsed) ? parsed : []);
        }
      } catch { setDiscordAdminIds([]); }

      try {
        const adsData = await api.get('/admin/ads');
        setAds(adsData.ads || []);
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoSave = useRef(true);

  const autoSaveEmailSettings = useCallback(async (apiKey: string, fromEmail: string) => {
    try {
      await api.put('/admin/settings', {
        resendApiKey: apiKey,
        resendFromEmail: fromEmail,
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (skipAutoSave.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      autoSaveEmailSettings(resendApiKey, resendFromEmail);
    }, 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [resendApiKey, resendFromEmail, autoSaveEmailSettings]);

  useEffect(() => {
    if (keyStatus !== 'idle') return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    const t = setTimeout(() => { skipAutoSave.current = false; }, 1000);
    return () => clearTimeout(t);
  }, []);

  const handleSaveAd = async () => {
    setAdLoading(true);
    try {
      if (editingAd) {
        await api.put(`/admin/ads/${editingAd.id}`, { ...adForm, maxUses: Number(adForm.maxUses) });
      } else {
        await api.post('/admin/ads', { ...adForm, maxUses: Number(adForm.maxUses) });
      }
      const adsData = await api.get('/admin/ads');
      setAds(adsData.ads || []);
      setEditingAd(null);
      setAdForm({ title: '', description: '', imageUrl: '', linkUrl: '', buttonText: 'Learn More', maxUses: '0', active: true });
      setMessage(editingAd ? 'Ad updated' : 'Ad created');
    } catch (err: any) {
      setError(err.message || 'Failed to save ad');
    } finally { setAdLoading(false); }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Delete this ad?')) return;
    try {
      await api.delete(`/admin/ads/${id}`);
      setAds(ads.filter(a => a.id !== id));
      setMessage('Ad deleted');
    } catch (err: any) {
      setError(err.message || 'Failed to delete ad');
    }
  };

  const handleEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdForm({ title: ad.title, description: ad.description, imageUrl: ad.image_url || '', linkUrl: ad.link_url || '', buttonText: ad.button_text || 'Learn More', maxUses: String(ad.max_uses || 0), active: !!ad.active });
  };

  const handleAddDiscordAdminId = async () => {
    if (!newDiscordAdminId.trim()) return;
    if (discordAdminIds.includes(newDiscordAdminId.trim())) { setError('This ID is already added'); return; }
    setSavingAdminIds(true);
    try {
      const updated = [...discordAdminIds, newDiscordAdminId.trim()];
      await api.put('/admin/settings', { discordAdminIds: updated });
      setDiscordAdminIds(updated);
      setNewDiscordAdminId('');
      setMessage('Discord admin added');
    } catch (err: any) {
      setError(err.message || 'Failed to add admin ID');
    } finally { setSavingAdminIds(false); }
  };

  const handleRemoveDiscordAdminId = async (id: string) => {
    setSavingAdminIds(true);
    try {
      const updated = discordAdminIds.filter(i => i !== id);
      await api.put('/admin/settings', { discordAdminIds: updated });
      setDiscordAdminIds(updated);
      setMessage('Discord admin removed');
    } catch (err: any) {
      setError(err.message || 'Failed to remove admin ID');
    } finally { setSavingAdminIds(false); }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/admin/settings', {
        registrationEnabled,
        maintenanceMode,
        maxBotsPerUser: Number(maxBotsPerUser),
        maxRamMb: Number(maxRamMb),
        maxStorageMb: Number(maxStorageMb),
        botCreationDisabled,
        welcomeAnimation,
        emailVerification,
        demoMode,
        demoAccessCode,
        resendApiKey,
        resendFromEmail,
      });
      await api.put('/branding', { welcomeAnimation: String(welcomeAnimation) });
      setMessage('Settings saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    setError('');
    try {
      await api.post('/admin/broadcast', { title: broadcastType.toUpperCase(), message: broadcastMessage });
      setMessage('Broadcast sent successfully');
      setBroadcastMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
          <p className="mt-1 text-gray-400">Configure platform-wide settings and resource limits.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {message && <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400">{message}</div>}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto hover:text-red-300">x</button>
        </div>
      )}

      {/* System Info */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">System Information</h2>
        </div>
        {systemInfo ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard icon={Info} label="Version" value={systemInfo.version || '-'} color="text-indigo-400" />
            <InfoCard icon={Cpu} label="CPU Usage" value={`${systemInfo.cpu ?? 0}%`} color="text-purple-400" />
            <InfoCard icon={MemoryStick} label="RAM Usage" value={`${systemInfo.ram ?? 0}%`} color="text-blue-400" />
            <InfoCard icon={HardDrive} label="Storage" value={`${systemInfo.storage ?? 0}%`} color="text-amber-400" />
            <InfoCard icon={Server} label="Platform" value={systemInfo.platform || '-'} color="text-green-400" />
            <InfoCard icon={Info} label="Node.js" value={systemInfo.nodeVersion || '-'} color="text-emerald-400" />
            <InfoCard icon={Clock} label="Uptime" value={formatUptime(systemInfo.uptime)} color="text-cyan-400" />
            <InfoCard icon={MemoryStick} label="Total RAM" value={systemInfo.totalMemory || '-'} color="text-pink-400" />
          </div>
        ) : (
          <p className="text-sm text-gray-400">No system info available</p>
        )}
      </div>

      {/* Platform Settings */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Platform Settings</h2>
        </div>
        <div className="space-y-4">
          <ToggleField label="Allow Registration" description="Allow new users to register accounts." enabled={registrationEnabled} onChange={setRegistrationEnabled} />
          <ToggleField label="Maintenance Mode" description="Disable public access to the panel." enabled={maintenanceMode} onChange={setMaintenanceMode} />
          <ToggleField label="Welcome Animation" description="Show cinematic welcome animation after registration." enabled={welcomeAnimation} onChange={setWelcomeAnimation} />
          <ToggleField label="Demo Mode" description="Enable public demo — users can try the panel without installing. Disables bot creation, start/stop, and registration." enabled={demoMode} onChange={setDemoMode} />
          {demoMode && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Demo Access Code</label>
              <input type="text" value={demoAccessCode} onChange={(e) => setDemoAccessCode(e.target.value)} placeholder="Secret code to access demo"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <p className="mt-1 text-xs text-gray-500">Users must enter this code to access the demo. Share it only with people you trust.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                <Users className="mr-1 inline h-4 w-4" /> Max Bots Per User
              </label>
              <input type="number" value={maxBotsPerUser} onChange={(e) => setMaxBotsPerUser(e.target.value)} min="1" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                <MemoryStick className="mr-1 inline h-4 w-4" /> Max RAM Per Bot (MB)
              </label>
              <input type="number" value={maxRamMb} onChange={(e) => setMaxRamMb(e.target.value)} min="64" step="64" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                <HardDrive className="mr-1 inline h-4 w-4" /> Max Storage Per Bot (MB)
              </label>
              <input type="number" value={maxStorageMb} onChange={(e) => setMaxStorageMb(e.target.value)} min="128" step="128" className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
        <button onClick={handleSaveSettings} disabled={saving} className="mt-6 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Bot Creation Control */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Bot Creation Control</h2>
        </div>
        <ToggleField
          label="Disable Bot Creation"
          description={botCreationDisabled ? 'Users CANNOT create new bots right now.' : 'Users can create bots normally.'}
          enabled={botCreationDisabled}
          onChange={setBotCreationDisabled}
        />
        {botCreationDisabled && (
          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-400">
            Bot creation is currently disabled. All users will see an error when trying to create a bot.
          </div>
        )}
      </div>

      {/* Discord Bot */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <svg className="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Discord Bot</h2>
            <p className="text-sm text-gray-500">Manage users via Discord slash commands</p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            discordBotConnected ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${discordBotConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
            {discordBotConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Bot Token</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={discordToken}
                onChange={(e) => setDiscordToken(e.target.value)}
                placeholder="MTxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-mono"
              />
              <button
                onClick={async () => {
                  setSavingDiscord(true);
                  try {
                    await api.put('/admin/settings', { discordToken });
                    setMessage('Bot token saved. Restart server to apply.');
                  } catch (err: any) {
                    setError(err.message || 'Failed to save');
                  } finally { setSavingDiscord(false); }
                }}
                disabled={savingDiscord}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-4 py-2.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-50 transition-colors"
              >
                {savingDiscord ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Token
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-600">
              discord.com/developers → New Application → Bot → Copy Token
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                setStartingDiscord(true);
                try {
                  const res = await api.post('/admin/discord-start');
                  setMessage(res.message || 'Bot started');
                  const statusData = await api.get('/admin/discord-status');
                  setDiscordBotConnected(statusData.connected || false);
                } catch (err: any) {
                  setError(err.message || 'Failed to start bot');
                } finally { setStartingDiscord(false); }
              }}
              disabled={startingDiscord || !discordToken}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                discordBotConnected
                  ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                  : 'bg-white text-black hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              {startingDiscord ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : discordBotConnected ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {startingDiscord ? 'Starting...' : discordBotConnected ? 'Restart Bot' : 'Start Bot'}
            </button>
            {discordBotConnected && (
              <span className="text-xs text-green-400/70">Bot is online and ready</span>
            )}
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 space-y-1.5 text-xs text-gray-500">
            <p className="font-medium text-gray-300">Slash commands:</p>
            <p><code className="font-mono text-gray-400">/verify email:</code> — Link Discord to panel account</p>
            <p><code className="font-mono text-gray-400">/create name: runtime: token: startup:</code> — Create a bot</p>
            <p><code className="font-mono text-gray-400">/delete name:</code> — Delete a bot</p>
            <p><code className="font-mono text-gray-400">/start name: /stop name:</code> — Control bots</p>
            <p><code className="font-mono text-gray-400">/status /bots /resources</code> — Check status</p>
            <p className="font-medium text-gray-300 pt-1">Admin commands:</p>
            <p><code className="font-mono text-gray-400">/admin-users /admin-bots /admin-stats</code> — Overview</p>
            <p><code className="font-mono text-gray-400">/admin-suspend /admin-unsuspend</code> — User management</p>
            <p><code className="font-mono text-gray-400">/admin-bot-start /admin-bot-stop /admin-bot-delete</code> — Bot control</p>
            <p><code className="font-mono text-gray-400">/admin-addid /admin-removeid /admin-listids</code> — Manage Discord admins</p>
            <p><code className="font-mono text-gray-400">/admin-logs /admin-broadcast /admin-backup /admin-maintenance</code> — System</p>
          </div>

          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
            <p className="text-xs font-medium text-gray-300 mb-3">Discord Admin IDs</p>
            <p className="text-[11px] text-gray-600 mb-3">Add Discord user IDs to grant admin access. These users can run admin commands without a linked panel admin account.</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newDiscordAdminId}
                onChange={(e) => setNewDiscordAdminId(e.target.value)}
                placeholder="Discord User ID (e.g. 123456789012345678)"
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none font-mono"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDiscordAdminId()}
              />
              <button
                onClick={handleAddDiscordAdminId}
                disabled={savingAdminIds || !newDiscordAdminId.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {savingAdminIds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Add
              </button>
            </div>
            {discordAdminIds.length > 0 ? (
              <div className="space-y-1.5">
                {discordAdminIds.map((id) => (
                  <div key={id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-sm font-mono text-gray-300">{id}</span>
                    <button
                      onClick={() => handleRemoveDiscordAdminId(id)}
                      disabled={savingAdminIds}
                      className="rounded p-1 text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-2">No Discord admin IDs configured</p>
            )}
          </div>
        </div>
      </div>

      {/* Bot Ads Management */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Bot Ads</h2>
          <span className="text-xs text-gray-500">Manage ads shown in the bots section</span>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Title</label>
              <input value={adForm.title} onChange={e => setAdForm({...adForm, title: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="Ad title" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Button Text</label>
              <input value={adForm.buttonText} onChange={e => setAdForm({...adForm, buttonText: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="Learn More" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Description</label>
            <textarea value={adForm.description} onChange={e => setAdForm({...adForm, description: e.target.value})}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              placeholder="Ad description" rows={2} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Image URL</label>
              <input value={adForm.imageUrl} onChange={e => setAdForm({...adForm, imageUrl: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Link URL</label>
              <input value={adForm.linkUrl} onChange={e => setAdForm({...adForm, linkUrl: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="https://..." />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Max Uses (0 = unlimited)</label>
              <input type="number" value={adForm.maxUses} onChange={e => setAdForm({...adForm, maxUses: e.target.value})}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                min="0" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={adForm.active} onChange={e => setAdForm({...adForm, active: e.target.checked})}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50" />
              <span className="text-sm text-gray-300">Active</span>
            </label>
            <div className="flex-1" />
            {editingAd && (
              <button onClick={() => { setEditingAd(null); setAdForm({ title: '', description: '', imageUrl: '', linkUrl: '', buttonText: 'Learn More', maxUses: '0', active: true }); }}
                className="rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-400 hover:bg-white/10 transition-colors">
                Cancel
              </button>
            )}
            <button onClick={handleSaveAd} disabled={adLoading || !adForm.title || !adForm.description}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors">
              {adLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingAd ? 'Update Ad' : 'Create Ad'}
            </button>
          </div>
        </div>

        {ads.length > 0 && (
          <div className="mt-6 space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className={`flex items-center gap-4 rounded-lg border p-4 ${ad.active ? 'border-white/5 bg-white/[0.02]' : 'border-white/5 bg-white/[0.01] opacity-50'}`}>
                {ad.image_url && <img src={ad.image_url} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{ad.title}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${ad.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-gray-500'}`}>
                      {ad.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{ad.description}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Uses: {ad.current_uses || 0}{ad.max_uses > 0 ? ` / ${ad.max_uses}` : ' / unlimited'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEditAd(ad)} className="rounded p-1.5 text-gray-500 hover:bg-white/5 hover:text-white transition-colors">
                    <Save className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDeleteAd(ad.id)} className="rounded p-1.5 text-gray-500 hover:bg-white/5 hover:text-red-400 transition-colors">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Database Backup */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Database Backup</h2>
        </div>
        <p className="mb-4 text-sm text-gray-500">Create a backup of your database. Backups are stored locally on the server.</p>
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setBacking(true);
              try {
                const res = await api.post('/admin/backup');
                if (res.success) {
                  setMessage(`Backup created: ${res.file} (${(res.size / 1024).toFixed(1)} KB)`);
                  const backupData = await api.get('/admin/backups');
                  setBackups(backupData.backups || []);
                }
              } catch (err: any) {
                setError(err.message || 'Backup failed');
              } finally { setBacking(false); }
            }}
            disabled={backing}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50 transition-colors"
          >
            {backing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {backing ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
        {backups.length > 0 && (
          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02]">
            <div className="max-h-40 overflow-y-auto scrollbar-thin">
              {backups.slice(0, 10).map((b, i) => (
                <div key={i} className="flex items-center justify-between border-b border-white/5 px-4 py-2.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-xs text-gray-300 font-mono">{b.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-600">{(b.size / 1024).toFixed(1)} KB</span>
                    <span className="text-xs text-gray-600">{new Date(b.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Broadcast */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Broadcast Announcement</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Message</label>
            <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Enter announcement to broadcast to all users..." />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Type</label>
            <div className="flex gap-2">
              {(['info', 'warning', 'error'] as const).map((t) => (
                <button key={t} onClick={() => setBroadcastType(t)} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  broadcastType === t
                    ? t === 'info' ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                    : t === 'warning' ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                    : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleBroadcast} disabled={sendingBroadcast || !broadcastMessage.trim()} className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">
            <Megaphone className="h-4 w-4" /> {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoCard: React.FC<{ icon: React.FC<{ className?: string }>; label: string; value: string; color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-lg border border-white/5 bg-white/5 p-4">
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <p className="mt-1 text-lg font-semibold text-white">{value}</p>
  </div>
);

const ToggleField: React.FC<{ label: string; description: string; enabled: boolean; onChange: (v: boolean) => void }> = ({ label, description, enabled, onChange }) => (
  <button type="button" onClick={() => onChange(!enabled)} className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-4 text-left transition-colors hover:bg-white/10">
    <div className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-indigo-500' : 'bg-gray-600'}`}>
      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
    </div>
    <div>
      <span className="text-sm font-medium text-white">{label}</span>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  </button>
);

export default AdminSettingsPage;
