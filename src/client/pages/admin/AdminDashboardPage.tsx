import React, { useState, useEffect } from 'react';
import {
  Users,
  Bot,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  AlertTriangle,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import api from '../../lib/api';

interface DashboardStats {
  totalUsers: number;
  totalBots: number;
  runningBots: number;
  crashedBots: number;
  cpu: number;
  ram: number;
  storage: number;
}

interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity?limit=10'),
      ]);
      setStats(statsRes.stats || statsRes);
      setActivity(activityRes.activity || activityRes.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('start')) return 'text-green-400 bg-green-500/10';
    if (a.includes('delete') || a.includes('crash') || a.includes('error')) return 'text-red-400 bg-red-500/10';
    if (a.includes('update') || a.includes('edit')) return 'text-yellow-400 bg-yellow-500/10';
    if (a.includes('stop')) return 'text-orange-400 bg-orange-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-gray-400">Overview of the platform.</p>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center backdrop-blur-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-gray-400">Overview of the platform.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          color="text-indigo-400"
        />
        <StatCard
          label="Total Bots"
          value={stats?.totalBots ?? 0}
          icon={Bot}
          color="text-green-400"
        />
        <StatCard
          label="Running Bots"
          value={stats?.runningBots ?? 0}
          icon={Zap}
          color="text-emerald-400"
        />
        <StatCard
          label="Crashed Bots"
          value={stats?.crashedBots ?? 0}
          icon={AlertTriangle}
          color="text-red-400"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-gray-400">System CPU</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.cpu ?? 0}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-purple-400 transition-all"
              style={{ width: `${Math.min(stats?.cpu ?? 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <MemoryStick className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-400">System RAM</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.ram ?? 0}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-blue-400 transition-all"
              style={{ width: `${Math.min(stats?.ram ?? 0, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <HardDrive className="h-5 w-5 text-amber-400" />
            <span className="text-sm text-gray-400">Storage</span>
          </div>
          <p className="mt-2 text-3xl font-bold text-white">{stats?.storage ?? 0}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.min(stats?.storage ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <span className="text-xs text-gray-500">{activity.length} entries</span>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-10 w-10 text-gray-600" />
            <p className="mt-3 text-gray-400">No recent activity</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                  <th className="px-6 py-3 font-medium">Details</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activity.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-white">{log.username || 'System'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-6 py-3 text-gray-400">{log.details}</td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
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

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
  color: string;
}> = ({ label, value, icon: Icon, color }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      </div>
      <Icon className={`h-8 w-8 ${color}`} />
    </div>
  </div>
);

export default AdminDashboardPage;
