'use client';

import { useEffect, useRef } from 'react';
import SwipeFeed from '@/components/SwipeFeed';
import { useFeedStore } from '@/stores/feed';
import type { FeedType } from '@vide/shared';

const tabs: { key: FeedType; label: string }[] = [
  { key: 'following', label: '팔로잉' },
  { key: 'foryou', label: '추천' },
];

export default function HomePage() {
  const { feedType, setFeedType, fetchVideos } = useFeedStore();
  const initialFetched = useRef(false);

  useEffect(() => {
    if (!initialFetched.current) {
      initialFetched.current = true;
      fetchVideos(true);
    }
  }, []);

  return (
    <div className="h-screen w-full relative">
      {/* Feed type tabs */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center gap-6 pt-4 pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFeedType(tab.key)}
            className={`text-sm font-semibold transition-colors ${
              feedType === tab.key ? 'text-white' : 'text-gray-500'
            }`}
          >
            {tab.label}
            {feedType === tab.key && (
              <div className="h-0.5 bg-white rounded-full mt-1" />
            )}
          </button>
        ))}
      </div>

      <SwipeFeed />
    </div>
  );
}
