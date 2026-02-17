'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

const navItems = [
  { href: '/', icon: Home, label: '홈' },
  { href: '/explore', icon: Search, label: '탐색' },
  { href: '/upload', icon: PlusSquare, label: '업로드' },
  { href: '/profile', icon: User, label: '프로필' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          const actualHref = (href === '/upload' || href === '/profile') && !isAuthenticated
            ? '/login'
            : href;

          return (
            <Link
              key={href}
              href={actualHref}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1 transition-colors ${
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
