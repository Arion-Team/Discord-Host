import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Activity,
  Plus,
  Github,
  Upload,
  Play,
  Square,
  AlertTriangle,
  HardDrive,
  Cpu,
  Zap,
  Clock,
  TrendingUp,
  ArrowRight,
  Server,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';

interface BotData {
  id: string;
  name: string;
  status: string;
  runtime: string;
  ramMb?: number;
  crashCount?: number;
  lastCrashError?: string | null;
  createdAt: string;
}

interface DashboardStats {
  totalBots: number;
  runningBots: number;
  stoppedBots: number;
  crashedBots: number;
  storageUsedMb: number;
  storageLimitMb: number;
  planName: string;
  ramLimitMb: number;
  maxBots: number;
  ramUsedMb: number;
  bots: { id: string; name: string; ramMb: number; status: string; crashCount: number; lastCrashError: string | null; lastCrashAt: string | null }[];
}

interface ActivityItem {
  action: string;
  details: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  running: 'bg-green-500',
  stopped: 'bg-gray-500',
  crashed: 'bg-red-500',
};

const statusGlow: Record<string, string> = {
  running: 'shadow-lg shadow-green-500/20',
  stopped: '',
  crashed: 'shadow-lg shadow-red-500/20',
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const actionIcons: Record<string, string> = {
  login: '🔑',
  register: '👤',
  create_bot: '🤖',
  start_bot: '▶️',
  stop_bot: '⏹️',
  delete_bot: '🗑️',
  logout: '🚪',
  update_profile: '✏️',
  change_password: '🔒',
  forgot_password: '📧',
};

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [bots, setBots] = useState<BotData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [botsData, statsData, activityData] = await Promise.all([
        api.get('/bots'),
        api.get('/auth/dashboard-stats'),
        api.get('/auth/activity'),
      ]);
      setBots(botsData.bots || []);
      setStats(statsData.stats);
      setActivity(activityData.activity || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#111111] via-[#0a0a0a] to-[#111111] p-8 animate-slide-up">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/[0.02] blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {getGreeting()}, {user?.username || 'User'}
          </h1>
          <p className="mt-2 text-gray-500">
            Here's what's happening with your bots today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/bots/new"
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Create Bot
            </Link>
            <Link
              to="/bots/new"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all duration-200"
            >
              <Github className="h-4 w-4" />
              Import GitHub
            </Link>
            <Link
              to="/bots/new"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/10 transition-all duration-200"
            >
              <Upload className="h-4 w-4" />
              Upload Files
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Bots',
            value: stats?.totalBots ?? 0,
            sub: `${stats?.maxBots || 3} max`,
            icon: Bot,
            color: 'text-white',
            bg: 'bg-white/5',
            delay: '0s',
          },
          {
            label: 'Running',
            value: stats?.runningBots ?? 0,
            sub: `${stats?.stoppedBots || 0} stopped`,
            icon: Play,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            delay: '0.05s',
          },
          {
            label: 'Storage',
            value: stats ? `${(stats.storageUsedMb / 1024).toFixed(1)} GB` : '0 GB',
            sub: `${((stats?.storageLimitMb || 5120) / 1024).toFixed(0)} GB limit`,
            icon: HardDrive,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            delay: '0.1s',
          },
          {
            label: 'RAM',
            value: stats ? `${stats.ramUsedMb} MB` : '0 MB',
            sub: `${stats?.ramLimitMb || 256} MB limit`,
            icon: Cpu,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            delay: '0.15s',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/5 bg-[#111111] p-5 hover-lift animate-slide-up"
            style={{ animationDelay: stat.delay }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
                {stat.sub && <p className="mt-0.5 text-xs text-gray-600">{stat.sub}</p>}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resource Usage */}
      {stats && (stats.totalBots > 0 || stats.ramUsedMb > 0) && (
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-1">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-white">Resource Usage</h2>
            <span className="ml-auto rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-gray-400">{stats.planName}</span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* RAM */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400">RAM</span>
                <span className="text-white font-medium">{stats.ramUsedMb} / {stats.ramLimitMb} MB</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  (stats.ramUsedMb / stats.ramLimitMb) > 0.9 ? 'bg-red-500' : (stats.ramUsedMb / stats.ramLimitMb) > 0.7 ? 'bg-yellow-500' : 'bg-white'
                }`} style={{ width: `${Math.min((stats.ramUsedMb / stats.ramLimitMb) * 100, 100)}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-gray-600">{(stats.ramLimitMb - stats.ramUsedMb).toFixed(0)} MB available</p>
            </div>
            {/* Storage */}
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-400">Storage</span>
                <span className="text-white font-medium">{(stats.storageUsedMb / 1024).toFixed(2)} / {(stats.storageLimitMb / 1024).toFixed(1)} GB</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  (stats.storageUsedMb / stats.storageLimitMb) > 0.9 ? 'bg-red-500' : (stats.storageUsedMb / stats.storageLimitMb) > 0.7 ? 'bg-yellow-500' : 'bg-white'
                }`} style={{ width: `${Math.min((stats.storageUsedMb / stats.storageLimitMb) * 100, 100)}%` }} />
              </div>
              <p className="mt-1.5 text-[10px] text-gray-600">{((stats.storageLimitMb - stats.storageUsedMb) / 1024).toFixed(2)} GB available</p>
            </div>
          </div>
          {/* Per-bot RAM breakdown */}
          {stats.bots && stats.bots.length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Per-Bot RAM Allocation</p>
              <div className="space-y-2">
                {stats.bots.map((b) => (
                  <div key={b.id}>
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${b.status === 'running' ? 'bg-green-500' : b.status === 'crashed' ? 'bg-red-500' : 'bg-gray-600'}`} />
                      <span className="text-xs text-gray-400 flex-1 truncate">{b.name}</span>
                      <span className="text-xs text-white font-medium">{b.ramMb} MB</span>
                      <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-white/40" style={{ width: `${(b.ramMb / stats.ramLimitMb) * 100}%` }} />
                      </div>
                    </div>
                    {b.status === 'crashed' && b.lastCrashError && (
                      <div className="mt-1 ml-5 rounded bg-red-500/5 px-2 py-1 text-[10px] text-red-400/70 truncate">
                        {b.lastCrashError.length > 80 ? b.lastCrashError.substring(0, 80) + '...' : b.lastCrashError}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bots List */}
        <div className="lg:col-span-2 rounded-xl border border-white/5 bg-[#111111] animate-slide-up-delay-1">
          <div className="flex items-center justify-between border-b border-white/5 p-5">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-white">Your Bots</h2>
            </div>
            <Link
              to="/bots"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : bots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-4">
                <Bot className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No bots yet</p>
              <p className="text-sm text-gray-600 mt-1">Create your first bot to get started</p>
              <Link
                to="/bots/new"
                className="mt-4 flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Bot
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {bots.slice(0, 5).map((bot, i) => (
                <Link
                  key={bot.id}
                  to={`/bots/${bot.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition-all hover:bg-white/[0.02] group animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`h-2.5 w-2.5 rounded-full ${statusColors[bot.status] || 'bg-gray-500'} ${statusGlow[bot.status] || ''}`} />
                      {bot.status === 'running' && (
                        <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-green-500 animate-ping opacity-75" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                        {bot.name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {bot.runtime} &middot; {bot.ramMb || 256} MB RAM &middot; {timeAgo(bot.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bot.status === 'crashed' && (
                      <span className="text-[10px] text-red-400" title={bot.lastCrashError || 'Crashed'}>
                        {bot.crashCount || 1}x crash
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      bot.status === 'running'
                        ? 'bg-green-500/10 text-green-400'
                        : bot.status === 'crashed'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-white/5 text-gray-500'
                    }`}>
                      {bot.status}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="rounded-xl border border-white/5 bg-[#111111] animate-slide-up-delay-2">
          <div className="flex items-center justify-between border-b border-white/5 p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
            </div>
          </div>
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Activity className="h-8 w-8 text-gray-700 mb-3" />
              <p className="text-sm text-gray-600">No activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto scrollbar-thin">
              {activity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-3 animate-fade-in"
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span className="text-base mt-0.5">{actionIcons[item.action] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{item.details}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{timeAgo(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="grid gap-4 sm:grid-cols-3 animate-slide-up-delay-3">
        {[
          {
            icon: Github,
            title: 'Import from GitHub',
            desc: 'Paste any public repo URL to instantly deploy a bot.',
            link: '/bots/new',
          },
          {
            icon: Upload,
            title: 'Upload Files',
            desc: 'Drag & drop or upload ZIP files to host your bot.',
            link: '/bots/new',
          },
          {
            icon: Cpu,
            title: 'Monitor Resources',
            desc: 'Track CPU, memory, and uptime in real-time.',
            link: '/bots',
          },
        ].map((tip) => (
          <Link
            key={tip.title}
            to={tip.link}
            className="group rounded-xl border border-white/5 bg-[#111111] p-5 transition-all duration-200 hover:border-white/10 hover:bg-[#151515] hover-lift"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 mb-3 group-hover:bg-white/10 transition-colors">
              <tip.icon className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-sm font-semibold text-white">{tip.title}</h3>
            <p className="mt-1 text-xs text-gray-500">{tip.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
