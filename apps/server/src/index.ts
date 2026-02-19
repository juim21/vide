import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import { resolve } from 'path';
import { mkdirSync } from 'fs';
import { authRoutes } from './routes/auth.js';
import { videoRoutes } from './routes/videos.js';
import { feedRoutes } from './routes/feed.js';
import { userRoutes } from './routes/users.js';

// Run migration on startup
import { migrate } from './db/migrate.js';
migrate();

const app = Fastify({ logger: true });

// Ensure upload directories exist
const dataDir = resolve(process.cwd(), 'data/uploads');
mkdirSync(resolve(dataDir, 'videos'), { recursive: true });
mkdirSync(resolve(dataDir, 'thumbnails'), { recursive: true });

// Plugins
await app.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
await app.register(cookie);
await app.register(multipart, {
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
if (process.env.NODE_ENV === 'production') {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });
}

// Static file serving for uploaded media
await app.register(staticPlugin, {
  root: resolve(dataDir, 'videos'),
  prefix: '/media/videos/',
  decorateReply: false,
});
await app.register(staticPlugin, {
  root: resolve(dataDir, 'thumbnails'),
  prefix: '/media/thumbnails/',
  decorateReply: false,
});

// Routes
await app.register(authRoutes);
await app.register(videoRoutes);
await app.register(feedRoutes);
await app.register(userRoutes);

// Health check
app.get('/api/health', async () => ({ status: 'ok' }));

// Start server
const port = Number(process.env.PORT) || 3001;
try {
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
