import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@vide/shared';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/signup', async (request, reply) => {
    const { username, email, password, displayName } = request.body as {
      username: string; email: string; password: string; displayName?: string;
    };

    if (!username || !email || !password) {
      return reply.status(400).send({ success: false, error: 'Missing required fields' });
    }
    if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
      return reply.status(400).send({ success: false, error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters` });
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return reply.status(400).send({ success: false, error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
    }

    const existingEmail = db.select().from(schema.users)
      .where(eq(schema.users.email, email)).get();

    if (existingEmail) {
      return reply.status(409).send({ success: false, error: 'Email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const user = db.insert(schema.users).values({
      username,
      email,
      passwordHash,
      displayName: displayName || username,
    }).returning().get();

    const payload = { userId: user.id, username: user.username };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        accessToken,
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt },
      },
    };
  });

  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.status(400).send({ success: false, error: 'Missing required fields' });
    }

    const user = db.select().from(schema.users).where(eq(schema.users.email, email)).get();
    if (!user) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }

    const payload = { userId: user.id, username: user.username };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      data: {
        accessToken,
        user: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt },
      },
    };
  });

  app.post('/api/auth/refresh', async (request, reply) => {
    const token = request.cookies.refreshToken;
    if (!token) {
      return reply.status(401).send({ success: false, error: 'No refresh token' });
    }

    try {
      const payload = verifyRefreshToken(token);
      const user = db.select().from(schema.users).where(eq(schema.users.id, payload.userId)).get();
      if (!user) {
        return reply.status(401).send({ success: false, error: 'User not found' });
      }

      const newPayload = { userId: user.id, username: user.username };
      const accessToken = signAccessToken(newPayload);
      const refreshToken = signRefreshToken(newPayload);

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60,
      });

      return { success: true, data: { accessToken } };
    } catch {
      return reply.status(401).send({ success: false, error: 'Invalid refresh token' });
    }
  });

  app.post('/api/auth/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', { path: '/api/auth' });
    return { success: true };
  });

  app.get('/api/auth/me', { preHandler: requireAuth }, async (request) => {
    const user = db.select().from(schema.users).where(eq(schema.users.id, request.user!.userId)).get();
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    return {
      success: true,
      data: { id: user.id, username: user.username, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio, createdAt: user.createdAt },
    };
  });
}
