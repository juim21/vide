'use client';

import dynamic from 'next/dynamic';

const SwipeFeedInner = dynamic(() => import('./SwipeFeedInner'), { ssr: false });

export default function SwipeFeed() {
  return <SwipeFeedInner />;
}
