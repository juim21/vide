'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { Comment } from '@vide/shared';

interface CommentSheetProps {
  videoId: number;
  onClose: () => void;
}

export default function CommentSheet({ videoId, onClose }: CommentSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ success: boolean; data: Comment[] }>(`/api/videos/${videoId}/comments`)
      .then(res => setComments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [videoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !isAuthenticated) return;

    try {
      const res = await api<{ success: boolean; data: Comment }>(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() }),
      });
      setComments(prev => [res.data, ...prev]);
      setContent('');
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await api(`/api/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="bg-black/50 absolute inset-0" />
      <div
        className="relative bg-gray-900 rounded-t-2xl max-h-[70vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="text-white font-semibold">댓글 {comments.length}</span>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-white" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">첫 번째 댓글을 남겨보세요!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                  {(comment.user?.username || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs font-medium">
                      {comment.user?.displayName || comment.user?.username}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-white text-sm mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        {isAuthenticated && (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 border-t border-gray-800">
            <input
              ref={inputRef}
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="댓글 추가..."
              maxLength={500}
              className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-sm placeholder-gray-500 outline-none focus:ring-1 focus:ring-gray-600"
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="text-pink-500 disabled:text-gray-600 p-2"
            >
              <Send size={20} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
