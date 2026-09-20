import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  AlertTriangle,
  Shield,
  ShieldOff,
  ChevronDown,
  ChevronUp,
  Mail,
  Calendar,
  HardDrive,
} from 'lucide-react';
import api from '../../lib/api';

interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  plan?: string;
  storageUsed?: number;
  storageLimit?: number;
  suspended?: boolean;
  createdAt: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'username' | 'email' | 'role' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/users');
      setUsers(data.users || data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSuspend = async (userId: string, suspend: boolean) => {
    setActingId(userId);
    try {
      await api.put(`/admin/users/${userId}/suspend`, { suspended: suspend });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, suspended: suspend } : u))
      );
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: 'user' | 'admin') => {
    setActingId(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronDown className="ml-1 inline h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  };

  const filtered = users
    .filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'suspended' ? u.suspended : !u.suspended);
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
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
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-gray-400">Manage platform users.</p>
        </div>
        <button
          onClick={fetchUsers}
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
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('username')}>
                    Username <SortIcon col="username" />
                  </th>
                  <th className="px-6 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('email')}>
                    Email <SortIcon col="email" />
                  </th>
                  <th className="px-6 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('role')}>
                    Role <SortIcon col="role" />
                  </th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Storage</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                    Created <SortIcon col="createdAt" />
                  </th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-medium text-indigo-400">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{user.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{user.plan || 'Free'}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {user.storageUsed != null && user.storageLimit != null
                        ? `${(user.storageUsed / 1024 / 1024 / 1024).toFixed(1)} / ${(user.storageLimit / 1024 / 1024 / 1024).toFixed(1)} GB`
                        : '-'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.suspended ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {user.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRoleChange(user.id, user.role === 'admin' ? 'user' : 'admin')}
                          disabled={actingId === user.id}
                          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
                          title={user.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        >
                          {user.role === 'admin' ? (
                            <ShieldOff className="h-3.5 w-3.5" />
                          ) : (
                            <Shield className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleSuspend(user.id, !user.suspended)}
                          disabled={actingId === user.id}
                          className={`rounded-lg border border-white/10 px-2 py-1 text-xs hover:disabled:opacity-50 ${
                            user.suspended
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                          title={user.suspended ? 'Unsuspend' : 'Suspend'}
                        >
                          {user.suspended ? 'Unsuspend' : 'Suspend'}
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

export default AdminUsersPage;
