import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import AuthLayout from './AuthLayout';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-3xl font-bold text-white">Reset Password</h1>
        <p className="mt-2 text-sm text-gray-400">
          Enter your email to receive a reset link
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center text-sm text-green-400">
            If an account exists with that email, you'll receive a password reset link shortly.
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition-all hover:bg-gray-100 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          <Link to="/login" className="text-white hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
