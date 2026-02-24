'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Play, Pause } from 'lucide-react';
import type { VideoWithUser } from '@vide/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useFeedStore } from '@/stores/feed';
import { toast } from './Toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VideoPlayerProps {
  video: VideoWithUser;
  isActive: boolean;
  onCommentClick?: () => void;
}

export default function VideoPlayer({ video, isActive, onCommentClick }: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const { isAuthenticated } = useAuthStore();
  const { toggleLike } = useFeedStore();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.play().then(() => setIsPlaying(true)).catch(() => {});
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
      setProgress(0);
    }
  }, [isActive, video.id, isAuthenticated]);

  // Progress tracking
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const handleTimeUpdate = () => {
      if (el.duration) {
        setProgress((el.currentTime / el.duration) * 100);
      }
    };
    el.addEventListener('timeupdate', handleTimeUpdate);
    return () => el.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

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

  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    if (now - lastTapRef.current < 200) {
      // Double tap → like (Instagram style: always show heart, only like if not already liked)
      lastTapRef.current = 0;
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setHeartPos(null), 800);
      if (!isAuthenticated) {
        toast('로그인하면 좋아요를 누를 수 있어요', 'error');
      } else if (!video.isLiked) {
        toggleLike(video.id);
      }
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, 200);
    }
  }, [isAuthenticated, video.isLiked, video.id, toggleLike, togglePlay]);

  const handleLike = () => {
    if (!isAuthenticated) {
      toast('로그인이 필요합니다', 'error');
      return;
    }
    toggleLike(video.id);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?v=${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: video.title, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast('링크가 복사되었습니다', 'success');
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    el.currentTime = ratio * el.duration;
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
        onClick={handleVideoClick}
      />

      {/* Heart animation on double tap */}
      {heartPos && (
        <div
          className="absolute pointer-events-none animate-heart-pop z-20"
          style={{ left: heartPos.x, top: heartPos.y }}
        >
          <Heart size={80} className="text-red-500 fill-red-500 drop-shadow-lg" />
        </div>
      )}

      {/* Progress bar */}
      <div
        className="absolute bottom-[72px] left-0 right-0 h-1 bg-white/20 cursor-pointer group z-10"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-white/80 group-hover:bg-pink-500 transition-colors"
          style={{ width: `${progress}%` }}
        />
      </div>

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
        <Link href={`/profile/${video.user?.id}`} className="font-bold text-white text-sm hover:underline">
          @{video.user?.displayName || video.user?.username}
        </Link>
        <p className="text-white text-sm mt-1 line-clamp-2">{video.title}</p>
        {video.description && (
          <p className="text-gray-300 text-xs mt-1 line-clamp-1">{video.description}</p>
        )}
        {video.hashtags && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {video.hashtags.map(tag => (
              <button
                key={tag}
                onClick={() => router.push(`/explore?q=${encodeURIComponent('#' + tag)}`)}
                className="text-cyan-400 text-xs font-medium hover:underline"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        {/* Avatar */}
        <Link href={`/profile/${video.user?.id}`} className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white overflow-hidden">
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
            className={`transition-transform active:scale-125 ${video.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`}
          />
          <span className="text-white text-xs">{video.likeCount}</span>
        </button>

        {/* Comment */}
        <button onClick={onCommentClick} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} className="text-white" />
          <span className="text-white text-xs">{video.commentCount}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 size={28} className="text-white" />
          <span className="text-white text-xs">공유</span>
        </button>
      </div>
    </div>
  );
}
