import { Hono } from 'hono';
import { CloudflareBindings } from '../lib/cloudflare';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// GET /api/apps
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM apps ORDER BY last_deployed_at DESC').all();
  return c.json(results);
});

// GET /api/apps/starred
app.get('/starred', async (c) => {
    // Try KV first for speed
    const cached = await c.env.KV.get('starred_apps', 'json');
    if (cached) return c.json(cached);

    const { results } = await c.env.DB.prepare('SELECT * FROM apps WHERE starred = 1').all();
    // Cache for 1 minute
    await c.env.KV.put('starred_apps', JSON.stringify(results), { expirationTtl: 60 });
    return c.json(results);
});

// GET /api/apps/:id
app.get('/:id', async (c) => {
    const id = c.req.param('id');
    const app = await c.env.DB.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first();
    if (!app) return c.notFound();
    return c.json(app);
});

// POST /api/apps/:id/star
app.post('/:id/star', async (c) => {
    const id = c.req.param('id');
    const { starred } = await c.req.json();

    await c.env.DB.prepare('UPDATE apps SET starred = ? WHERE id = ?').bind(starred ? 1 : 0, id).run();
    await c.env.KV.delete('starred_apps'); // Invalidate cache

    return c.json({ success: true });
});

export default app;
