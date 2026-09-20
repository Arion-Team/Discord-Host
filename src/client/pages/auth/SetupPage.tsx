import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Shield, CheckCircle, AlertCircle, Lock, Mail, User } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../lib/store';

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.get('/auth/setup-check');
        if (!data.setupRequired) {
          navigate('/login', { replace: true });
          return;
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    check();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

    setSubmitting(true);
    try {
      const data = await api.post('/auth/setup', { email, username, password });
      if (data.user) setUser(data.user);
      setSetupDone(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (setupDone) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Setup Complete</h1>
          <p className="mt-2 text-gray-500">Admin account created. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome to DiscordHost</h1>
          <p className="mt-2 text-gray-500">Create your admin account to get started</p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 animate-fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-white/5 bg-[#111111] p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">
              <Mail className="mr-1 inline h-4 w-4" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">
              <User className="mr-1 inline h-4 w-4" /> Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="admin"
              minLength={3}
              maxLength={30}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">
              <Lock className="mr-1 inline h-4 w-4" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Min 8 characters"
              minLength={8}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">
              <Lock className="mr-1 inline h-4 w-4" /> Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="Repeat password"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-gray-100 disabled:opacity-50 transition-all"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {submitting ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          This is a one-time setup. Only you will have admin access.
        </p>
      </div>
    </div>
  );
};

export default SetupPage;
