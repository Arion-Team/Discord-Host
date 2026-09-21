import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useBrandingStore } from '../../lib/store';
import api from '../../lib/api';
import AuthLayout from './AuthLayout';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const { settings, fetchBranding } = useBrandingStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      setUser(data.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {settings.announcementEnabled && settings.announcementText && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500/20 px-4 py-2 text-center text-sm text-yellow-300 backdrop-blur-sm border-b border-yellow-500/20">
          {settings.announcementText}
        </div>
      )}

      <div className="mx-auto w-full max-w-sm">
        {settings.logo ? (
          <img src={settings.logo} alt="Logo" className="mb-6 h-10 w-auto object-contain" />
        ) : (
          <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-lg font-bold text-black">
            {settings.siteName?.[0] || 'D'}
          </div>
        )}
        <h1 className="text-3xl font-bold text-white">Sign in to {settings.siteName || 'DiscordHost'}</h1>
        <p className="mt-2 text-sm text-gray-400">
          {settings.loginSubtitle || 'Please enter your account credentials below.'}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Username or Email
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="example"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-[#1a1a1a] text-white focus:ring-white/20"
              />
              Remember me
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {settings.registrationEnabled && (
          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:underline">
              Sign up
            </Link>
          </p>
        )}

        {settings.footerText && (
          <p className="mt-8 text-center text-xs text-gray-600">
            {settings.footerText}
          </p>
        )}
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
