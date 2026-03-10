'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Briefcase,
  BarChart3,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  LogOut,
  Activity,
  LineChart,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useAvatar } from '@/hooks/useAvatar';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: ArrowLeftRight },
  { label: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { label: 'Analysis', href: '/analysis', icon: BarChart3 },
  { label: 'Market', href: '/market', icon: Activity },
  { label: 'Stocks', href: '/stocks', icon: LineChart },
  { label: 'Risk', href: '/risk', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();
  const { avatarUrl } = useAvatar();

  const userEmail = user?.email || '';
  const userInitial = userEmail.charAt(0).toUpperCase() || 'U';
  let displayEmail = '';
  if (!collapsed) {
    displayEmail = userEmail.length > 20 ? userEmail.slice(0, 18) + '...' : userEmail;
  }

  const handleSignOut = async () => {
    await signOut();
    globalThis.location.href = '/login';
  };

  return (
    <aside
      className={`
        hidden lg:flex flex-col h-screen sticky top-0
        border-r transition-all duration-300 ease-out
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b" style={{ borderColor: 'var(--border-light)' }}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-primary)' }}
        >
          <TrendingUp size={18} className="text-white" />
        </div>
        {!collapsed && (
          <span
            className="font-bold text-base whitespace-nowrap"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            PSX Tracker
          </span>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-[12px]
                transition-all duration-200 ease-out group
                ${isActive
                  ? 'text-white font-semibold'
                  : 'hover:scale-[1.02]'
                }
              `}
              style={{
                background: isActive ? 'var(--accent-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-secondary)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t space-y-3" style={{ borderColor: 'var(--border-light)' }}>
        {/* User info */}
        {user && (
          <div
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-2'} py-2`}
          >
            <Avatar src={avatarUrl} initial={userInitial} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {displayEmail}
                </p>
              </div>
            )}
          </div>
        )}

        <div className={`flex ${collapsed ? 'justify-center' : 'justify-between'} items-center`}>
          {!collapsed && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Theme
            </span>
          )}
          <ThemeToggle />
        </div>

        {/* Sign out */}
        {user && (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-[10px] text-xs transition-all hover:scale-[1.02] cursor-pointer"
            style={{
              background: 'rgba(255, 107, 107, 0.08)',
              color: 'var(--accent-danger)',
            }}
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-[10px] text-xs transition-all hover:scale-[1.02] cursor-pointer"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
