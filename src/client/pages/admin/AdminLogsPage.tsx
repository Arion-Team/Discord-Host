import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
} from 'lucide-react';
import api from '../../lib/api';

interface LogEntry {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details: string;
  timestamp: string;
}

const ITEMS_PER_PAGE = 20;

const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/activity?limit=200');
      setLogs(data.activity || data.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      log.username?.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q);
    const matchAction = !actionFilter || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    return matchSearch && matchAction;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [search, actionFilter]);

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const getActionColor = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('start') || a.includes('deploy')) return 'text-green-400 bg-green-500/10';
    if (a.includes('delete') || a.includes('crash') || a.includes('error') || a.includes('fail')) return 'text-red-400 bg-red-500/10';
    if (a.includes('update') || a.includes('edit') || a.includes('modify')) return 'text-yellow-400 bg-yellow-500/10';
    if (a.includes('stop')) return 'text-orange-400 bg-orange-500/10';
    if (a.includes('login') || a.includes('auth')) return 'text-purple-400 bg-purple-500/10';
    return 'text-blue-400 bg-blue-500/10';
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Details'].join(','),
      ...filtered.map((l) =>
        [
          l.timestamp,
          l.username || 'System',
          l.action,
          `"${l.details.replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <h1 className="text-2xl font-bold text-white">Logs</h1>
          <p className="mt-1 text-gray-400">View system and activity logs.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
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
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-gray-600" />
            <p className="mt-4 text-gray-400">No logs found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                    <th className="px-6 py-3 font-medium">Timestamp</th>
                    <th className="px-6 py-3 font-medium">User</th>
                    <th className="px-6 py-3 font-medium">Action</th>
                    <th className="px-6 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginated.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="whitespace-nowrap px-6 py-3 text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-white">{log.username || 'System'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="max-w-md truncate px-6 py-3 text-gray-400">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-3">
              <p className="text-xs text-gray-500">
                Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}-
                {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`h-8 w-8 rounded-lg text-sm ${
                        page === pageNum
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminLogsPage;
