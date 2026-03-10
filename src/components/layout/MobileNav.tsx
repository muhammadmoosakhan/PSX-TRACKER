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
      className="
        fixed bottom-0 left-0 right-0 z-50
        flex items-center
        h-16 border-t lg:hidden
        backdrop-blur-lg
        overflow-x-auto
        [&::-webkit-scrollbar]:hidden
      "
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
        borderColor: 'var(--border-light)',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as React.CSSProperties}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-0.5 py-2 px-2.5 relative transition-all duration-200 flex-shrink-0"
            style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
          >
            {isActive && (
              <div
                className="absolute -top-0.5 w-5 h-0.5 rounded-full"
                style={{ background: 'var(--accent-primary)' }}
              />
            )}
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}

      {/* Profile / Settings tab — shows avatar */}
      <Link
        href="/settings"
        className="flex flex-col items-center gap-0.5 py-2 px-2.5 relative transition-all duration-200 flex-shrink-0"
        style={{ color: isSettingsActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        {isSettingsActive && (
          <div
            className="absolute -top-0.5 w-5 h-0.5 rounded-full"
            style={{ background: 'var(--accent-primary)' }}
          />
        )}
        <Avatar
          src={avatarUrl}
          initial={userInitial}
          size="xs"
          className={isSettingsActive ? 'ring-2 ring-[var(--accent-primary)]' : ''}
        />
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
