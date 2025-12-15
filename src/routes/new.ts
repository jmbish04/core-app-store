import { Hono } from 'hono';
import { CloudflareBindings, CloudflareClient } from '../lib/cloudflare';
import { GitHubClient } from '../lib/github';
import { AiClient } from '../lib/ai';

const app = new Hono<{ Bindings: CloudflareBindings }>();

// POST /api/new/plan
app.post('/plan', async (c) => {
    const { description } = await c.req.json();
    const ai = new AiClient(c.env.AI);
    const plan = await ai.planNewApp(description);
    return c.json(plan);
});

// POST /api/new/create-repo
app.post('/create-repo', async (c) => {
    const { name, visibility, description, githubToken } = await c.req.json();
    if (!githubToken) return c.json({ error: 'GitHub token required' }, 400);

    const gh = new GitHubClient(githubToken);
    try {
        const repo = await gh.createRepo(name, visibility === 'private', description);
        return c.json(repo);
    } catch (e: any) {
        return c.json({ error: e.message }, 500);
    }
});

// POST /api/new/bootstrap
app.post('/bootstrap', async (c) => {
    // Write scaffolding files to the repo
    const { owner, repo, githubToken, plan } = await c.req.json();
    if (!githubToken) return c.json({ error: 'GitHub token required' }, 400);

    const gh = new GitHubClient(githubToken);

    // Example: Create AGENTS.md
    await gh.createFile(owner, repo, 'AGENTS.md',
        `# AGENTS.md\n\n## Plan\n${JSON.stringify(plan, null, 2)}`,
        'Initialize AGENTS.md'
    );

    // Example: Create wrangler.toml
    await gh.createFile(owner, repo, 'wrangler.toml',
        `name = "${repo}"\nmain = "src/index.ts"\ncompatibility_date = "2024-04-01"`,
        'Initialize wrangler.toml'
    );

    return c.json({ success: true });
});

export default app;
