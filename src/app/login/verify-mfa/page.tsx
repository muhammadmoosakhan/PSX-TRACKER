'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Shield } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function VerifyMFAPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const totp = data?.totp?.[0];
      if (totp) {
        setFactorId(totp.id);
      } else {
        // No MFA factor — shouldn't be here
        router.push('/');
      }
    });
    inputRef.current?.focus();
  }, [router]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (code.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }

    setLoading(true);

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError('Invalid code. Please try again.');
      setCode('');
      setLoading(false);
      inputRef.current?.focus();
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
        {/* Icon */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-[16px] flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              boxShadow: '0 8px 24px rgba(108, 92, 231, 0.3)',
            }}
          >
            <Shield size={28} className="text-white" />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            Two-Factor Auth
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
            Enter the 6-digit code from your authenticator app
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
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full text-center text-2xl tracking-[0.5em] py-4 rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-light)',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>

            {error && (
              <div
                className="text-sm px-4 py-3 rounded-[10px] text-center"
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
              Verify
            </Button>
          </form>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: 'var(--text-muted)', opacity: 0.7 }}
        >
          Open your authenticator app (Google Authenticator, Authy, etc.)
          and enter the current code.
        </p>
      </div>
    </div>
  );
}
