'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';

export default function ProfileRedirect() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/login');
    } else {
      router.replace(`/profile/${user.username}`);
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
    </div>
  );
}
