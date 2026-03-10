'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Clock, FileText, CheckCircle, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationSection() {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local state for form
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [marketOpen, setMarketOpen] = useState(true);
  const [marketClose, setMarketClose] = useState(true);
  const [dailyReport, setDailyReport] = useState(true);

  // Sync local state when preferences finish loading
  useEffect(() => {
    setEnabled(preferences.enabled);
    setEmail(preferences.email || user?.email || '');
    setMarketOpen(preferences.market_open);
    setMarketClose(preferences.market_close);
    setDailyReport(preferences.daily_report);
  }, [preferences, user]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await updatePreferences({
      enabled,
      email,
      market_open: marketOpen,
      market_close: marketClose,
      daily_report: dailyReport,
    });
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <Card hoverable={false}>
        <div className="flex items-center gap-3">
          <Bell size={20} style={{ color: 'var(--text-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading notification preferences...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card hoverable={false}>
      {/* Header */}
      <h3
        className="text-base font-semibold mb-4 flex items-center gap-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
      >
        <Bell size={18} style={{ color: 'var(--accent-primary)' }} />
        Email Notifications
      </h3>

      {/* Enable/Disable toggle */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Enable Notifications
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Receive email alerts for market events
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled(!enabled)}
          className="relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0"
          style={{
            background: enabled ? 'var(--accent-success)' : 'var(--bg-secondary)',
            border: enabled ? 'none' : '1px solid var(--border-light)',
          }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full transition-transform duration-200"
            style={{
              background: 'white',
              left: enabled ? '22px' : '2px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          />
        </button>
      </div>

      {/* Notification options — visible when enabled */}
      {enabled && (
        <div className="space-y-4">
          {/* Email input */}
          <div>
            <label
              className="text-sm font-medium mb-1.5 flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Mail size={14} />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2.5 text-sm rounded-[10px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-opacity-30"
              style={{
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-light)',
              }}
            />
          </div>

          {/* Checkbox options */}
          <div className="space-y-3">
            {/* Market Open */}
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setMarketOpen(!marketOpen)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                style={{
                  background: marketOpen ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  border: marketOpen ? 'none' : '1px solid var(--border-light)',
                }}
              >
                {marketOpen && <Check size={14} color="white" />}
              </button>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Market Open Alerts
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    9:30 AM PKT
                  </p>
                </div>
              </div>
            </label>

            {/* Market Close */}
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setMarketClose(!marketClose)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                style={{
                  background: marketClose ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  border: marketClose ? 'none' : '1px solid var(--border-light)',
                }}
              >
                {marketClose && <Check size={14} color="white" />}
              </button>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Market Close Summary
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    3:30 PM PKT
                  </p>
                </div>
              </div>
            </label>

            {/* Daily Report */}
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                onClick={() => setDailyReport(!dailyReport)}
                className="w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                style={{
                  background: dailyReport ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  border: dailyReport ? 'none' : '1px solid var(--border-light)',
                }}
              >
                {dailyReport && <Check size={14} color="white" />}
              </button>
              <div className="flex items-center gap-2">
                <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Daily Portfolio Report
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    End-of-day summary of your holdings
                  </p>
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="mt-5 flex items-center gap-3">
        <Button
          variant="primary"
          size="md"
          loading={saving}
          onClick={handleSave}
        >
          Save Preferences
        </Button>

        {saved && (
          <span
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity duration-200"
            style={{ color: 'var(--accent-success)' }}
          >
            <CheckCircle size={16} />
            Saved!
          </span>
        )}
      </div>

      {/* SMTP note */}
      <p
        className="text-xs mt-4"
        style={{ color: 'var(--text-muted)' }}
      >
        Requires SMTP configuration in server environment
      </p>
    </Card>
  );
}
