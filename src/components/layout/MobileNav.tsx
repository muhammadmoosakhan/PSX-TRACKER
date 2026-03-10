'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Briefcase,
  BarChart3,
  Settings,
} from 'lucide-react';

const tabs = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: ArrowLeftRight },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Analysis', href: '/analysis', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0 z-50
        flex items-center justify-around
        h-16 border-t lg:hidden
        backdrop-blur-lg
      "
      style={{
        background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
        borderColor: 'var(--border-light)',
      }}
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-col items-center gap-0.5 py-2 px-3 relative transition-all duration-200"
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
    </nav>
  );
}
