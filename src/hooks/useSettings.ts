'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/lib/constants';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS as AppSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('settings')
        .select('*');

      if (err) throw err;

      if (data && data.length > 0) {
        const map = { ...DEFAULT_SETTINGS } as AppSettings;
        for (const row of data) {
          if (row.key in map) {
            (map as Record<string, number>)[row.key] = Number(row.value);
          }
        }
        setSettings(map);
      }
      setError(null);
    } catch (e) {
      console.error('Error fetching settings:', e);
      setError('Unable to load settings. Using defaults.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = useCallback(async (key: string, value: number) => {
    try {
      // Get the current user's ID for RLS-compliant upsert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Cannot update setting: user not authenticated');
        return false;
      }

      const { error: err } = await supabase
        .from('settings')
        .upsert(
          { user_id: user.id, key, value },
          { onConflict: 'user_id,key' }
        );

      if (err) {
        console.error('Supabase upsert error:', err.message, err.details, err.hint);
        throw err;
      }

      setSettings((prev) => ({ ...prev, [key]: value }));
      return true;
    } catch (e) {
      console.error('Error updating setting:', e);
      return false;
    }
  }, []);

  const resetSettings = useCallback(async (): Promise<boolean> => {
    try {
      // Delete all user settings — will fall back to defaults
      const { error: err } = await supabase
        .from('settings')
        .delete()
        .neq('key', '__nonexistent__');
      if (err) throw err;
      setSettings(DEFAULT_SETTINGS as AppSettings);
      return true;
    } catch (e) {
      console.error('Error resetting settings:', e);
      return false;
    }
  }, []);

  return { settings, loading, error, updateSetting, resetSettings, refreshSettings: fetchSettings };
}
