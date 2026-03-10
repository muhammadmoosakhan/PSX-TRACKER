'use client';

import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const publicPaths = ['/login', '/signup', '/forgot-password', '/auth/callback'];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // Public pages render without sidebar
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Loading spinner while checking auth
  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{
            border: '3px solid var(--border-light)',
            borderTopColor: 'var(--accent-primary)',
          }}
        />
      </div>
    );
  }

  // Not authenticated — show nothing (middleware will redirect)
  if (!user) {
    return null;
  }

  // Authenticated — show full layout
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
