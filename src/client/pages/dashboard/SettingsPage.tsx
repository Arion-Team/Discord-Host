import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Calendar,
  Mail,
  Key,
  Copy,
  Plus,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
  Link as LinkIcon,
  CopyCheck,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';
import PageTransition from '../../components/PageTransition';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const SettingsPage: React.FC = () => {
  const { user, setUser } = useAuthStore();

  const [username, setUsername] = useState(user?.username || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const [discordCode, setDiscordCode] = useState('');
  const [discordCodeLoading, setDiscordCodeLoading] = useState(false);
  const [discordCodeCopied, setDiscordCodeCopied] = useState(false);
  const [discordCodeError, setDiscordCodeError] = useState('');

  useEffect(() => {
    fetchApiKeys();
    const refreshUser = async () => {
      try {
        const data = await api.get('/auth/me');
        if (data.user) setUser(data.user);
      } catch {}
    };
    refreshUser();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const data = await api.get('/auth/api-keys');
      setApiKeys(data.keys || []);
    } catch {}
  };

  const clearMessages = () => { setMessage(''); setError(''); };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setProfileLoading(true);
    try {
      const data = await api.put('/auth/update-profile', { username });
      if (data.user) setUser(data.user);
      setMessage('Profile updated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setPasswordLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setMessage('Password changed successfully');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setKeyLoading(true);
    try {
      const data = await api.post('/auth/api-keys', { name: newKeyName });
      setNewKeyValue(data.key);
      setShowNewKey(true);
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create key');
    } finally {
      setKeyLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Delete this API key?')) return;
    try {
      await api.delete(`/auth/api-keys/${keyId}`);
      await fetchApiKeys();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete key');
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(newKeyValue);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-gray-500">Manage your account settings.</p>
        </div>

        {message && (
          <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-400 animate-fade-in">
            <CheckCircle className="h-4 w-4" /> {message}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Account Info */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Account Info</h2>
              <p className="text-xs text-gray-600">Your account details</p>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-white/5 bg-[#0a0a0a] p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-500"><Mail className="h-4 w-4" /> Email</div>
              <span className="text-white">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-500"><Shield className="h-4 w-4" /> Role</div>
              <span className="capitalize text-white">{user?.role}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-500"><Calendar className="h-4 w-4" /> Member since</div>
              <span className="text-white">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>
        </div>

        {/* Discord Profile */}
        <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden animate-slide-up-delay-1">
          {user?.discordBanner ? (
            <div className="h-24 w-full bg-cover bg-center" style={{ backgroundImage: `url(${user.discordBanner})` }} />
          ) : (
            <div className="h-24 w-full bg-gradient-to-r from-[#5865f2]/20 to-[#eb459e]/20" />
          )}
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-8">
              {user?.discordAvatar ? (
                <img src={user.discordAvatar} alt="Discord" className="h-16 w-16 rounded-full border-4 border-[#111111] bg-[#111111] object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#111111] bg-[#5865f2] text-white text-xl font-bold">
                  {(user?.discordDisplayName || user?.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="mb-1 flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {user?.discordDisplayName || user?.username}
                </h3>
                {user?.discordTag && (
                  <p className="text-xs text-gray-500">{user.discordTag}</p>
                )}
              </div>
              {user?.discordId ? (
                <span className="mb-1 flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-[11px] font-medium text-green-400">
                  <LinkIcon className="h-3 w-3" />
                  Linked
                </span>
              ) : null}
            </div>
            {!user?.discordId ? (
              <div className="mt-4 space-y-3">
                {discordCode ? (
                  <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
                    <p className="text-xs text-gray-400 mb-2">Your Discord verification code:</p>
                    <div className="flex items-center gap-3">
                      <code className="flex-1 rounded-lg bg-[#0a0a0a] px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-white font-mono select-all">{discordCode}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(discordCode);
                          setDiscordCodeCopied(true);
                          setTimeout(() => setDiscordCodeCopied(false), 2000);
                        }}
                        className="rounded-lg bg-white/10 p-3 text-gray-300 hover:bg-white/15 transition-colors"
                      >
                        {discordCodeCopied ? <CopyCheck className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-gray-500">
                      Run <code className="font-mono text-indigo-400">/verify code:{discordCode}</code> in Discord to link your account.
                    </p>
                    <p className="mt-1 text-[11px] text-gray-600">Code expires in 15 minutes.</p>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setDiscordCodeLoading(true);
                      setDiscordCodeError('');
                      try {
                        const data = await api.post('/auth/generate-discord-code', {});
                        setDiscordCode(data.code);
                      } catch (err: any) {
                        setDiscordCodeError(err.message || 'Failed to generate code');
                      } finally { setDiscordCodeLoading(false); }
                    }}
                    disabled={discordCodeLoading}
                    className="flex items-center gap-2 rounded-lg bg-[#5865f2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
                  >
                    {discordCodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                    {discordCodeLoading ? 'Generating...' : 'Link Discord Account'}
                  </button>
                )}
                {discordCodeError && (
                  <p className="text-xs text-red-400">{discordCodeError}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Profile */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <p className="text-xs text-gray-600">Update your username</p>
            </div>
          </div>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                minLength={3} maxLength={30} required />
            </div>
            <button type="submit" disabled={profileLoading}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-50 transition-all">
              {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Change Password</h2>
              <p className="text-xs text-gray-600">Update your password for security</p>
            </div>
          </div>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Current Password</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all" required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                minLength={8} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-400">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                minLength={8} required />
            </div>
            <button type="submit" disabled={passwordLoading}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-50 transition-all">
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* API Keys */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">API Keys</h2>
              <p className="text-xs text-gray-600">Manage API keys for external access</p>
            </div>
          </div>

          {showNewKey && (
            <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-4 animate-scale-in">
              <p className="text-sm font-medium text-green-400 mb-2">API Key Created</p>
              <p className="text-xs text-gray-500 mb-3">Copy this key now. It won't be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-[#0a0a0a] px-3 py-2 text-xs text-gray-300 font-mono break-all">{newKeyValue}</code>
                <button onClick={copyKey}
                  className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-2 text-xs text-gray-300 hover:bg-white/10 transition-all">
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <input type="text" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. My Bot)"
              className="flex-1 rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()} />
            <button onClick={handleCreateKey} disabled={keyLoading || !newKeyName.trim()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-50 transition-all">
              {keyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-4">No API keys yet</p>
          ) : (
            <div className="divide-y divide-white/5">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <p className="text-xs text-gray-600 font-mono">{key.key_prefix}... &middot; {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : 'Never used'}</p>
                  </div>
                  <button onClick={() => handleDeleteKey(key.id)}
                    className="rounded-lg p-1.5 text-gray-600 hover:bg-white/5 hover:text-red-400 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default SettingsPage;
