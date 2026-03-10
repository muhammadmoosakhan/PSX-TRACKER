'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error: authError } = await resetPassword(email);

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-[420px] animate-[fade-in_0.5s_ease-out]">
          <div
            className="rounded-[20px] p-8 border text-center"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-light)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(0, 184, 148, 0.1)' }}
            >
              <CheckCircle size={32} style={{ color: 'var(--accent-success)' }} />
            </div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
            >
              Check your email
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              If an account exists for <strong>{email}</strong>, we sent a password reset link.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
            Reset Password
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            We&apos;ll send you a reset link
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Send Reset Link
            </Button>
          </form>
        </div>

        {/* Back link */}
        <p className="text-center text-sm mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft size={14} />
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
