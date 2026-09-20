import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Terminal, ChevronLeft, Trash2, Loader2, ArrowDown } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import api from '../../lib/api';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}

function getLogLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return 'text-red-400';
    case 'warn':
      return 'text-yellow-400';
    case 'debug':
      return 'text-gray-500';
    case 'info':
    default:
      return 'text-blue-400';
  }
}

function getLogLevelBg(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return 'bg-red-500/10';
    case 'warn':
      return 'bg-yellow-500/10';
    case 'debug':
      return 'bg-gray-500/10';
    case 'info':
    default:
      return 'bg-blue-500/10';
  }
}

const BotConsolePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [autoScroll]);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!id) return;
      try {
        const data = await api.get(`/bots/${id}/logs?limit=500`);
        setLogs((data.logs || []).reverse());
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const socket = io(window.location.origin, {
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.emit('join-bot', id);

    socket.on('bot-log', (entry: LogEntry) => {
      setLogs((prev) => [...prev, entry]);
    });

    return () => {
      socket.emit('leave-bot', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [autoScroll, scrollToBottom]);

  const handleClear = () => {
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/bots/${id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Console</h1>
          <p className="mt-1 text-gray-400">Real-time logs for this bot.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              autoScroll
                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                : 'border-white/10 text-gray-300 hover:bg-white/5'
            }`}
          >
            <ArrowDown className="h-4 w-4" />
            Auto-scroll
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-white/5"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-gray-950 p-4 backdrop-blur-sm">
        <div
          ref={logContainerRef}
          className="h-[500px] overflow-y-auto font-mono text-sm scrollbar-thin"
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-gray-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-gray-600">
              <div className="text-center">
                <Terminal className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">No logs to display</p>
              </div>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={log.id || i}
                className={`flex items-start gap-2 py-0.5 ${getLogLevelColor(log.level)}`}
              >
                <span className="text-gray-600 shrink-0 text-xs mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`shrink-0 rounded px-1 text-xs font-medium uppercase ${getLogLevelBg(
                    log.level
                  )} ${getLogLevelColor(log.level)}`}
                >
                  {log.level}
                </span>
                <span className="break-all text-gray-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BotConsolePage;
