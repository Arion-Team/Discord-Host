import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Plus,
  Play,
  Square,
  RotateCw,
  Loader2,
  AlertCircle,
  Search,
  Terminal,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Megaphone,
} from 'lucide-react';
import api from '../../lib/api';
import PageTransition from '../../components/PageTransition';

interface BotData {
  id: string;
  name: string;
  status: string;
  runtime: string;
  cpuPercent: number;
  ramMb: number;
  uptimeMs: number;
}

interface AdData {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link_url: string | null;
  button_text: string;
}

function formatUptime(ms: number): string {
  if (!ms || ms <= 0) return '-';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

const BotsPage: React.FC = () => {
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ads, setAds] = useState<AdData[]>([]);

  const fetchBots = useCallback(async () => {
    try {
      const data = await api.get('/bots');
      setBots(data.bots || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bots');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAds = useCallback(async () => {
    try {
      const data = await api.get('/bots/ads/active');
      setAds(data.ads || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBots();
    fetchAds();
  }, [fetchBots, fetchAds]);

  const handleAction = async (botId: string, action: 'start' | 'stop' | 'restart') => {
    if (!confirm(`Are you sure you want to ${action} this bot?`)) return;
    setActionLoading(`${botId}-${action}`);
    try {
      await api.post(`/bots/${botId}/${action}`, {});
      await fetchBots();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Failed to ${action} bot`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = bots.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.runtime.toLowerCase().includes(search.toLowerCase())
  );

  const trackAd = async (adId: string) => {
    try {
      await api.post(`/bots/ads/${adId}/track`);
    } catch {}
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-white">Bots</h1>
            <p className="mt-1 text-gray-500">Manage your Discord bots.</p>
          </div>
          <Link
            to="/bots/new"
            className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Create Bot
          </Link>
        </div>

        <div className="relative animate-slide-up-delay-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bots..."
            className="w-full rounded-lg border border-white/5 bg-[#111111] py-2.5 pl-10 pr-4 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
          />
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="mt-3 text-sm text-gray-600">Loading bots...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-[#111111] p-12 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mx-auto mb-4">
              <Bot className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-white">
              {search ? 'No bots found' : 'No bots'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {search ? 'Try a different search term.' : 'Get started by creating your first bot.'}
            </p>
            {!search && (
              <Link
                to="/bots/new"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Bot
              </Link>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((bot, i) => (
              <div
                key={bot.id}
                className="rounded-xl border border-white/5 bg-[#111111] p-5 transition-all duration-200 hover:border-white/10 hover:bg-[#151515] hover-lift animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${
                        bot.status === 'running' ? 'bg-green-400 shadow-lg shadow-green-400/30' :
                        bot.status === 'crashed' ? 'bg-red-400' : 'bg-gray-600'
                      }`} />
                      {bot.status === 'running' && (
                        <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-400 animate-ping opacity-50" />
                      )}
                    </div>
                    <div>
                      <Link to={`/bots/${bot.id}`} className="font-semibold text-white hover:text-white transition-colors">
                        {bot.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          bot.runtime === 'node' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {bot.runtime}
                        </span>
                        <span className="text-[10px] text-gray-600">{formatUptime(bot.uptimeMs)}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                    bot.status === 'running' ? 'bg-green-500/10 text-green-400' :
                    bot.status === 'crashed' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-500'
                  }`}>
                    {bot.status}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-600">
                  <span>CPU: {bot.cpuPercent?.toFixed(1) || 0}%</span>
                  <span>RAM: {bot.ramMb || 0}MB</span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {bot.status !== 'running' && (
                    <button
                      onClick={() => handleAction(bot.id, 'start')}
                      disabled={actionLoading === `${bot.id}-start`}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-all"
                    >
                      {actionLoading === `${bot.id}-start` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      Start
                    </button>
                  )}
                  {bot.status === 'running' && (
                    <>
                      <button
                        onClick={() => handleAction(bot.id, 'stop')}
                        disabled={actionLoading === `${bot.id}-stop`}
                        className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[11px] font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50 transition-all"
                      >
                        {actionLoading === `${bot.id}-stop` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Square className="h-3 w-3" />
                        )}
                        Stop
                      </button>
                      <button
                        onClick={() => handleAction(bot.id, 'restart')}
                        disabled={actionLoading === `${bot.id}-restart`}
                        className="flex items-center gap-1.5 rounded-lg border border-white/5 px-3 py-1.5 text-[11px] font-medium text-gray-400 hover:bg-white/5 disabled:opacity-50 transition-all"
                      >
                        {actionLoading === `${bot.id}-restart` ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCw className="h-3 w-3" />
                        )}
                        Restart
                      </button>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    <Link
                      to={`/bots/${bot.id}/console`}
                      className="rounded-lg p-1.5 text-gray-600 hover:bg-white/5 hover:text-white transition-colors"
                      title="Console"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to={`/bots/${bot.id}/files`}
                      className="rounded-lg p-1.5 text-gray-600 hover:bg-white/5 hover:text-white transition-colors"
                      title="Files"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      to={`/bots/${bot.id}`}
                      className="rounded-lg p-1.5 text-gray-600 hover:bg-white/5 hover:text-white transition-colors"
                      title="Details"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && ads.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Megaphone className="h-3.5 w-3.5" />
              <span>Sponsored</span>
            </div>
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="rounded-xl border border-indigo-500/10 bg-gradient-to-r from-[#111111] to-[#151515] p-5 hover:border-indigo-500/20 transition-all"
                onClick={() => trackAd(ad.id)}
              >
                <div className="flex items-start gap-4">
                  {ad.image_url && (
                    <img src={ad.image_url} alt={ad.title} className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                      <h4 className="text-sm font-semibold text-white truncate">{ad.title}</h4>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[9px] font-medium text-indigo-400 flex-shrink-0">AD</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{ad.description}</p>
                    {ad.link_url && (
                      <a
                        href={ad.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {ad.button_text}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default BotsPage;
