import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Users,
  Bot,
  RefreshCw,
  Loader2,
  Wifi,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';
import PageTransition from '../../components/PageTransition';

interface SystemStatus {
  platform: string;
  arch: string;
  hostname: string;
  uptime: number;
  nodeVersion: string;
  cpuCount: number;
  cpuModel: string;
  cpuUsage: number;
  loadAverage: { '1m': number; '5m': number; '15m': number };
  memory: { total: number; used: number; free: number; percent: number };
  stats: { totalBots: number; runningBots: number; totalUsers: number };
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const SystemStatusPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.get('/admin/system-status');
      setStatus(data.status);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!status) return null;

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-white">System Status</h1>
            <p className="mt-1 text-gray-500">Server health and performance metrics</p>
          </div>
          <button onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-all">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Indicators */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Server', value: 'Online', icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Uptime', value: formatUptime(status.uptime), icon: Clock, color: 'text-white', bg: 'bg-white/5' },
            { label: 'Platform', value: `${status.platform}/${status.arch}`, icon: Server, color: 'text-white', bg: 'bg-white/5' },
            { label: 'Node.js', value: status.nodeVersion, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10' },
          ].map((item, i) => (
            <div key={item.label} className="rounded-xl border border-white/5 bg-[#111111] p-4 animate-slide-up"
              style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bg}`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-medium text-white">{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* CPU */}
          <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <Cpu className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">CPU</h2>
                <p className="text-xs text-gray-600">{status.cpuModel}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-white">{status.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${Math.min(status.cpuUsage, 100)}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: '1 min', value: status.loadAverage['1m'].toFixed(2) },
                  { label: '5 min', value: status.loadAverage['5m'].toFixed(2) },
                  { label: '15 min', value: status.loadAverage['15m'].toFixed(2) },
                ].map((avg) => (
                  <div key={avg.label} className="rounded-lg bg-[#0a0a0a] p-2">
                    <p className="text-[10px] text-gray-600">{avg.label}</p>
                    <p className="text-sm font-medium text-white">{avg.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600">{status.cpuCount} cores</p>
            </div>
          </div>

          {/* Memory */}
          <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5">
                <HardDrive className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Memory</h2>
                <p className="text-xs text-gray-600">{status.memory.used} MB / {status.memory.total} MB</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-white">{status.memory.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-white transition-all duration-500"
                    style={{ width: `${status.memory.percent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-center">
                  <p className="text-[10px] text-gray-600">Used</p>
                  <p className="text-sm font-medium text-white">{status.memory.used} MB</p>
                </div>
                <div className="rounded-lg bg-[#0a0a0a] p-3 text-center">
                  <p className="text-[10px] text-gray-600">Free</p>
                  <p className="text-sm font-medium text-white">{status.memory.free} MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 animate-slide-up-delay-3">
          <h2 className="text-sm font-semibold text-white mb-4">Platform Overview</h2>
          <div className="grid gap-4 grid-cols-3">
            <div className="rounded-lg bg-[#0a0a0a] p-4 text-center">
              <Bot className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{status.stats.totalBots}</p>
              <p className="text-[10px] text-gray-600">Total Bots</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4 text-center">
              <Activity className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{status.stats.runningBots}</p>
              <p className="text-[10px] text-gray-600">Running</p>
            </div>
            <div className="rounded-lg bg-[#0a0a0a] p-4 text-center">
              <Users className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{status.stats.totalUsers}</p>
              <p className="text-[10px] text-gray-600">Users</p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SystemStatusPage;
