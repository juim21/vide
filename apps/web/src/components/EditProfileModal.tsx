'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from './Toast';
import type { User } from '@vide/shared';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

export default function EditProfileModal({ user, onClose, onSave }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api<{ success: boolean; data: User }>('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio }),
      });
      onSave(res.data);
      toast('프로필이 수정되었습니다', 'success');
      onClose();
    } catch {
      toast('프로필 수정에 실패했습니다', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-black/50 absolute inset-0" />
      <div
        className="relative bg-gray-900 rounded-2xl w-full max-w-sm p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">프로필 편집</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">이름</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">소개</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={150}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-gray-500 resize-none"
            />
            <span className="text-gray-600 text-xs">{bio.length}/150</span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
