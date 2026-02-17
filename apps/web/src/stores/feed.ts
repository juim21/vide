import { create } from 'zustand';
import { api } from '@/lib/api';
import type { VideoWithUser, FeedType } from '@vide/shared';

interface FeedState {
  videos: VideoWithUser[];
  cursor: string | undefined;
  hasMore: boolean;
  isLoading: boolean;
  feedType: FeedType;
  setFeedType: (type: FeedType) => void;
  fetchVideos: (reset?: boolean) => Promise<void>;
  toggleLike: (videoId: number) => Promise<void>;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  videos: [],
  cursor: undefined,
  hasMore: true,
  isLoading: false,
  feedType: 'foryou',

  setFeedType: (type) => {
    set({ feedType: type, videos: [], cursor: undefined, hasMore: true });
    get().fetchVideos(true);
  },

  fetchVideos: async (reset = false) => {
    const { isLoading, hasMore, cursor, feedType } = get();
    if (isLoading || (!hasMore && !reset)) return;

    set({ isLoading: true });

    const endpoint = feedType === 'foryou' ? '/api/feed'
      : feedType === 'following' ? '/api/feed/following'
      : '/api/feed/trending';

    const params = new URLSearchParams({ limit: '10' });
    if (!reset && cursor) params.set('cursor', cursor);

    try {
      const res = await api<{
        success: boolean;
        data: VideoWithUser[];
        cursor?: string;
        hasMore: boolean;
      }>(`${endpoint}?${params}`);

      set((state) => ({
        videos: reset ? res.data : [...state.videos, ...res.data],
        cursor: res.cursor,
        hasMore: res.hasMore,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  toggleLike: async (videoId) => {
    const { videos } = get();
    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const wasLiked = video.isLiked;

    // Optimistic update
    set({
      videos: videos.map(v =>
        v.id === videoId
          ? { ...v, isLiked: !wasLiked, likeCount: v.likeCount + (wasLiked ? -1 : 1) }
          : v
      ),
    });

    try {
      await api(`/api/videos/${videoId}/like`, {
        method: wasLiked ? 'DELETE' : 'POST',
      });
    } catch {
      // Rollback
      set({
        videos: get().videos.map(v =>
          v.id === videoId
            ? { ...v, isLiked: wasLiked, likeCount: v.likeCount + (wasLiked ? 1 : -1) }
            : v
        ),
      });
    }
  },
}));
