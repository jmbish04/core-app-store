import { Hono } from 'hono';
import type { WorkerEnv } from '@core-app-store/shared';
import {
  appsQuerySchema,
  deploymentsQuerySchema,
  starToggleRequestSchema,
  linkRepoRequestSchema,
  createAppPlanRequestSchema,
  createRepoRequestSchema,
  bootstrapRequestSchema,
  createCloudflareAppRequestSchema,
} from '@core-app-store/shared';
import { DatabaseService } from '../modules/database';
import { CloudflareAPIClient, MockCloudflareAPIClient } from '../modules/cloudflare-api';
import { GitHubClient, MockGitHubClient } from '../modules/github';
import { AIService } from '../modules/ai-service';
import { nanoid } from 'nanoid';

export const apiRoutes = new Hono<{ Bindings: WorkerEnv }>();

// Authentication middleware
apiRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token || token !== c.env.WORKER_API_KEY) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or missing API key' }, 401);
  }

  await next();
});

// GET /api/apps - List apps with filtering and pagination
apiRoutes.get('/apps', async (c) => {
  try {
    const query = appsQuerySchema.parse({
      page: c.req.query('page'),
      per_page: c.req.query('per_page'),
      search: c.req.query('search'),
      type: c.req.query('type'),
      category: c.req.query('category'),
      health: c.req.query('health'),
      starred: c.req.query('starred'),
      has_repo: c.req.query('has_repo'),
      sort_by: c.req.query('sort_by'),
      sort_order: c.req.query('sort_order'),
    });

    const db = new DatabaseService(c.env.DB);
    const { apps, total } = await db.getApps(query);

    const totalPages = Math.ceil(total / query.per_page);

    return c.json({
      data: apps,
      pagination: {
        page: query.page,
        per_page: query.per_page,
        total,
        total_pages: totalPages,
      },
    });
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// GET /api/apps/starred - Get starred apps and dashboard data
apiRoutes.get('/apps/starred', async (c) => {
  try {
    const db = new DatabaseService(c.env.DB);
    const data = await db.getStarredApps();
    return c.json(data);
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// GET /api/apps/:id - Get app details
apiRoutes.get('/apps/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseService(c.env.DB);
    const app = await db.getApp(id);

    if (!app) {
      return c.json({ error: 'Not Found', message: 'App not found' }, 404);
    }

    return c.json(app);
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/apps/:id/star - Toggle starred status
apiRoutes.post('/apps/:id/star', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { starred } = starToggleRequestSchema.parse(body);

    const db = new DatabaseService(c.env.DB);
    await db.updateAppStarred(id, starred);

    return c.json({ success: true, starred });
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// POST /api/apps/:id/refresh - Refresh single app
apiRoutes.post('/apps/:id/refresh', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseService(c.env.DB);
    const app = await db.getApp(id);

    if (!app) {
      return c.json({ error: 'Not Found', message: 'App not found' }, 404);
    }

    // Refresh this specific app
    const useMock = c.env.MOCK_CLOUDFLARE_API === 'true';
    const cfClient = useMock
      ? new MockCloudflareAPIClient()
      : new CloudflareAPIClient({
          apiToken: c.env.CLOUDFLARE_API_TOKEN,
          accountId: c.env.CLOUDFLARE_ACCOUNT_ID,
        });

    // TODO: Implement single app refresh logic
    // For now, just return success
    return c.json({ success: true, message: 'App refresh queued' });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// GET /api/apps/:id/deployments - Get app deployments
apiRoutes.get('/apps/:id/deployments', async (c) => {
  try {
    const id = c.req.param('id');
    const query = deploymentsQuerySchema.parse({
      page: c.req.query('page'),
      per_page: c.req.query('per_page'),
    });

    const db = new DatabaseService(c.env.DB);
    const { deployments, total } = await db.getDeployments(id, query.page, query.per_page);

    const totalPages = Math.ceil(total / query.per_page);

    return c.json({
      data: deployments.map(d => ({
        ...d,
        metadata: d.metadata_json ? JSON.parse(d.metadata_json) : undefined,
      })),
      pagination: {
        page: query.page,
        per_page: query.per_page,
        total,
        total_pages: totalPages,
      },
    });
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// GET /api/apps/:id/logs/insights - Get AI-generated log insights
apiRoutes.get('/apps/:id/logs/insights', async (c) => {
  try {
    const id = c.req.param('id');
    const db = new DatabaseService(c.env.DB);
    const insight = await db.getLogInsight(id);

    if (!insight) {
      return c.json(null);
    }

    return c.json({
      ...insight,
      top_errors: insight.top_errors_json ? JSON.parse(insight.top_errors_json) : undefined,
      suggested_actions: insight.suggested_actions_json ? JSON.parse(insight.suggested_actions_json) : undefined,
      model_info: insight.model_info_json ? JSON.parse(insight.model_info_json) : undefined,
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/apps/:id/repo/link - Manually link a repo
apiRoutes.post('/apps/:id/repo/link', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { repo_url, link_type } = linkRepoRequestSchema.parse(body);

    const db = new DatabaseService(c.env.DB);
    await db.linkRepo(id, repo_url, link_type);

    return c.json({ success: true, message: 'Repo linked successfully' });
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// POST /api/refresh - Trigger full inventory refresh
apiRoutes.post('/refresh', async (c) => {
  try {
    // Create refresh job
    const jobId = nanoid();
    const query = `
      INSERT INTO refresh_jobs (id, status, started_at)
      VALUES (?, 'pending', ?)
    `;
    await c.env.DB.prepare(query).bind(jobId, new Date().toISOString()).run();

    // TODO: Trigger workflow for background refresh
    // For now, just return the job ID

    return c.json({
      job_id: jobId,
      status: 'pending',
      message: 'Inventory refresh queued',
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// GET /api/meta - Get metadata and statistics
apiRoutes.get('/meta', async (c) => {
  try {
    const db = new DatabaseService(c.env.DB);
    const meta = await db.getMeta();
    return c.json(meta);
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/visit - Record app visit
apiRoutes.post('/visit', async (c) => {
  try {
    const body = await c.req.json();
    const { app_id, path } = body;

    if (!app_id || !path) {
      return c.json({ error: 'Bad Request', message: 'app_id and path are required' }, 400);
    }

    const db = new DatabaseService(c.env.DB);
    const userAgent = c.req.header('User-Agent');
    await db.recordVisit(app_id, path, userAgent);

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/new/plan - Generate AI plan for new app
apiRoutes.post('/new/plan', async (c) => {
  try {
    const body = await c.req.json();
    const input = createAppPlanRequestSchema.parse(body);

    const ai = new AIService(c.env.AI);
    const result = await ai.generatePlan(input);

    return c.json(result);
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// POST /api/new/create-repo - Create GitHub repository
apiRoutes.post('/new/create-repo', async (c) => {
  try {
    const body = await c.req.json();
    const input = createRepoRequestSchema.parse(body);

    const useMock = c.env.DEV_MODE === 'true';
    const github = useMock
      ? new MockGitHubClient()
      : new GitHubClient({ token: c.env.GITHUB_TOKEN });

    const repo = await github.createRepo({
      name: input.name,
      org: input.org,
      private: input.private,
      description: input.description,
      auto_init: false,
    });

    return c.json({
      repo_id: repo.id.toString(),
      full_name: repo.full_name,
      url: repo.url,
      clone_url: repo.clone_url,
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/new/bootstrap - Bootstrap repo with files
apiRoutes.post('/new/bootstrap', async (c) => {
  try {
    const body = await c.req.json();
    const input = bootstrapRequestSchema.parse(body);

    const useMock = c.env.DEV_MODE === 'true';
    const github = useMock
      ? new MockGitHubClient()
      : new GitHubClient({ token: c.env.GITHUB_TOKEN });

    const [owner, repo] = input.repo_full_name.split('/');

    // Generate files based on plan
    const files = generateBootstrapFiles(input.plan);

    await github.createFiles(owner, repo, files);

    return c.json({
      success: true,
      files_created: files.map(f => f.path),
      message: 'Repository bootstrapped successfully',
    });
  } catch (error: any) {
    return c.json({ error: 'Internal Error', message: error.message }, 500);
  }
});

// POST /api/new/create-cloudflare - Create Cloudflare Worker/Pages project
apiRoutes.post('/new/create-cloudflare', async (c) => {
  try {
    const body = await c.req.json();
    const input = createCloudflareAppRequestSchema.parse(body);

    // TODO: Implement Cloudflare app creation
    // For now, return mock response
    const appId = nanoid();

    return c.json({
      app_id: appId,
      cf_id: `cf-${appId}`,
      type: input.type,
      name: input.name,
      deployed_url: null,
      next_steps: [
        'Clone the repository',
        'Install dependencies: npm install',
        'Configure wrangler.toml with your account details',
        'Deploy: npm run deploy',
      ],
    });
  } catch (error: any) {
    return c.json({ error: 'Bad Request', message: error.message }, 400);
  }
});

// Helper function to generate bootstrap files
function generateBootstrapFiles(plan: any): Array<{ path: string; content: string; message: string }> {
  const files: Array<{ path: string; content: string; message: string }> = [];

  // AGENTS.md
  files.push({
    path: 'AGENTS.md',
    content: generateAgentsMd(plan),
    message: 'Add AGENTS.md for agentic development',
  });

  // PROMPT.md
  files.push({
    path: 'PROMPT.md',
    content: generatePromptMd(plan),
    message: 'Add PROMPT.md with project context',
  });

  // README.md
  files.push({
    path: 'README.md',
    content: generateReadmeMd(plan),
    message: 'Add README.md',
  });

  // wrangler.toml
  if (plan.type === 'worker') {
    files.push({
      path: 'wrangler.toml',
      content: generateWranglerToml(plan),
      message: 'Add wrangler.toml configuration',
    });
  }

  // package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(plan),
    message: 'Add package.json',
  });

  // Basic index file
  if (plan.type === 'worker') {
    files.push({
      path: 'src/index.ts',
      content: generateWorkerIndex(plan),
      message: 'Add Worker entry point',
    });
  }

  return files;
}

function generateAgentsMd(plan: any): string {
  return `# Agent Development Guide

## Project Overview
${plan.description}

## Architecture
Type: ${plan.type}

### Modules
${plan.modules.map((m: any) => `- **${m.name}**: ${m.purpose}${m.reuse_from ? ` (reuse from ${m.reuse_from})` : ''}`).join('\n')}

### Bindings
${plan.bindings.map((b: any) => `- **${b.name}** (${b.type}): ${b.purpose}`).join('\n')}

${plan.endpoints ? `### Endpoints\n${plan.endpoints.map((e: any) => `- \`${e.method} ${e.path}\`: ${e.purpose}`).join('\n')}` : ''}

## Development Workflow

1. Install dependencies: \`npm install\`
2. Run local development: \`npm run dev\`
3. Run tests: \`npm test\`
4. Deploy: \`npm run deploy\`

## Agentic Development Notes

When working with AI agents:
- Follow the module structure defined above
- Reuse existing modules where indicated
- Maintain consistent error handling
- Add tests for new functionality
- Update this file when architecture changes
`;
}

function generatePromptMd(plan: any): string {
  return `# ${plan.name}

${plan.description}

## Purpose
This ${plan.type} application is designed to ${plan.description.toLowerCase()}.

## Technical Details

**Type**: Cloudflare ${plan.type === 'worker' ? 'Worker' : 'Pages'}

**Bindings**:
${plan.bindings.map((b: any) => `- ${b.type}: ${b.name}`).join('\n')}

${plan.d1_schema ? `**Database Schema**:\n\`\`\`sql\n${plan.d1_schema}\n\`\`\`` : ''}

${plan.crons ? `**Cron Schedules**:\n${plan.crons.map((c: any) => `- ${c}`).join('\n')}` : ''}

## Implementation Plan

${plan.modules.map((m: any, i: number) => `${i + 1}. Implement **${m.name}** module: ${m.purpose}`).join('\n')}

## Next Steps

- [ ] Set up development environment
- [ ] Implement core modules
- [ ] Add tests
- [ ] Configure bindings in wrangler.toml
- [ ] Deploy to Cloudflare
`;
}

function generateReadmeMd(plan: any): string {
  return `# ${plan.name}

${plan.description}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy
npm run deploy
\`\`\`

## Configuration

Update \`wrangler.toml\` with your Cloudflare account details and binding IDs.

## Architecture

This is a Cloudflare ${plan.type === 'worker' ? 'Worker' : 'Pages'} application with the following components:

${plan.modules.map((m: any) => `- **${m.name}**: ${m.purpose}`).join('\n')}

## License

MIT
`;
}

function generateWranglerToml(plan: any): string {
  return `name = "${plan.name}"
main = "src/index.ts"
compatibility_date = "2024-12-14"

${plan.bindings.filter((b: any) => b.type === 'D1').map((b: any) => `
[[d1_databases]]
binding = "${b.name}"
database_name = "${plan.name}-db"
database_id = "YOUR_DATABASE_ID"
`).join('\n')}

${plan.bindings.filter((b: any) => b.type === 'KV').map((b: any) => `
[[kv_namespaces]]
binding = "${b.name}"
id = "YOUR_KV_ID"
`).join('\n')}

${plan.bindings.some((b: any) => b.type === 'AI') ? `[ai]\nbinding = "AI"` : ''}

${plan.crons && plan.crons.length > 0 ? `[triggers]\ncrons = ${JSON.stringify(plan.crons)}` : ''}
`;
}

function generatePackageJson(plan: any): string {
  return JSON.stringify({
    name: plan.name,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'wrangler dev',
      deploy: 'wrangler deploy',
      test: 'vitest',
    },
    dependencies: {
      hono: '^4.6.14',
    },
    devDependencies: {
      '@cloudflare/workers-types': '^4.20241127.0',
      typescript: '^5.7.2',
      wrangler: '^3.96.0',
      vitest: '^2.1.8',
    },
  }, null, 2);
}

function generateWorkerIndex(plan: any): string {
  return `import { Hono } from 'hono';

const app = new Hono();

${plan.endpoints ? plan.endpoints.map((e: any) => `
// ${e.purpose}
app.${e.method.toLowerCase()}('${e.path}', async (c) => {
  return c.json({ message: 'TODO: Implement ${e.path}' });
});
`).join('\n') : ''}

app.get('/', (c) => {
  return c.json({
    name: '${plan.name}',
    description: '${plan.description}',
    status: 'ok',
  });
});

export default app;
`;
}
