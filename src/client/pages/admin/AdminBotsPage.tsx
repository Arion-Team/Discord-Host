import React, { useState, useEffect } from 'react';
import {
  Bot,
  Search,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  ExternalLink,
  Cpu,
  MemoryStick,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

interface BotRecord {
  id: string;
  name: string;
  ownerId: string;
  ownerUsername?: string;
  runtime?: string;
  status: 'running' | 'stopped' | 'crashed' | 'starting';
  ram?: number;
  cpu?: number;
  createdAt: string;
}

const AdminBotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped' | 'crashed'>('all');
  const [actingId, setActingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchBots = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/bots');
      setBots(data.bots || data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleAction = async (botId: string, action: 'start' | 'stop' | 'restart') => {
    setActingId(botId);
    try {
      await api.post(`/admin/bots/${botId}/${action}`, {});
      setBots((prev) =>
        prev.map((b) => {
          if (b.id !== botId) return b;
          if (action === 'stop') return { ...b, status: 'stopped' as const };
          if (action === 'start') return { ...b, status: 'starting' as const };
          return { ...b, status: 'starting' as const };
        })
      );
    } catch (err: any) {
      setError(err.message || `${action} failed`);
    } finally {
      setActingId(null);
    }
  };

  const filtered = bots.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q || b.name.toLowerCase().includes(q) || (b.ownerUsername || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500/10 text-green-400';
      case 'stopped':
        return 'bg-gray-500/10 text-gray-400';
      case 'crashed':
        return 'bg-red-500/10 text-red-400';
      case 'starting':
        return 'bg-yellow-500/10 text-yellow-400';
      default:
        return 'bg-gray-500/10 text-gray-400';
    }
  };

  const formatBytes = (mb?: number) => {
    if (mb == null) return '-';
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
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
          <h1 className="text-2xl font-bold text-white">All Bots</h1>
          <p className="mt-1 text-gray-400">Manage all bots on the platform.</p>
        </div>
        <button
          onClick={fetchBots}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto hover:text-red-300">x</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search bots or owners..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="stopped">Stopped</option>
          <option value="crashed">Crashed</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No bots found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3 font-medium">Bot Name</th>
                  <th className="px-6 py-3 font-medium">Owner</th>
                  <th className="px-6 py-3 font-medium">Runtime</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">RAM</th>
                  <th className="px-6 py-3 font-medium">CPU</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((bot) => (
                  <tr key={bot.id} className="hover:bg-white/5">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-green-400" />
                        <span className="text-white font-medium">{bot.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{bot.ownerUsername || bot.ownerId}</td>
                    <td className="px-6 py-3 text-gray-400">{bot.runtime || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(bot.status)}`}>
                        {bot.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{formatBytes(bot.ram)}</td>
                    <td className="px-6 py-3 text-gray-400">{bot.cpu != null ? `${bot.cpu}%` : '-'}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {bot.status !== 'running' && (
                          <button
                            onClick={() => handleAction(bot.id, 'start')}
                            disabled={actingId === bot.id}
                            className="rounded-lg bg-green-500/10 p-1.5 text-green-400 hover:bg-green-500/20 disabled:opacity-50"
                            title="Start"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {bot.status === 'running' && (
                          <button
                            onClick={() => handleAction(bot.id, 'stop')}
                            disabled={actingId === bot.id}
                            className="rounded-lg bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            title="Stop"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(bot.id, 'restart')}
                          disabled={actingId === bot.id}
                          className="rounded-lg bg-yellow-500/10 p-1.5 text-yellow-400 hover:bg-yellow-500/20 disabled:opacity-50"
                          title="Restart"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/bots/${bot.id}`)}
                          className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20"
                          title="View details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBotsPage;
