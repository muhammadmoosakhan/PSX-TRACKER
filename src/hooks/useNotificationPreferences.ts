'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface NotificationPreferences {
  enabled: boolean;
  email: string;
  market_open: boolean;
  market_close: boolean;
  daily_report: boolean;
}

const DEFAULTS: NotificationPreferences = {
  enabled: false,
  email: '',
  market_open: true,
  market_close: true,
  daily_report: true,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: err } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (err && err.code !== 'PGRST116') throw err; // PGRST116 = no rows

      if (data) {
        setPreferences({
          enabled: data.enabled ?? false,
          email: data.email || user.email || '',
          market_open: data.market_open ?? true,
          market_close: data.market_close ?? true,
          daily_report: data.daily_report ?? true,
        });
      } else {
        setPreferences({ ...DEFAULTS, email: user.email || '' });
      }
      setError(null);
    } catch (e) {
      console.error('Error fetching notification preferences:', e);
      setError('Unable to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (prefs: Partial<NotificationPreferences>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const updated = { ...preferences, ...prefs };

      const { error: err } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          enabled: updated.enabled,
          email: updated.email,
          market_open: updated.market_open,
          market_close: updated.market_close,
          daily_report: updated.daily_report,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (err) throw err;

      setPreferences(updated);
      return true;
    } catch (e) {
      console.error('Error updating notification preferences:', e);
      return false;
    }
  }, [preferences]);

  return { preferences, loading, error, updatePreferences, refreshPreferences: fetchPreferences };
}
