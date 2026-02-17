'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, Film } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
      </div>
    );
  }

  const handleFile = useCallback((f: File) => {
    const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowed.includes(f.type)) {
      setError('mp4, webm, mov 파일만 업로드할 수 있습니다');
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('파일 크기는 100MB를 초과할 수 없습니다');
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || 'Untitled');
    if (description) formData.append('description', description);

    try {
      const { getAccessToken } = await import('@/lib/api');
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/videos`);

        const token = getAccessToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('업로드에 실패했습니다'));
        };
        xhr.onerror = () => reject(new Error('네트워크 오류'));
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message || '업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen p-4 pt-8 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">영상 업로드</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Drop zone / Preview */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-gray-500 transition-colors"
          >
            <Upload size={48} className="text-gray-500" />
            <div className="text-center">
              <p className="text-gray-300">영상을 드래그하거나 클릭하세요</p>
              <p className="text-gray-500 text-sm mt-1">MP4, WebM, MOV (최대 100MB, 60초)</p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-gray-900">
            <video src={preview!} className="w-full aspect-[9/16] object-contain" controls />
            <button
              type="button"
              onClick={clearFile}
              className="absolute top-2 right-2 bg-black/60 rounded-full p-1"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={100}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-600"
        />
        <textarea
          placeholder="설명 (선택)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-gray-600 resize-none"
        />

        {uploading && (
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="bg-pink-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
        >
          <Film size={18} />
          {uploading ? `업로드 중... ${progress}%` : '게시하기'}
        </button>
      </form>
    </div>
  );
}
