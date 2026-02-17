import { FastifyInstance } from 'fastify';
import { eq, and, sql, desc, notInArray, lt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { resolve } from 'path';
import { mkdirSync, unlinkSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { nanoid } from 'nanoid';
import { VIDEO_MAX_SIZE_MB, TITLE_MAX_LENGTH } from '@vide/shared';

const uploadsDir = resolve(process.cwd(), 'data/uploads/videos');
const thumbnailsDir = resolve(process.cwd(), 'data/uploads/thumbnails');
mkdirSync(uploadsDir, { recursive: true });
mkdirSync(thumbnailsDir, { recursive: true });

function getVideoWithUser(videoId: number, userId?: number) {
  const video = db.select().from(schema.videos)
    .where(and(eq(schema.videos.id, videoId), eq(schema.videos.status, 'active')))
    .get();

  if (!video) return null;

  const user = db.select().from(schema.users)
    .where(eq(schema.users.id, video.userId)).get();

  let isLiked = false;
  if (userId) {
    const like = db.select().from(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId))).get();
    isLiked = !!like;
  }

  return {
    ...video,
    user: user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } : null,
    isLiked,
  };
}

export async function videoRoutes(app: FastifyInstance) {
  // Upload video
  app.post('/api/videos', { preHandler: requireAuth }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, error: 'No file uploaded' });
    }

    const ext = data.filename.split('.').pop()?.toLowerCase();
    if (!['mp4', 'webm', 'mov'].includes(ext || '')) {
      return reply.status(400).send({ success: false, error: 'Invalid file type. Allowed: mp4, webm, mov' });
    }

    const fileId = nanoid();
    const filename = `${fileId}.${ext}`;
    const filePath = resolve(uploadsDir, filename);

    await pipeline(data.file, createWriteStream(filePath));

    // Check file size
    const { statSync } = await import('fs');
    const stats = statSync(filePath);
    if (stats.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
      unlinkSync(filePath);
      return reply.status(400).send({ success: false, error: `File too large. Max ${VIDEO_MAX_SIZE_MB}MB` });
    }

    const title = (data.fields.title as any)?.value || 'Untitled';
    const description = (data.fields.description as any)?.value || null;

    // Try to generate thumbnail with ffmpeg
    let thumbnailFilename: string | null = null;
    let duration = 0;
    try {
      const ffmpeg = (await import('fluent-ffmpeg')).default;

      // Get duration
      duration = await new Promise<number>((resolve) => {
        ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
          if (err) resolve(0);
          else resolve(metadata?.format?.duration || 0);
        });
      });

      // Generate thumbnail
      thumbnailFilename = `${fileId}.jpg`;
      await new Promise<void>((resolve, reject) => {
        ffmpeg(filePath)
          .screenshots({
            count: 1,
            folder: thumbnailsDir,
            filename: thumbnailFilename!,
            size: '360x640',
            timemarks: ['00:00:01'],
          })
          .on('end', () => resolve())
          .on('error', () => {
            thumbnailFilename = null;
            resolve();
          });
      });
    } catch {
      // ffmpeg not available, skip thumbnail
    }

    const video = db.insert(schema.videos).values({
      userId: request.user!.userId,
      title: title.slice(0, TITLE_MAX_LENGTH),
      description,
      filePath: `/media/videos/${filename}`,
      thumbnailPath: thumbnailFilename ? `/media/thumbnails/${thumbnailFilename}` : null,
      duration,
      status: 'active',
    }).returning().get();

    return { success: true, data: getVideoWithUser(video.id, request.user!.userId) };
  });

  // Get single video
  app.get('/api/videos/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = getVideoWithUser(Number(id), request.user?.userId);
    if (!video) {
      return reply.status(404).send({ success: false, error: 'Video not found' });
    }
    return { success: true, data: video };
  });

  // Delete video
  app.delete('/api/videos/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const video = db.select().from(schema.videos)
      .where(and(eq(schema.videos.id, Number(id)), eq(schema.videos.userId, request.user!.userId)))
      .get();

    if (!video) {
      return reply.status(404).send({ success: false, error: 'Video not found' });
    }

    db.update(schema.videos).set({ status: 'deleted' }).where(eq(schema.videos.id, Number(id))).run();
    return { success: true };
  });

  // Like video
  app.post('/api/videos/:id/like', { preHandler: requireAuth }, async (request, reply) => {
    const videoId = Number((request.params as { id: string }).id);
    const userId = request.user!.userId;

    const existing = db.select().from(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId))).get();

    if (existing) {
      return reply.status(409).send({ success: false, error: 'Already liked' });
    }

    db.insert(schema.likes).values({ userId, videoId }).run();
    db.update(schema.videos).set({ likeCount: sql`like_count + 1` }).where(eq(schema.videos.id, videoId)).run();
    return { success: true };
  });

  // Unlike video
  app.delete('/api/videos/:id/like', { preHandler: requireAuth }, async (request) => {
    const videoId = Number((request.params as { id: string }).id);
    const userId = request.user!.userId;

    const result = db.delete(schema.likes)
      .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, videoId))).run();

    if (result.changes > 0) {
      db.update(schema.videos).set({ likeCount: sql`MAX(like_count - 1, 0)` }).where(eq(schema.videos.id, videoId)).run();
    }
    return { success: true };
  });

  // Get comments
  app.get('/api/videos/:id/comments', async (request) => {
    const videoId = Number((request.params as { id: string }).id);
    const rows = db.select({
      id: schema.comments.id,
      userId: schema.comments.userId,
      videoId: schema.comments.videoId,
      content: schema.comments.content,
      createdAt: schema.comments.createdAt,
      username: schema.users.username,
      displayName: schema.users.displayName,
      avatarUrl: schema.users.avatarUrl,
    })
      .from(schema.comments)
      .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
      .where(eq(schema.comments.videoId, videoId))
      .orderBy(desc(schema.comments.createdAt))
      .all();

    const comments = rows.map(r => ({
      id: r.id, userId: r.userId, videoId: r.videoId, content: r.content, createdAt: r.createdAt,
      user: { id: r.userId, username: r.username, displayName: r.displayName, avatarUrl: r.avatarUrl },
    }));

    return { success: true, data: comments };
  });

  // Add comment
  app.post('/api/videos/:id/comments', { preHandler: requireAuth }, async (request, reply) => {
    const videoId = Number((request.params as { id: string }).id);
    const { content } = request.body as { content: string };

    if (!content?.trim()) {
      return reply.status(400).send({ success: false, error: 'Content is required' });
    }

    const video = db.select().from(schema.videos).where(eq(schema.videos.id, videoId)).get();
    if (!video) {
      return reply.status(404).send({ success: false, error: 'Video not found' });
    }

    const comment = db.insert(schema.comments).values({
      userId: request.user!.userId,
      videoId,
      content: content.trim().slice(0, 500),
    }).returning().get();

    db.update(schema.videos).set({ commentCount: sql`comment_count + 1` }).where(eq(schema.videos.id, videoId)).run();

    const user = db.select().from(schema.users).where(eq(schema.users.id, request.user!.userId)).get();

    return {
      success: true,
      data: {
        ...comment,
        user: user ? { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl } : null,
      },
    };
  });

  // Delete comment
  app.delete('/api/comments/:id', { preHandler: requireAuth }, async (request, reply) => {
    const commentId = Number((request.params as { id: string }).id);
    const comment = db.select().from(schema.comments)
      .where(and(eq(schema.comments.id, commentId), eq(schema.comments.userId, request.user!.userId)))
      .get();

    if (!comment) {
      return reply.status(404).send({ success: false, error: 'Comment not found' });
    }

    db.delete(schema.comments).where(eq(schema.comments.id, commentId)).run();
    db.update(schema.videos).set({ commentCount: sql`MAX(comment_count - 1, 0)` }).where(eq(schema.videos.id, comment.videoId)).run();
    return { success: true };
  });
}
