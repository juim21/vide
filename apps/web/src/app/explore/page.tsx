'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import type { VideoWithUser } from '@vide/shared';
import Link from 'next/link';
import { Play, Search } from 'lucide-react';
import { toast } from '@/components/Toast';
import { VideoGridSkeleton } from '@/components/Skeleton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarPath?: string | null;
}

interface SearchResults {
  users: SearchUser[];
  videos: VideoWithUser[];
}

export default function ExplorePage() {
  const [query, setQuery] = useState('');
  const [trendingVideos, setTrendingVideos] = useState<VideoWithUser[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<{ success: boolean; data: VideoWithUser[] }>('/api/feed/trending?limit=20')
      .then(res => setTrendingVideos(res.data))
      .catch(() => toast('트렌딩 영상을 불러오지 못했습니다', 'error'))
      .finally(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setSearchResults(null);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    debounceRef.current = setTimeout(() => {
      api<{ success: boolean; data: SearchResults }>(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then(res => setSearchResults(res.data))
        .catch(() => toast('검색 중 오류가 발생했습니다', 'error'))
        .finally(() => setLoadingSearch(false));
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen p-4 pt-8">
      {/* Search input */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="사용자 또는 영상 검색..."
          className="w-full bg-gray-900 text-white placeholder-gray-500 rounded-lg py-2.5 pl-10 pr-4 outline-none focus:ring-1 focus:ring-gray-600 text-sm"
        />
      </div>

      {/* Trending section */}
      {!isSearching && (
        <>
          <h1 className="text-xl font-bold mb-4">탐색</h1>
          {loadingTrending ? (
            <VideoGridSkeleton count={12} />
          ) : trendingVideos.length === 0 ? (
            <p className="text-gray-500 text-center py-12">트렌딩 영상이 없습니다</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {trendingVideos.map(video => (
                <Link
                  key={video.id}
                  href={`/video/${video.id}`}
                  className="relative aspect-[9/16] bg-gray-900 rounded overflow-hidden group"
                >
                  {video.thumbnailPath ? (
                    <img
                      src={`${API_BASE}${video.thumbnailPath}`}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <Play size={32} className="text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Play size={32} className="text-white" fill="white" />
                  </div>
                  <div className="absolute bottom-1 left-1 flex items-center gap-1">
                    <Play size={12} fill="white" className="text-white" />
                    <span className="text-white text-xs">{video.viewCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Search results section */}
      {isSearching && (
        <>
          {loadingSearch ? (
            <VideoGridSkeleton count={6} />
          ) : searchResults ? (
            <>
              {/* Users section */}
              {searchResults.users.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-base font-semibold mb-3 text-gray-300">사용자</h2>
                  <div className="flex flex-col gap-2">
                    {searchResults.users.map(user => (
                      <Link
                        key={user.id}
                        href={`/profile/${user.id}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        {user.avatarPath ? (
                          <img
                            src={`${API_BASE}${user.avatarPath}`}
                            alt={user.displayName}
                            className="w-10 h-10 rounded-full object-cover bg-gray-800"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold text-sm">
                            {user.displayName?.[0]?.toUpperCase() ?? user.username[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-white text-sm font-medium">{user.displayName}</p>
                          <p className="text-gray-400 text-xs">@{user.username}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos section */}
              {searchResults.videos.length > 0 && (
                <div>
                  <h2 className="text-base font-semibold mb-3 text-gray-300">영상</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                    {searchResults.videos.map(video => (
                      <Link
                        key={video.id}
                        href={`/video/${video.id}`}
                        className="relative aspect-[9/16] bg-gray-900 rounded overflow-hidden group"
                      >
                        {video.thumbnailPath ? (
                          <img
                            src={`${API_BASE}${video.thumbnailPath}`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Play size={32} className="text-gray-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Play size={32} className="text-white" fill="white" />
                        </div>
                        <div className="absolute bottom-1 left-1 flex items-center gap-1">
                          <Play size={12} fill="white" className="text-white" />
                          <span className="text-white text-xs">{video.viewCount}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {searchResults.users.length === 0 && searchResults.videos.length === 0 && (
                <p className="text-gray-500 text-center py-12">검색 결과가 없습니다</p>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
