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
  const isSettingsActive = pathname === '/settings';

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
      <div className="flex items-center h-full w-max min-w-full px-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200"
              style={{
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                minWidth: '56px',
                width: '56px',
                height: '100%',
              }}
            >
              {isActive && (
                <div
                  className="absolute top-0 w-5 h-0.5 rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}

        {/* Profile / Settings tab */}
        <Link
          href="/settings"
          className="flex flex-col items-center justify-center gap-0.5 relative transition-all duration-200"
          style={{
            color: isSettingsActive ? 'var(--accent-primary)' : 'var(--text-muted)',
            minWidth: '56px',
            width: '56px',
            height: '100%',
          }}
        >
          {isSettingsActive && (
            <div
              className="absolute top-0 w-5 h-0.5 rounded-full"
              style={{ background: 'var(--accent-primary)' }}
            />
          )}
          <Avatar
            src={avatarUrl}
            initial={userInitial}
            size="xs"
            className={isSettingsActive ? 'ring-2 ring-[var(--accent-primary)]' : ''}
          />
          <span className="text-[10px] font-medium whitespace-nowrap">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
