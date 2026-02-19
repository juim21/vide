'use client';

import { useState, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import VideoPlayer from './VideoPlayer';
import CommentSheet from './CommentSheet';
import { useFeedStore } from '@/stores/feed';

export default function SwipeFeedInner() {
  const { videos, hasMore, isLoading, feedType, fetchVideos } = useFeedStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideoId, setCommentVideoId] = useState<number | null>(null);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.activeIndex);
    if (swiper.activeIndex >= videos.length - 3 && hasMore && !isLoading) {
      fetchVideos();
    }
  }, [videos.length, hasMore, isLoading, fetchVideos]);

  if (videos.length === 0) {
    const emptyMessages: Record<string, { title: string; desc: string }> = {
      following: { title: '팔로잉 영상이 없습니다', desc: '다른 사용자를 팔로우하면 여기에 영상이 표시됩니다.' },
      foryou: { title: '추천 영상이 없습니다', desc: '첫 번째 영상을 업로드해보세요!' },
      trending: { title: '트렌딩 영상이 없습니다', desc: '아직 인기 영상이 없습니다.' },
    };
    const msg = emptyMessages[feedType] || emptyMessages.foryou;

    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-8 text-center">
        <svg className="w-16 h-16 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-white font-semibold text-lg">{msg.title}</p>
        <p className="text-sm">{msg.desc}</p>
      </div>
    );
  }

  return (
    <>
      <Swiper
        direction="vertical"
        modules={[Virtual, Mousewheel]}
        virtual
        mousewheel
        className="w-full h-full"
        onSlideChange={handleSlideChange}
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video.id} virtualIndex={index}>
            <VideoPlayer
              video={video}
              isActive={index === activeIndex}
              onCommentClick={() => setCommentVideoId(video.id)}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {commentVideoId && (
        <CommentSheet
          videoId={commentVideoId}
          onClose={() => setCommentVideoId(null)}
        />
      )}
    </>
  );
}
