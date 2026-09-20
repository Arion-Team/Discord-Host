import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import AuthLayout from './AuthLayout';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white">Set New Password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Enter your new password below
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              New Password
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
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link to="/login" className="text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
