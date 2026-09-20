import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useBrandingStore } from '../../lib/store';
import api from '../../lib/api';
import AuthLayout from './AuthLayout';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/register', { email, username, password });
      setUser(data.user);
      if (data.emailSent) {
        navigate('/verify-email');
      } else {
        navigate('/welcome');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white">Create Account</h1>
        <p className="mt-2 text-sm text-gray-400">
          Please enter your details below to create an account.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="johndoe"
              required
              minLength={3}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="you@example.com"
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
              minLength={8}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
