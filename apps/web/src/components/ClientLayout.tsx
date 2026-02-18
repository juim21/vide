'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import ErrorBoundary from './ErrorBoundary';
import ToastContainer from './Toast';
import { useAuthStore } from '@/stores/auth';

const NO_NAV_PAGES = ['/login', '/signup'];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loadUser } = useAuthStore();
  const showNav = !NO_NAV_PAGES.includes(pathname);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <div className="min-h-screen bg-black">
      <ToastContainer />
      <ErrorBoundary>
        <main className={showNav ? 'pb-14' : ''}>
          {children}
        </main>
      </ErrorBoundary>
      {showNav && <BottomNav />}
    </div>
  );
}
