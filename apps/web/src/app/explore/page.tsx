'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { VideoWithUser } from '@vide/shared';
import Link from 'next/link';
import { Play } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ExplorePage() {
  const [videos, setVideos] = useState<VideoWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ success: boolean; data: VideoWithUser[] }>('/api/feed/trending?limit=20')
      .then(res => setVideos(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen p-4 pt-8">
      <h1 className="text-xl font-bold mb-4">탐색</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
        </div>
      ) : videos.length === 0 ? (
        <p className="text-gray-500 text-center py-12">트렌딩 영상이 없습니다</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {videos.map(video => (
            <Link
              key={video.id}
              href={`/?v=${video.id}`}
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
    </div>
  );
}
