import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const videos = sqliteTable('videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  duration: real('duration').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  status: text('status', { enum: ['processing', 'active', 'deleted'] }).notNull().default('processing'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const likes = sqliteTable('likes', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.videoId] }),
]);

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const follows = sqliteTable('follows', {
  followerId: integer('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: integer('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  primaryKey({ columns: [table.followerId, table.followingId] }),
]);

export const videoViews = sqliteTable('video_views', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  videoId: integer('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  watchedSeconds: real('watched_seconds').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  primaryKey({ columns: [table.userId, table.videoId] }),
]);
