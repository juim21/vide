// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  cursor?: string;
  hasMore: boolean;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface UserProfile extends User {
  followerCount: number;
  followingCount: number;
  videoCount: number;
  isFollowing?: boolean;
}

// Video types
export type VideoStatus = 'processing' | 'active' | 'deleted';

export interface Video {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  filePath: string;
  thumbnailPath: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  status: VideoStatus;
  createdAt: string;
  hashtags?: string[];
}

export interface VideoWithUser extends Video {
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  isLiked?: boolean;
}

// Comment types
export interface Comment {
  id: number;
  userId: number;
  videoId: number;
  content: string;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

// Feed types
export type FeedType = 'foryou' | 'following' | 'trending';

// Constants
export const VIDEO_MAX_SIZE_MB = 100;
export const VIDEO_MAX_DURATION_SECONDS = 60;
export const VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 6;
export const COMMENT_MAX_LENGTH = 500;
export const BIO_MAX_LENGTH = 150;
export const TITLE_MAX_LENGTH = 100;
