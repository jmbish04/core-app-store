import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { CloudflareBindings } from './lib/cloudflare';
import appsRouter from './routes/apps';
import newAppRouter from './routes/new';
import { RefreshInventoryWorkflow } from './workflows/refresh';

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use('/api/*', cors());

app.route('/api/apps', appsRouter);
app.route('/api/new', newAppRouter);

app.post('/api/refresh', async (c) => {
    // Trigger workflow
    const instance = await c.env.REFRESH_WORKFLOW.create({
        params: { force: true }
    });
    return c.json({ id: instance.id, status: 'pending' });
});

// Mock endpoint for frontend development to get meta info
app.get('/api/meta', async (c) => {
    const appsCount = await c.env.DB.prepare('SELECT count(*) as count FROM apps').first('count');
    return c.json({
        totalApps: appsCount,
        lastRefresh: new Date().toISOString()
    });
});

// Serve frontend assets
app.use('/assets/*', serveStatic({ root: './public' }));
app.get('/*', serveStatic({ path: './public/app.html' }));

export default app;
export { RefreshInventoryWorkflow };
