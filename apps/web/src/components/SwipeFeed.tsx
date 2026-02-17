'use client';

import dynamic from 'next/dynamic';
import { useFeedStore } from '@/stores/feed';

const SwipeFeedInner = dynamic(() => import('./SwipeFeedInner'), { ssr: false });

export default function SwipeFeed() {
  const { isLoading, videos } = useFeedStore();

  if (videos.length === 0 && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  return <SwipeFeedInner />;
}
