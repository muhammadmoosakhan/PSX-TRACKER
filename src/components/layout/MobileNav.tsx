'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Briefcase,
  BarChart3,
  Activity,
  LineChart,
  Newspaper,
  Shield,
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: ArrowLeftRight },
  { label: 'Market', href: '/market', icon: Activity },
  { label: 'Stocks', href: '/stocks', icon: LineChart },
  { label: 'News', href: '/news', icon: Newspaper },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Analysis', href: '/analysis', icon: BarChart3 },
  { label: 'Risk', href: '/risk', icon: Shield },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { avatarUrl } = useAvatar();

  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U';
  const isSettingsActive = pathname.startsWith('/settings');

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t lg:hidden backdrop-blur-lg overflow-x-auto [&::-webkit-scrollbar]:hidden"
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
        borderColor: 'var(--border-light)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
    >
      {/* 8 tabs total, 5 visible at a time — each tab = 20vw (100/5) */}
      <div className="flex items-center h-full" style={{ width: 'max-content' }}>
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-1 relative transition-all duration-200"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                width: '20vw',
                minWidth: '20vw',
                height: '100%',
              }}
            >
              {isActive && (
                <div
                  className="absolute top-0 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} className="shrink-0" />
              <span className="text-[11px] font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}

        {/* Profile / Settings tab */}
        <Link
          href="/settings"
          className="flex flex-col items-center justify-center gap-1 relative transition-all duration-200"
          style={{
            color: isSettingsActive ? 'var(--accent-primary)' : 'var(--text-muted)',
            width: '20vw',
            minWidth: '20vw',
            height: '100%',
          }}
        >
          {isSettingsActive && (
            <div
              className="absolute top-0 w-6 h-0.5 rounded-full"
              style={{ background: 'var(--accent-primary)' }}
            />
          )}
          <Avatar
            src={avatarUrl}
            initial={userInitial}
            size="xs"
            className={isSettingsActive ? 'ring-2 ring-[var(--accent-primary)]' : ''}
          />
          <span className="text-[11px] font-medium whitespace-nowrap">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
