'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '@/types';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    // Read saved theme from localStorage (UI preference — exception to no-localStorage rule)
    const saved = localStorage.getItem('psx-theme') as ThemeMode | null;
    if (saved) {
      applyTheme(saved);
      setThemeState(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
      setThemeState('dark');
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    const resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  };

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem('psx-theme', mode);
    applyTheme(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [theme, setTheme]);

  const isDark = theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, toggleTheme, isDark };
}
