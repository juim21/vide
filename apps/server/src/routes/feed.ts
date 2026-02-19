import { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, notInArray, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

function buildVideoWithUser(video: any, user: any, isLiked: boolean) {
  return {
    ...video,
    user: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
    isLiked,
  };
}

export async function feedRoutes(app: FastifyInstance) {
  // For You feed
  app.get('/api/feed', { preHandler: optionalAuth }, async (request) => {
    const { cursor, limit: limitStr } = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(limitStr) || 10, 20);
    const userId = request.user?.userId;

    // Get viewed video IDs to exclude
    let viewedIds: number[] = [];
    if (userId) {
      viewedIds = db.select({ videoId: schema.videoViews.videoId })
        .from(schema.videoViews)
        .where(eq(schema.videoViews.userId, userId))
        .all()
        .map(v => v.videoId);
    }

    let query = db.select()
      .from(schema.videos)
      .innerJoin(schema.users, eq(schema.videos.userId, schema.users.id))
      .where(
        and(
          eq(schema.videos.status, 'active'),
          cursor ? sql`${schema.videos.id} < ${Number(cursor)}` : undefined,
          viewedIds.length > 0 ? notInArray(schema.videos.id, viewedIds) : undefined,
        )
      )
      .orderBy(
        sql`(0.7 * (1.0 / (1.0 + (julianday('now') - julianday(${schema.videos.createdAt})) * 24)) + 0.3 * (${schema.videos.likeCount} * 2 + ${schema.videos.commentCount} * 3 + ${schema.videos.viewCount}) / NULLIF(${schema.videos.viewCount}, 0)) DESC`,
        desc(schema.videos.id)
      )
      .limit(limit + 1);

    const rows = query.all();
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    const videos = items.map((row: any) => {
      let isLiked = false;
      if (userId) {
        const like = db.select().from(schema.likes)
          .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, row.videos.id))).get();
        isLiked = !!like;
      }
      return buildVideoWithUser(row.videos, row.users, isLiked);
    });

    return {
      success: true,
      data: videos,
      cursor: hasMore && items.length > 0 ? String(items[items.length - 1].videos.id) : undefined,
      hasMore,
    };
  });

  // Following feed
  app.get('/api/feed/following', { preHandler: optionalAuth }, async (request) => {
    const { cursor, limit: limitStr } = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(limitStr) || 10, 20);
    const userId = request.user?.userId;
    if (!userId) {
      return { success: true, data: [], hasMore: false };
    }

    const followingIds = db.select({ followingId: schema.follows.followingId })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId))
      .all()
      .map(f => f.followingId);

    if (followingIds.length === 0) {
      return { success: true, data: [], hasMore: false };
    }

    const rows = db.select()
      .from(schema.videos)
      .innerJoin(schema.users, eq(schema.videos.userId, schema.users.id))
      .where(
        and(
          eq(schema.videos.status, 'active'),
          inArray(schema.videos.userId, followingIds),
          cursor ? sql`${schema.videos.id} < ${Number(cursor)}` : undefined,
        )
      )
      .orderBy(desc(schema.videos.createdAt))
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    const videos = items.map((row: any) => {
      const like = userId ? db.select().from(schema.likes)
        .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, row.videos.id))).get() : null;
      return buildVideoWithUser(row.videos, row.users, !!like);
    });

    return {
      success: true,
      data: videos,
      cursor: hasMore && items.length > 0 ? String(items[items.length - 1].videos.id) : undefined,
      hasMore,
    };
  });

  // Trending feed
  app.get('/api/feed/trending', { preHandler: optionalAuth }, async (request) => {
    const { cursor, limit: limitStr } = request.query as { cursor?: string; limit?: string };
    const limit = Math.min(Number(limitStr) || 10, 20);
    const userId = request.user?.userId;

    const rows = db.select()
      .from(schema.videos)
      .innerJoin(schema.users, eq(schema.videos.userId, schema.users.id))
      .where(
        and(
          eq(schema.videos.status, 'active'),
          cursor ? sql`${schema.videos.id} < ${Number(cursor)}` : undefined,
        )
      )
      .orderBy(
        sql`(${schema.videos.likeCount} * 2 + ${schema.videos.commentCount} * 3) DESC`,
        desc(schema.videos.id)
      )
      .limit(limit + 1)
      .all();

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);

    const videos = items.map((row: any) => {
      let isLiked = false;
      if (userId) {
        const like = db.select().from(schema.likes)
          .where(and(eq(schema.likes.userId, userId), eq(schema.likes.videoId, row.videos.id))).get();
        isLiked = !!like;
      }
      return buildVideoWithUser(row.videos, row.users, isLiked);
    });

    return {
      success: true,
      data: videos,
      cursor: hasMore && items.length > 0 ? String(items[items.length - 1].videos.id) : undefined,
      hasMore,
    };
  });

  // Record view
  app.post('/api/videos/:id/view', { preHandler: requireAuth }, async (request) => {
    const videoId = Number((request.params as { id: string }).id);
    const userId = request.user!.userId;
    const { watchedSeconds } = request.body as { watchedSeconds?: number };

    const existing = db.select().from(schema.videoViews)
      .where(and(eq(schema.videoViews.userId, userId), eq(schema.videoViews.videoId, videoId))).get();

    if (existing) {
      if (watchedSeconds && watchedSeconds > existing.watchedSeconds) {
        db.update(schema.videoViews).set({ watchedSeconds })
          .where(and(eq(schema.videoViews.userId, userId), eq(schema.videoViews.videoId, videoId))).run();
      }
    } else {
      db.insert(schema.videoViews).values({ userId, videoId, watchedSeconds: watchedSeconds || 0 }).run();
      db.update(schema.videos).set({ viewCount: sql`view_count + 1` }).where(eq(schema.videos.id, videoId)).run();
    }

    return { success: true };
  });
}
