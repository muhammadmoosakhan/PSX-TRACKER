'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const { error: authError, mfaRequired } = await signIn(email, password);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (mfaRequired) {
      router.push('/login/verify-mfa');
      return;
    }

    router.push('/');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="w-full max-w-[420px] animate-[fade-in_0.5s_ease-out]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.3)',
            }}
          >
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            PSX Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Sign in to your portfolio
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-[20px] p-8 border"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border-light)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 text-sm rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-light)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm px-4 py-3 rounded-[10px]"
                style={{
                  background: 'rgba(255, 107, 107, 0.1)',
                  color: 'var(--accent-danger)',
                  border: '1px solid rgba(255, 107, 107, 0.2)',
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Sign In
            </Button>
          </form>

          {/* Links */}
          <div className="mt-5 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-medium hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Sign up
          </Link>
        </p>

        {/* Disclaimer */}
        <p
          className="text-center text-xs mt-4"
          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
        >
          PSX Portfolio Tracker is a personal tool. Not financial advice.
        </p>
      </div>
    </div>
  );
}
