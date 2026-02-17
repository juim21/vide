'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Play, Pause } from 'lucide-react';
import type { VideoWithUser } from '@vide/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VideoPlayerProps {
  video: VideoWithUser;
  isActive: boolean;
  onCommentClick?: () => void;
}

export default function VideoPlayer({ video, isActive, onCommentClick }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const { toggleLike } = useFeedStore();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
      // Record view
      if (isAuthenticated) {
        api(`/api/videos/${video.id}/view`, {
          method: 'POST',
          body: JSON.stringify({ watchedSeconds: 0 }),
        }).catch(() => {});
      }
    } else {
      el.pause();
      el.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isActive, video.id, isAuthenticated]);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;

    if (el.paused) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  const handleLike = () => {
    if (!isAuthenticated) return;
    toggleLike(video.id);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={`${API_BASE}${video.filePath}`}
        className="w-full h-full object-contain"
        loop
        playsInline
        preload="auto"
        onClick={togglePlay}
      />

      {/* Play/Pause overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-4 animate-fade-out">
            {isPlaying ? <Play size={48} fill="white" color="white" /> : <Pause size={48} fill="white" color="white" />}
          </div>
        </div>
      )}

      {/* Video info overlay */}
      <div className="absolute bottom-0 left-0 right-16 p-4 pb-20 bg-gradient-to-t from-black/60 to-transparent">
        <Link href={`/profile/${video.user?.username}`} className="font-bold text-white text-sm hover:underline">
          @{video.user?.displayName || video.user?.username}
        </Link>
        <p className="text-white text-sm mt-1 line-clamp-2">{video.title}</p>
        {video.description && (
          <p className="text-gray-300 text-xs mt-1 line-clamp-1">{video.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        {/* Avatar */}
        <Link href={`/profile/${video.user?.username}`} className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white overflow-hidden">
          {video.user?.avatarUrl ? (
            <img src={`${API_BASE}${video.user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
              {(video.user?.username || '?')[0].toUpperCase()}
            </div>
          )}
        </Link>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart
            size={28}
            className={video.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}
          />
          <span className="text-white text-xs">{video.likeCount}</span>
        </button>

        {/* Comment */}
        <button onClick={onCommentClick} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} className="text-white" />
          <span className="text-white text-xs">{video.commentCount}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center gap-1">
          <Share2 size={28} className="text-white" />
          <span className="text-white text-xs">공유</span>
        </button>
      </div>
    </div>
  );
}
