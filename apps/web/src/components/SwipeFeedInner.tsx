'use client';

import { useEffect, useState, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Virtual, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import VideoPlayer from './VideoPlayer';
import CommentSheet from './CommentSheet';
import { useFeedStore } from '@/stores/feed';

export default function SwipeFeedInner() {
  const { videos, hasMore, isLoading, fetchVideos } = useFeedStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentVideoId, setCommentVideoId] = useState<number | null>(null);

  useEffect(() => {
    fetchVideos(true);
  }, [fetchVideos]);

  const handleSlideChange = useCallback((swiper: SwiperType) => {
    setActiveIndex(swiper.activeIndex);
    if (swiper.activeIndex >= videos.length - 3 && hasMore && !isLoading) {
      fetchVideos();
    }
  }, [videos.length, hasMore, isLoading, fetchVideos]);

  if (videos.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>영상이 없습니다. 첫 번째 영상을 업로드해보세요!</p>
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
