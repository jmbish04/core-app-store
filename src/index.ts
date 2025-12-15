import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { WorkerEnv } from '@core-app-store/shared';
import { apiRoutes } from './routes/api';
import { handleCron } from './workflows/cron';

const app = new Hono<{ Bindings: WorkerEnv }>();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['https://core-app-store.hacolby.workers.dev', 'http://localhost:8787'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// API routes
app.route('/api', apiRoutes);

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Core App Store',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested resource was not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    ...(c.env.ENVIRONMENT === 'development' && { stack: err.stack }),
  }, 500);
});

export default {
  fetch: app.fetch,

  // Cron trigger handler
  async scheduled(event: ScheduledEvent, env: WorkerEnv, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleCron(event.cron, env));
  },
};
