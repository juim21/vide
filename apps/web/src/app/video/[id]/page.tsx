'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Play, Pause, ArrowLeft } from 'lucide-react';
import type { VideoWithUser } from '@vide/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/components/Toast';
import CommentSheet from '@/components/CommentSheet';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [video, setVideo] = useState<VideoWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef(0);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    api<{ success: boolean; data: VideoWithUser }>(`/api/videos/${id}`)
      .then(res => setVideo(res.data))
      .catch(() => toast('영상을 불러올 수 없습니다', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video) return;
    el.play().then(() => setIsPlaying(true)).catch(() => {});
    if (isAuthenticated) {
      api(`/api/videos/${video.id}/view`, {
        method: 'POST',
        body: JSON.stringify({ watchedSeconds: 0 }),
      }).catch(() => {});
    }
  }, [video, isAuthenticated]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const handleTimeUpdate = () => {
      if (el.duration) setProgress((el.currentTime / el.duration) * 100);
    };
    el.addEventListener('timeupdate', handleTimeUpdate);
    return () => el.removeEventListener('timeupdate', handleTimeUpdate);
  }, [video]);

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
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setTimeout(() => setHeartPos(null), 800);
      if (isAuthenticated && video && !video.isLiked) {
        const wasLiked = video.isLiked;
        setVideo({ ...video, isLiked: true, likeCount: video.likeCount + 1 });
        api(`/api/videos/${video.id}/like`, { method: 'POST' }).catch(() => {
          setVideo(prev => prev ? { ...prev, isLiked: wasLiked, likeCount: prev.likeCount - 1 } : null);
        });
      }
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          togglePlay();
        }
      }, 300);
    }
  }, [isAuthenticated, video, togglePlay]);

  const handleLike = async () => {
    if (!isAuthenticated) { toast('로그인이 필요합니다', 'error'); return; }
    if (!video) return;
    const wasLiked = video.isLiked;
    setVideo({ ...video, isLiked: !wasLiked, likeCount: video.likeCount + (wasLiked ? -1 : 1) });
    try {
      await api(`/api/videos/${video.id}/like`, { method: wasLiked ? 'DELETE' : 'POST' });
    } catch {
      setVideo({ ...video, isLiked: wasLiked, likeCount: video.likeCount });
    }
  };

  const handleShare = async () => {
    if (!video) return;
    const url = `${window.location.origin}/video/${video.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: video.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast('링크가 복사되었습니다', 'success');
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = videoRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    el.currentTime = ((e.clientX - rect.left) / rect.width) * el.duration;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-gray-400 gap-3">
        <p className="text-lg">영상을 찾을 수 없습니다</p>
        <button onClick={() => router.back()} className="text-white underline">돌아가기</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-50 bg-black/40 rounded-full p-2"
      >
        <ArrowLeft size={24} className="text-white" />
      </button>

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
        <div className="h-full bg-white/80 group-hover:bg-pink-500 transition-colors" style={{ width: `${progress}%` }} />
      </div>

      {/* Play/Pause overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-4 animate-fade-out">
            {isPlaying ? <Play size={48} fill="white" color="white" /> : <Pause size={48} fill="white" color="white" />}
          </div>
        </div>
      )}

      {/* Video info */}
      <div className="absolute bottom-0 left-0 right-16 p-4 pb-20 bg-gradient-to-t from-black/60 to-transparent">
        <Link href={`/profile/${video.user?.id}`} className="font-bold text-white text-sm hover:underline">
          @{video.user?.displayName || video.user?.username}
        </Link>
        <p className="text-white text-sm mt-1 line-clamp-2">{video.title}</p>
        {video.description && <p className="text-gray-300 text-xs mt-1 line-clamp-1">{video.description}</p>}
      </div>

      {/* Action buttons */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
        <Link href={`/profile/${video.user?.id}`} className="w-10 h-10 rounded-full bg-gray-700 border-2 border-white overflow-hidden">
          {video.user?.avatarUrl ? (
            <img src={`${API_BASE}${video.user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
              {(video.user?.username || '?')[0].toUpperCase()}
            </div>
          )}
        </Link>
        <button onClick={handleLike} className="flex flex-col items-center gap-1">
          <Heart size={28} className={`transition-transform active:scale-125 ${video.isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
          <span className="text-white text-xs">{video.likeCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} className="text-white" />
          <span className="text-white text-xs">{video.commentCount}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 size={28} className="text-white" />
          <span className="text-white text-xs">공유</span>
        </button>
      </div>

      {showComments && <CommentSheet videoId={video.id} onClose={() => setShowComments(false)} />}
    </div>
  );
}
