'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        relative w-10 h-10 rounded-[12px] flex items-center justify-center
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95 cursor-pointer
      "
      style={{
        background: 'var(--bg-secondary)',
        color: 'var(--text-secondary)',
      }}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="transition-transform duration-300" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </div>
    </button>
  );
}
