import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: 'Authentication required' });
  }

  try {
    const token = authHeader.slice(7);
    request.user = verifyAccessToken(token);
  } catch {
    return reply.status(401).send({ success: false, error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return;

  try {
    const token = authHeader.slice(7);
    request.user = verifyAccessToken(token);
  } catch {
    // Ignore invalid tokens for optional auth
  }
}
