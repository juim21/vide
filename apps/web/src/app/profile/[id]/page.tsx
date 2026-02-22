'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Play, Heart, Grid3X3, LogOut, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/components/Toast';
import EditProfileModal from '@/components/EditProfileModal';
import { ProfileSkeleton, VideoGridSkeleton } from '@/components/Skeleton';
import type { UserProfile, Video, User } from '@vide/shared';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const profileId = params.id;
  const { user: currentUser, isAuthenticated, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'likes'>('videos');
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const isOwnProfile = isAuthenticated && currentUser?.id?.toString() === profileId;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<{ success: boolean; data: UserProfile }>(`/api/users/by-id/${profileId}`),
      api<{ success: boolean; data: Video[] }>(`/api/users/by-id/${profileId}/videos`),
      api<{ success: boolean; data: Video[] }>(`/api/users/by-id/${profileId}/likes`),
    ])
      .then(([profileRes, videosRes, likesRes]) => {
        setProfile(profileRes.data);
        setVideos(videosRes.data);
        setLikedVideos(likesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleFollow = async () => {
    if (!isAuthenticated || !profile) return;

    const wasFollowing = profile.isFollowing;
    setProfile(prev => prev ? {
      ...prev,
      isFollowing: !wasFollowing,
      followerCount: prev.followerCount + (wasFollowing ? -1 : 1),
    } : null);

    try {
      await api(`/api/users/by-id/${profileId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
      });
    } catch (err: any) {
      toast(err.message || '팔로우에 실패했습니다', 'error');
      setProfile(prev => prev ? {
        ...prev,
        isFollowing: wasFollowing,
        followerCount: prev.followerCount + (wasFollowing ? 1 : -1),
      } : null);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm('이 영상을 삭제하시겠습니까?')) return;
    try {
      await api(`/api/videos/${videoId}`, { method: 'DELETE' });
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setProfile(prev => prev ? { ...prev, videoCount: prev.videoCount - 1 } : null);
      toast('영상이 삭제되었습니다', 'success');
    } catch {
      toast('영상 삭제에 실패했습니다', 'error');
    }
  };

  const handleProfileSave = (updatedUser: User) => {
    setProfile(prev => prev ? { ...prev, ...updatedUser } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <ProfileSkeleton />
        <VideoGridSkeleton count={6} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        사용자를 찾을 수 없습니다
      </div>
    );
  }

  const displayVideos = activeTab === 'videos' ? videos : likedVideos;

  return (
    <div className="min-h-screen pb-4">
      {/* Profile header */}
      <div className="px-4 pt-8 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold flex-shrink-0">
            {profile.avatarUrl ? (
              <img src={`${API_BASE}${profile.avatarUrl}`} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.username[0].toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">@{profile.username}</h1>
            {profile.displayName && profile.displayName !== profile.username && (
              <p className="text-gray-400 text-sm">{profile.displayName}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="font-bold">{profile.followingCount}</div>
            <div className="text-gray-400 text-xs">팔로잉</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{profile.followerCount}</div>
            <div className="text-gray-400 text-xs">팔로워</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{profile.videoCount}</div>
            <div className="text-gray-400 text-xs">동영상</div>
          </div>
        </div>

        {profile.bio && <p className="text-sm text-gray-300 mb-4">{profile.bio}</p>}

        {/* Actions */}
        {isOwnProfile ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 border border-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              프로필 편집
            </button>
            <button
              onClick={logout}
              className="border border-gray-700 rounded-lg py-2 px-4 text-sm font-semibold hover:bg-gray-900 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : isAuthenticated ? (
          <button
            onClick={handleFollow}
            className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors ${
              profile.isFollowing
                ? 'border border-gray-700 hover:bg-gray-900'
                : 'bg-pink-600 hover:bg-pink-700'
            }`}
          >
            {profile.isFollowing ? '팔로잉' : '팔로우'}
          </button>
        ) : (
          <Link
            href="/login"
            className="block w-full text-center bg-pink-600 hover:bg-pink-700 rounded-lg py-2 text-sm font-semibold transition-colors"
          >
            로그인하여 팔로우
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 text-sm ${
            activeTab === 'videos' ? 'text-white border-b-2 border-white' : 'text-gray-500'
          }`}
        >
          <Grid3X3 size={16} />
          동영상
        </button>
        <button
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-3 flex items-center justify-center gap-1 text-sm ${
            activeTab === 'likes' ? 'text-white border-b-2 border-white' : 'text-gray-500'
          }`}
        >
          <Heart size={16} />
          좋아요
        </button>
      </div>

      {/* Video grid */}
      {displayVideos.length === 0 ? (
        <p className="text-gray-500 text-center py-12 text-sm">
          {activeTab === 'videos' ? '아직 영상이 없습니다' : '좋아요한 영상이 없습니다'}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 mt-0.5">
          {displayVideos.map(video => (
            <div key={video.id} className="relative aspect-[9/16] bg-gray-900 group">
              <Link href={`/video/${video.id}`} className="block w-full h-full">
                {video.thumbnailPath ? (
                  <img src={`${API_BASE}${video.thumbnailPath}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Play size={24} className="text-gray-600" />
                  </div>
                )}
              </Link>
              <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                <Play size={10} fill="white" className="text-white" />
                <span className="text-white text-[10px]">{video.viewCount}</span>
              </div>
              {/* Delete button for own videos */}
              {isOwnProfile && activeTab === 'videos' && (
                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && profile && (
        <EditProfileModal
          user={profile}
          onClose={() => setShowEditModal(false)}
          onSave={handleProfileSave}
        />
      )}
    </div>
  );
}
