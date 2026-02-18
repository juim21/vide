'use client';

export function VideoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-[9/16] bg-gray-800 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="px-4 pt-8 pb-4 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 rounded-full bg-gray-800" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 bg-gray-800 rounded" />
          <div className="h-4 w-24 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="flex gap-6 mb-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center space-y-1">
            <div className="h-5 w-10 bg-gray-800 rounded mx-auto" />
            <div className="h-3 w-12 bg-gray-800 rounded mx-auto" />
          </div>
        ))}
      </div>
      <div className="h-10 bg-gray-800 rounded-lg" />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mx-auto" />
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    </div>
  );
}
