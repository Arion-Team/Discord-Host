import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Search,
  Loader2,
  AlertCircle,
  Filter,
  Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import PageTransition from '../../components/PageTransition';

const BotLogsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const logEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get(`/bots/${id}/logs`);
      setLogs(data.logs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((line) => {
    if (search && !line.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'info' && !line.match(/^(info|>\s)/i)) return false;
    if (filter === 'warn' && !line.match(/warn/i)) return false;
    if (filter === 'error' && !line.match(/error|ERR|throw/i)) return false;
    return true;
  });

  const downloadLogs = () => {
    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-${id}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLineColor = (line: string) => {
    if (line.match(/error|ERR|throw|crash/i)) return 'text-red-400';
    if (line.match(/warn/i)) return 'text-yellow-400';
    if (line.match(/success|started|running/i)) return 'text-green-400';
    return 'text-gray-400';
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <Link to={`/bots/${id}`} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white transition-all">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Bot Logs</h1>
              <p className="text-xs text-gray-600">Real-time logs for this bot</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoScroll(!autoScroll)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${autoScroll ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'}`}>
              Auto-scroll {autoScroll ? 'ON' : 'OFF'}
            </button>
            <button onClick={downloadLogs}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white transition-all">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="flex gap-2 animate-slide-up-delay-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full rounded-lg border border-white/5 bg-[#111111] py-2 pl-9 pr-4 text-sm text-white placeholder-gray-600 focus:border-white/20 focus:outline-none transition-all" />
          </div>
          <div className="flex gap-1 rounded-lg border border-white/5 bg-[#111111] p-1">
            {(['all', 'info', 'warn', 'error'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${filter === f ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-[#111111] py-16 text-center animate-fade-in">
            <p className="text-gray-600">No logs yet</p>
            <p className="text-xs text-gray-700 mt-1">Start the bot to see logs</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#0a0a0a] p-4 font-mono text-xs max-h-[600px] overflow-y-auto scrollbar-thin animate-fade-in">
            {filteredLogs.map((line, i) => (
              <div key={i} className={`py-0.5 leading-relaxed ${getLineColor(line)}`}>
                <span className="text-gray-700 mr-3 select-none">{String(i + 1).padStart(4, '0')}</span>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default BotLogsPage;
