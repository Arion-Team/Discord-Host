import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import api from '../../lib/api';
import AuthLayout from './AuthLayout';

const VerifyEmailPage: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((c) => c !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''));
      setCode(newCode);
      if (pasted.length === 6) {
        handleVerify(pasted);
      } else {
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      }
    }
  };

  const handleVerify = async (codeStr: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/verify-email', { code: codeStr });
      setSuccess(true);
      setTimeout(() => navigate('/welcome', { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification');
      setCooldown(60);
    } catch {
      // ignore
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="mx-auto w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Email Verified!</h1>
          <p className="mt-2 text-sm text-gray-400">Redirecting you to the dashboard...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <Mail className="h-7 w-7 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white">Verify your email</h1>
        <p className="mt-2 text-sm text-gray-400">
          We sent a 6-digit code to <span className="text-gray-300">{user?.email}</span>
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              disabled={loading || success}
              className="h-14 w-12 rounded-xl border border-white/10 bg-[#1a1a1a] text-center text-xl font-bold text-white focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all disabled:opacity-50"
            />
          ))}
        </div>

        {loading && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-white hover:underline disabled:text-gray-600 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : resending ? (
                'Sending...'
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Resend
                </>
              )}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-600">
          Code expires in 15 minutes
        </p>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
