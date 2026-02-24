import { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, count, like, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export async function userRoutes(app: FastifyInstance) {
  // Get user profile
  app.get('/api/users/:username', { preHandler: optionalAuth }, async (request, reply) => {
    const { username } = request.params as { username: string };

    const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
    if (!user) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }

    const [followerCount] = db.select({ count: count() }).from(schema.follows)
      .where(eq(schema.follows.followingId, user.id)).all();
    const [followingCount] = db.select({ count: count() }).from(schema.follows)
      .where(eq(schema.follows.followerId, user.id)).all();
    const [videoCount] = db.select({ count: count() }).from(schema.videos)
      .where(and(eq(schema.videos.userId, user.id), eq(schema.videos.status, 'active'))).all();

    let isFollowing = false;
    if (request.user) {
      const follow = db.select().from(schema.follows)
        .where(and(eq(schema.follows.followerId, request.user.userId), eq(schema.follows.followingId, user.id))).get();
      isFollowing = !!follow;
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        followerCount: followerCount.count,
        followingCount: followingCount.count,
        videoCount: videoCount.count,
        isFollowing,
      },
    };
  });

  // Get user's videos
  app.get('/api/users/:username/videos', { preHandler: optionalAuth }, async (request) => {
    const { username } = request.params as { username: string };
    const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
    if (!user) return { success: true, data: [] };

    const videos = db.select().from(schema.videos)
      .where(and(eq(schema.videos.userId, user.id), eq(schema.videos.status, 'active')))
      .orderBy(desc(schema.videos.createdAt))
      .all();

    return { success: true, data: videos };
  });

  // Get user's liked videos
  app.get('/api/users/:username/likes', { preHandler: optionalAuth }, async (request) => {
    const { username } = request.params as { username: string };
    const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
    if (!user) return { success: true, data: [] };

    const rows = db.select()
      .from(schema.likes)
      .innerJoin(schema.videos, eq(schema.likes.videoId, schema.videos.id))
      .where(and(eq(schema.likes.userId, user.id), eq(schema.videos.status, 'active')))
      .orderBy(desc(schema.likes.createdAt))
      .all();

    const videos = rows.map((r: any) => r.videos);
    return { success: true, data: videos };
  });

  // Follow user
  app.post('/api/users/:username/follow', { preHandler: requireAuth }, async (request, reply) => {
    const { username } = request.params as { username: string };
    const targetUser = db.select().from(schema.users).where(eq(schema.users.username, username)).get();

    if (!targetUser) {
      return reply.status(404).send({ success: false, error: 'User not found' });
    }
    if (targetUser.id === request.user!.userId) {
      return reply.status(400).send({ success: false, error: 'Cannot follow yourself' });
    }

    const existing = db.select().from(schema.follows)
      .where(and(eq(schema.follows.followerId, request.user!.userId), eq(schema.follows.followingId, targetUser.id))).get();

    if (existing) {
      return reply.status(409).send({ success: false, error: 'Already following' });
    }

    db.insert(schema.follows).values({ followerId: request.user!.userId, followingId: targetUser.id }).run();
    return { success: true };
  });

  // Edit profile
  app.patch('/api/users/me', { preHandler: requireAuth }, async (request, reply) => {
    const { displayName, bio } = request.body as { displayName?: string; bio?: string };
    const updates: Record<string, any> = {};

    if (displayName !== undefined) updates.displayName = displayName.slice(0, 30) || null;
    if (bio !== undefined) updates.bio = bio.slice(0, 150) || null;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ success: false, error: 'No fields to update' });
    }

    db.update(schema.users).set(updates).where(eq(schema.users.id, request.user!.userId)).run();
    const user = db.select().from(schema.users).where(eq(schema.users.id, request.user!.userId)).get();

    return {
      success: true,
      data: user ? { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt } : null,
    };
  });

  // Unfollow user
  app.delete('/api/users/:username/follow', { preHandler: requireAuth }, async (request) => {
    const { username } = request.params as { username: string };
    const targetUser = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
    if (!targetUser) return { success: true };

    db.delete(schema.follows)
      .where(and(eq(schema.follows.followerId, request.user!.userId), eq(schema.follows.followingId, targetUser.id))).run();
    return { success: true };
  });

  // Get user profile by ID
  app.get('/api/users/by-id/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return reply.status(400).send({ success: false, error: 'Invalid user ID' });

    const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) return reply.status(404).send({ success: false, error: 'User not found' });

    const [followerCount] = db.select({ count: count() }).from(schema.follows)
      .where(eq(schema.follows.followingId, user.id)).all();
    const [followingCount] = db.select({ count: count() }).from(schema.follows)
      .where(eq(schema.follows.followerId, user.id)).all();
    const [videoCount] = db.select({ count: count() }).from(schema.videos)
      .where(and(eq(schema.videos.userId, user.id), eq(schema.videos.status, 'active'))).all();

    let isFollowing = false;
    if (request.user) {
      const follow = db.select().from(schema.follows)
        .where(and(eq(schema.follows.followerId, request.user.userId), eq(schema.follows.followingId, user.id))).get();
      isFollowing = !!follow;
    }

    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        followerCount: followerCount.count,
        followingCount: followingCount.count,
        videoCount: videoCount.count,
        isFollowing,
      },
    };
  });

  // Get user's videos by ID
  app.get('/api/users/by-id/:id/videos', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return reply.status(400).send({ success: false, error: 'Invalid user ID' });

    const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) return { success: true, data: [] };

    const videos = db.select().from(schema.videos)
      .where(and(eq(schema.videos.userId, user.id), eq(schema.videos.status, 'active')))
      .orderBy(desc(schema.videos.createdAt))
      .all();

    return { success: true, data: videos };
  });

  // Get user's liked videos by ID
  app.get('/api/users/by-id/:id/likes', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = parseInt(id, 10);
    if (isNaN(userId)) return reply.status(400).send({ success: false, error: 'Invalid user ID' });

    const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
    if (!user) return { success: true, data: [] };

    const rows = db.select()
      .from(schema.likes)
      .innerJoin(schema.videos, eq(schema.likes.videoId, schema.videos.id))
      .where(and(eq(schema.likes.userId, user.id), eq(schema.videos.status, 'active')))
      .orderBy(desc(schema.likes.createdAt))
      .all();

    const videos = rows.map((r: any) => r.videos);
    return { success: true, data: videos };
  });

  // Follow user by ID
  app.post('/api/users/by-id/:id/follow', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) return reply.status(400).send({ success: false, error: 'Invalid user ID' });

    const targetUser = db.select().from(schema.users).where(eq(schema.users.id, targetUserId)).get();
    if (!targetUser) return reply.status(404).send({ success: false, error: 'User not found' });
    if (targetUser.id === request.user!.userId) return reply.status(400).send({ success: false, error: 'Cannot follow yourself' });

    const existing = db.select().from(schema.follows)
      .where(and(eq(schema.follows.followerId, request.user!.userId), eq(schema.follows.followingId, targetUser.id))).get();
    if (existing) return reply.status(409).send({ success: false, error: 'Already following' });

    db.insert(schema.follows).values({ followerId: request.user!.userId, followingId: targetUser.id }).run();
    return { success: true };
  });

  // Unfollow user by ID
  app.delete('/api/users/by-id/:id/follow', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const targetUserId = parseInt(id, 10);
    if (isNaN(targetUserId)) return reply.status(400).send({ success: false, error: 'Invalid user ID' });

    const targetUser = db.select().from(schema.users).where(eq(schema.users.id, targetUserId)).get();
    if (!targetUser) return { success: true };

    db.delete(schema.follows)
      .where(and(eq(schema.follows.followerId, request.user!.userId), eq(schema.follows.followingId, targetUser.id))).run();
    return { success: true };
  });

  // Search users and videos
  app.get('/api/search', { preHandler: optionalAuth }, async (request) => {
    const { q } = request.query as { q?: string };
    const query = (q || '').trim();
    const pattern = `%${query}%`;

    // Hashtag search: if query starts with #
    const isHashtagSearch = query.startsWith('#');
    const hashtagQuery = isHashtagSearch ? query.replace(/^#/, '').toLowerCase() : '';

    const users = (!isHashtagSearch && query)
      ? db.select({
          id: schema.users.id,
          username: schema.users.username,
          displayName: schema.users.displayName,
          avatarUrl: schema.users.avatarUrl,
        })
        .from(schema.users)
        .where(sql`${schema.users.username} LIKE ${pattern} OR ${schema.users.displayName} LIKE ${pattern}`)
        .all()
      : [];

    let videos: any[] = [];
    let matchedHashtags: string[] = [];

    if (isHashtagSearch && hashtagQuery) {
      // Search by hashtag name
      const hashtagPattern = `%${hashtagQuery}%`;
      const tags = db.select().from(schema.hashtags)
        .where(sql`${schema.hashtags.name} LIKE ${hashtagPattern}`)
        .all();

      matchedHashtags = tags.map(t => t.name);

      if (tags.length > 0) {
        const tagIds = tags.map(t => t.id);
        const videoIds = db.select({ videoId: schema.videoHashtags.videoId })
          .from(schema.videoHashtags)
          .where(inArray(schema.videoHashtags.hashtagId, tagIds))
          .all()
          .map(r => r.videoId);

        const uniqueIds = [...new Set(videoIds)];
        videos = uniqueIds.length > 0
          ? db.select().from(schema.videos)
              .where(and(inArray(schema.videos.id, uniqueIds), eq(schema.videos.status, 'active')))
              .orderBy(desc(schema.videos.createdAt))
              .all()
          : [];
      }
    } else if (query) {
      // Normal search: title/description + hashtag matching
      const titleVideos = db.select().from(schema.videos)
        .where(sql`(${schema.videos.title} LIKE ${pattern} OR ${schema.videos.description} LIKE ${pattern}) AND ${schema.videos.status} = 'active'`)
        .orderBy(desc(schema.videos.createdAt))
        .all();

      // Also search hashtags for the query
      const tags = db.select().from(schema.hashtags)
        .where(sql`${schema.hashtags.name} LIKE ${pattern}`)
        .all();

      matchedHashtags = tags.map(t => t.name);

      let hashtagVideoIds: number[] = [];
      if (tags.length > 0) {
        const tagIds = tags.map(t => t.id);
        hashtagVideoIds = db.select({ videoId: schema.videoHashtags.videoId })
          .from(schema.videoHashtags)
          .where(inArray(schema.videoHashtags.hashtagId, tagIds))
          .all()
          .map(r => r.videoId);
      }

      // Merge and deduplicate
      const titleVideoIds = new Set(titleVideos.map(v => v.id));
      const extraIds = hashtagVideoIds.filter(id => !titleVideoIds.has(id));
      const extraVideos = extraIds.length > 0
        ? db.select().from(schema.videos)
            .where(and(inArray(schema.videos.id, extraIds), eq(schema.videos.status, 'active')))
            .orderBy(desc(schema.videos.createdAt))
            .all()
        : [];

      videos = [...titleVideos, ...extraVideos];
    }

    return { success: true, data: { users, videos, hashtags: matchedHashtags } };
  });
}
