'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export default function TwoFactorSetup() {
  const { showToast } = useToast();
  const [step, setStep] = useState<'loading' | 'idle' | 'enrolling' | 'verifying' | 'enabled'>('loading');
  const [qrCode, setQrCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const checkMFAStatus = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter((f) => f.status === 'verified') || [];
    if (verified.length > 0) {
      setStep('enabled');
    } else {
      setStep('idle');
    }
  }, []);

  useEffect(() => {
    checkMFAStatus();
  }, [checkMFAStatus]);

  const handleEnroll = async () => {
    setLoading(true);
    setError('');

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'PSX Tracker',
    });

    if (enrollError) {
      setError(enrollError.message);
      setLoading(false);
      return;
    }

    setQrCode(data.totp.qr_code);
    setFactorId(data.id);
    setStep('verifying');
    setLoading(false);
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Enter a 6-digit code.');
      return;
    }

    setLoading(true);
    setError('');

    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeErr) {
      setError(challengeErr.message);
      setLoading(false);
      return;
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyErr) {
      setError('Invalid code. Check your authenticator and try again.');
      setCode('');
      setLoading(false);
      return;
    }

    setStep('enabled');
    setLoading(false);
    showToast('success', '2FA enabled successfully!');
  };

  const handleDisable = async () => {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp?.[0];

    if (factor) {
      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
        factorId: factor.id,
      });

      if (unenrollErr) {
        showToast('error', unenrollErr.message);
        setLoading(false);
        return;
      }
    }

    setStep('idle');
    setShowDisableConfirm(false);
    setLoading(false);
    showToast('success', '2FA disabled.');
  };

  if (step === 'loading') {
    return (
      <Card hoverable={false}>
        <div className="flex items-center gap-3">
          <Shield size={20} style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Checking 2FA status...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card hoverable={false}>
      <h3
        className="text-base font-semibold mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        <Shield size={18} style={{ color: 'var(--accent-primary)' }} />
        Two-Factor Authentication
      </h3>

      {/* Idle — 2FA not enabled */}
      {step === 'idle' && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add an extra layer of security by enabling 2FA with an authenticator app
            (Google Authenticator, Authy, etc.)
          </p>
          <Button variant="primary" size="md" loading={loading} onClick={handleEnroll}>
            <Shield size={16} />
            Enable 2FA
          </Button>
        </div>
      )}

      {/* Verifying — QR code shown */}
      {step === 'verifying' && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Scan this QR code with your authenticator app, then enter the 6-digit code below.
          </p>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            <div
              className="p-3 rounded-[12px] bg-white"
              style={{ border: '1px solid var(--border-light)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="Scan QR code" className="w-48 h-48" />
            </div>
          </div>

          {/* Code input */}
          <div className="mb-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-xl tracking-[0.4em] py-3 rounded-[12px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
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
              className="text-sm px-4 py-3 rounded-[10px] mb-4"
              style={{
                background: 'rgba(255, 107, 107, 0.1)',
                color: 'var(--accent-danger)',
                border: '1px solid rgba(255, 107, 107, 0.2)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                setStep('idle');
                setCode('');
                setError('');
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={loading} onClick={handleVerify}>
              Verify & Enable
            </Button>
          </div>
        </div>
      )}

      {/* Enabled */}
      {step === 'enabled' && (
        <div>
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-[12px] mb-4"
            style={{
              background: 'rgba(0, 184, 148, 0.1)',
              border: '1px solid rgba(0, 184, 148, 0.2)',
            }}
          >
            <ShieldCheck size={20} style={{ color: 'var(--accent-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--accent-success)' }}>
              Two-factor authentication is enabled
            </span>
          </div>

          {!showDisableConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisableConfirm(true)}
            >
              <ShieldOff size={14} />
              Disable 2FA
            </Button>
          ) : (
            <div
              className="px-4 py-3 rounded-[12px]"
              style={{
                background: 'rgba(255, 107, 107, 0.05)',
                border: '1px solid rgba(255, 107, 107, 0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} style={{ color: 'var(--accent-danger)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--accent-danger)' }}>
                  Are you sure?
                </span>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Disabling 2FA makes your account less secure.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDisableConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={loading}
                  onClick={handleDisable}
                >
                  Disable 2FA
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
