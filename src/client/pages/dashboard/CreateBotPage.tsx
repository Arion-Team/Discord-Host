import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, Github, Upload, Plus, X, Loader2, AlertTriangle, Mail } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';

type CreateMode = 'manual' | 'github' | 'upload';

const CreateBotPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<CreateMode>('manual');
  const [name, setName] = useState('');
  const [runtime, setRuntime] = useState<'node' | 'python'>('node');
  const [token, setToken] = useState('');
  const [startupCommand, setStartupCommand] = useState('');
  const [autoRestart, setAutoRestart] = useState(true);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);

  const [githubUrl, setGithubUrl] = useState('');
  const [repoRuntime, setRepoRuntime] = useState<'node' | 'python'>('node');

  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [limitInfo, setLimitInfo] = useState<{ currentBots: number; limit: number } | null>(null);

  useEffect(() => {
    const checkLimit = async () => {
      try {
        const data = await api.get('/bots/check/create');
        setLimitInfo({ currentBots: data.currentBots, limit: data.limit });
      } catch (err: any) {
        setError(err.message || 'Failed to check bot limit');
      }
    };
    checkLimit();
  }, []);

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (i: number) => setEnvVars(envVars.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[i][field] = val;
    setEnvVars(updated);
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const envObj: Record<string, string> = {};
      envVars.forEach(({ key, value }) => {
        if (key.trim()) envObj[key.trim()] = value;
      });
      const data = await api.post('/bots', {
        name, runtime, token, startupCommand, autoRestart, envVars: envObj,
      });
      navigate(`/bots/${data.bot.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const envObj: Record<string, string> = {};
      envVars.forEach(({ key, value }) => {
        if (key.trim()) envObj[key.trim()] = value;
      });
      const data = await api.post('/bots/import-github', {
        name, runtime: repoRuntime, token, repoUrl: githubUrl,
        startupCommand, autoRestart, envVars: envObj,
      });
      navigate(`/bots/${data.bot.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to import from GitHub');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Bot name is required'); return; }
    setLoading(true);
    setError('');
    try {
      const envObj: Record<string, string> = {};
      envVars.forEach(({ key, value }) => {
        if (key.trim()) envObj[key.trim()] = value;
      });

      const botData = await api.post('/bots', {
        name, runtime, token: token || 'pending', startupCommand, autoRestart, envVars: envObj,
      });

      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        const res = await fetch(`/api/bots/${botData.bot.id}/upload-files`, {
          method: 'POST', credentials: 'include', body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload files');
      }

      navigate(`/bots/${botData.bot.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const envObj: Record<string, string> = {};
      envVars.forEach(({ key, value }) => {
        if (key.trim()) envObj[key.trim()] = value;
      });

      const botData = await api.post('/bots', {
        name, runtime, token: token || 'pending', startupCommand, autoRestart, envVars: envObj,
      });

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/bots/${botData.bot.id}/upload-zip`, {
        method: 'POST', credentials: 'include', body: formData,
      });
      if (!res.ok) throw new Error('Failed to extract ZIP');

      navigate(`/bots/${botData.bot.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to import ZIP');
    } finally {
      setLoading(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const modes = [
    { id: 'manual' as const, label: 'Manual Setup', icon: Bot, desc: 'Create and configure manually' },
    { id: 'github' as const, label: 'GitHub Repo', icon: Github, desc: 'Import from a public GitHub repo' },
    { id: 'upload' as const, label: 'Upload Files', icon: Upload, desc: 'Upload bot files from your machine' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Create Bot</h1>
        <p className="mt-1 text-gray-400">Deploy a new Discord bot to the platform.</p>
      </div>

      {limitInfo && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-400">
          Bots: {limitInfo.currentBots} / {limitInfo.limit}
        </div>
      )}

      {user && (user as any).emailVerified === false && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <Mail className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Email not verified</p>
            <p className="text-xs text-amber-400/70">Please verify your email before creating a bot.</p>
          </div>
          <Link to="/verify-email" className="shrink-0 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/30 transition-colors">
            Verify
          </Link>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setError(''); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all ${
              mode === m.id
                ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <m.icon className="h-6 w-6" />
            <span className="text-sm font-medium">{m.label}</span>
            <span className="text-xs text-gray-500">{m.desc}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        {mode === 'manual' && (
          <form onSubmit={handleSubmitManual} className="space-y-4">
            <CommonFields name={name} setName={setName} token={token} setToken={setToken} runtime={runtime} setRuntime={setRuntime} startupCommand={startupCommand} setStartupCommand={setStartupCommand} autoRestart={autoRestart} setAutoRestart={setAutoRestart} envVars={envVars} addEnvVar={addEnvVar} removeEnvVar={removeEnvVar} updateEnvVar={updateEnvVar} />
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? 'Creating...' : 'Create Bot'}
            </button>
          </form>
        )}

        {mode === 'github' && (
          <form onSubmit={handleSubmitGithub} className="space-y-4">
            <CommonFields name={name} setName={setName} token={token} setToken={setToken} runtime={repoRuntime} setRuntime={setRepoRuntime} startupCommand={startupCommand} setStartupCommand={setStartupCommand} ramMb={ramMb} setRamMb={setRamMb} autoRestart={autoRestart} setAutoRestart={setAutoRestart} envVars={envVars} addEnvVar={addEnvVar} removeEnvVar={removeEnvVar} updateEnvVar={updateEnvVar} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">GitHub Repository URL</label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://github.com/user/repo"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Must be a public repository</p>
            </div>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
              {loading ? 'Importing...' : 'Import from GitHub'}
            </button>
          </form>
        )}

        {mode === 'upload' && (
          <form onSubmit={handleSubmitUpload} className="space-y-4">
            <CommonFields name={name} setName={setName} token={token} setToken={setToken} runtime={runtime} setRuntime={setRuntime} startupCommand={startupCommand} setStartupCommand={setStartupCommand} autoRestart={autoRestart} setAutoRestart={setAutoRestart} envVars={envVars} addEnvVar={addEnvVar} removeEnvVar={removeEnvVar} updateEnvVar={updateEnvVar} />

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Upload Bot Files</label>
                <input ref={fileInputRef} type="file" multiple onChange={(e) => { if (e.target.files) setFiles(Array.from(e.target.files)); }} className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500" />
                {files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <span key={i} className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-gray-300">
                        {f.name}
                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-3">
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Or Upload ZIP File</label>
                <input ref={zipInputRef} type="file" accept=".zip" onChange={handleZipUpload} disabled={loading || !name.trim()} className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-500 disabled:opacity-50" />
              </div>
            </div>

            <button type="submit" disabled={loading || !name.trim()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Creating...' : 'Create & Upload Bot'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const CommonFields: React.FC<{
  name: string; setName: (v: string) => void;
  token: string; setToken: (v: string) => void;
  runtime: 'node' | 'python'; setRuntime: (v: 'node' | 'python') => void;
  startupCommand: string; setStartupCommand: (v: string) => void;
  autoRestart: boolean; setAutoRestart: (v: boolean) => void;
  envVars: { key: string; value: string }[];
  addEnvVar: () => void;
  removeEnvVar: (i: number) => void;
  updateEnvVar: (i: number, field: 'key' | 'value', val: string) => void;
}> = ({ name, setName, token, setToken, runtime, setRuntime, startupCommand, setStartupCommand, autoRestart, setAutoRestart, envVars, addEnvVar, removeEnvVar, updateEnvVar }) => (
  <>
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-gray-500">
      RAM is auto-assigned based on your plan. Upgrade your plan for more resources.
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Bot Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="My Bot" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-300">Runtime</label>
        <select value={runtime} onChange={(e) => setRuntime(e.target.value as 'node' | 'python')} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
          <option value="node">Node.js</option>
          <option value="python">Python</option>
        </select>
      </div>
    </div>

    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">Bot Token</label>
      <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Discord bot token" />
    </div>

    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">Startup Command</label>
      <input type="text" value={startupCommand} onChange={(e) => setStartupCommand(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder={runtime === 'node' ? 'node index.js' : 'python main.py'} />
    </div>

    <label className="flex items-center gap-3">
      <input type="checkbox" checked={autoRestart} onChange={(e) => setAutoRestart(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-indigo-500" />
      <span className="text-sm text-gray-300">Auto-restart on crash</span>
    </label>

    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">Environment Variables</label>
        <button type="button" onClick={addEnvVar} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add</button>
      </div>
      <div className="space-y-2">
        {envVars.map((ev, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={ev.key} onChange={(e) => updateEnvVar(i, 'key', e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none" placeholder="KEY" />
            <input type="text" value={ev.value} onChange={(e) => updateEnvVar(i, 'value', e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none" placeholder="value" />
            <button type="button" onClick={() => removeEnvVar(i)} className="rounded-lg p-2 text-gray-500 hover:bg-white/10 hover:text-red-400"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default CreateBotPage;
