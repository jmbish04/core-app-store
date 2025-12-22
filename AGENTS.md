# AGENTS.md - Core App Store

## Project Overview

**Core App Store** is a production-ready multipage application for managing Cloudflare Workers and Pages apps with health monitoring, AI insights, and automated workflows.

**Tech Stack:**
- Backend: Cloudflare Worker with Hono
- Frontend: React + Vite + shadcn/ui + Tailwind
- Database: D1 (SQLite)
- Cache: KV
- AI: Worker AI (Llama 3.1)
- GitHub Integration: Octokit
- Type Safety: TypeScript + Zod

## Architecture

### Monorepo Structure

```
core-app-store/
├── src/                    # Backend (Cloudflare Worker)
│   ├── index.ts           # Entry point
│   ├── routes/            # Hono API routes
│   ├── modules/           # Core services
│   │   ├── cloudflare-api.ts  # CF API client
│   │   ├── github.ts          # GitHub/Octokit client
│   │   ├── database.ts        # D1 service layer
│   │   └── ai-service.ts      # Worker AI operations
│   └── workflows/         # Background jobs
│       ├── cron.ts
│       ├── refresh-inventory.ts
│       ├── health-checker.ts
│       └── log-insights.ts
├── frontend/              # React SPA
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # Reusable components
│       └── lib/          # API client & utilities
├── shared/               # Shared TypeScript types & Zod schemas
├── migrations/           # D1 database migrations
└── wrangler.toml        # Cloudflare configuration
```

### Key Features

1. **App Inventory Management**
   - Unified view of Workers + Pages projects
   - Health scoring (0-100) based on deployment frequency, activity, errors
   - AI categorization (prod, tooling, personal, infra, experiments)
   - Auto-generated tags and summaries

2. **Health Monitoring**
   - Status: Working / Broken / Unknown
   - Computed from: deployment timestamps, log activity, error rates
   - Cron-based refresh (every 15 min)

3. **AI Insights**
   - Log analysis with error extraction and suggested fixes
   - Auto-categorization of apps
   - App creation planning with module recommendations

4. **GitHub Integration**
   - Repository linking (manual or inferred)
   - Automated repo creation with scaffolding
   - AGENTS.md and PROMPT.md generation for new apps

5. **Create New App Wizard**
   - AI-assisted planning
   - GitHub repo creation
   - Scaffold generation (wrangler.toml, package.json, etc.)
   - Cloudflare project setup

## Database Schema

### Core Tables

- **apps**: Main app registry (Workers + Pages)
  - Health tracking: `health_status`, `health_score`, `health_reasons_json`
  - AI metadata: `category`, `tags_json`, `ai_summary`
  - Timestamps: `last_deployed_at`, `last_log_at`, `last_run_at`, `last_seen_at`

- **deployments**: Deployment history
- **log_events**: Sampled logs (structured)
- **log_insights**: AI-generated insights
- **app_visits**: User interaction tracking
- **github_repos**: Linked repositories
- **app_repo_links**: App-to-repo mapping
- **refresh_jobs**: Background job tracking

### Indexes

Optimized for:
- Fast starred app queries
- Health status filtering
- Time-based sorting (last_deployed_at, last_log_at)
- Pagination

## API Endpoints

### Apps
- `GET /api/apps` - List with filters/pagination
- `GET /api/apps/starred` - Dashboard data
- `GET /api/apps/:id` - App details
- `POST /api/apps/:id/star` - Toggle star
- `POST /api/apps/:id/refresh` - Refresh single app
- `GET /api/apps/:id/deployments` - Deployment history
- `GET /api/apps/:id/logs/insights` - AI insights
- `POST /api/apps/:id/repo/link` - Link repository

### System
- `GET /api/meta` - Stats & metadata
- `POST /api/refresh` - Trigger full inventory sync
- `POST /api/visit` - Track app visit

### Create New App
- `POST /api/new/plan` - Generate AI plan
- `POST /api/new/create-repo` - Create GitHub repo
- `POST /api/new/bootstrap` - Bootstrap repo files
- `POST /api/new/create-cloudflare` - Create CF app

## Workflows & Cron

### Cron Schedules

1. **Every 15 minutes** (`*/15 * * * *`)
   - Lightweight health refresh
   - Update health scores based on deployment/activity data

2. **Hourly** (`0 * * * *`)
   - Generate log insights for broken/recently active apps
   - Infer repo links from metadata

3. **Daily** (`0 2 * * *`)
   - Full inventory reconciliation
   - Sync all Workers and Pages projects
   - AI categorization for new apps

### Workflow Operations

**Refresh Inventory** (`refresh-inventory.ts`):
- Fetch Workers via CF API
- Fetch Pages projects via CF API
- Update D1 with latest metadata
- Run AI categorization for new/updated apps
- Track job status in `refresh_jobs` table

**Health Checker** (`health-checker.ts`):
- Calculate health scores (0-100)
- Factors: deployment freshness, activity, errors, deployment status
- Update `health_status` and `health_score`

**Log Insights** (`log-insights.ts`):
- Query recent log events
- Generate AI summaries using Worker AI
- Extract top errors with severity
- Store insights in `log_insights` table

## Frontend Structure

### Pages

1. **Landing (`/`)**
   - Hero section with stats
   - Starred apps grid
   - Recently active strip
   - Broken apps alert section

2. **All Apps (`/apps`)**
   - Advanced filtering: type, category, health, starred, has_repo
   - Search by name/description
   - Sort: name, deployed, health_score, updated_at
   - URL-synced filters (shareable)
   - Virtualized list for performance

3. **App Detail (`/apps/:id`)**
   - Health overview
   - Log insights (AI-generated)
   - Deployment history
   - Linked repos
   - Star toggle
   - Visit tracking

4. **Create New (`/new`)**
   - 5-step wizard: Basic → AI Planning → Repo → Bootstrap → Complete
   - AI plan generation with clarifying questions
   - GitHub repo creation
   - Automated scaffolding
   - Cloudflare project setup

### Components

**shadcn/ui** primitives:
- Button, Card, Badge, Input
- Proper focus rings, ARIA labels
- Keyboard navigation support

**Custom Components:**
- `HealthBadge`: Color-coded health status
- `AppCard`: Reusable app display

### API Client

- TanStack Query for caching & state management
- Zod schema validation
- Bearer token authentication
- Type-safe responses

## AI Behavior

### Categorization

**Input:**
- App name, description, deployed URL, README

**Output:**
```json
{
  "category": "prod",
  "tags": ["api", "rest", "gateway"],
  "summary": "API gateway for production services",
  "confidence": 0.85
}
```

### Log Insights

**Input:**
- App name, recent log samples (last 100 events)

**Output:**
```json
{
  "summary": "High error rate detected...",
  "top_errors": [
    {
      "error": "TypeError: Cannot read property 'x'",
      "count": 15,
      "severity": "high",
      "likely_cause": "Undefined object access"
    }
  ],
  "suggested_actions": [
    "Add null checks",
    "Review error handling"
  ],
  "severity": "high"
}
```

### Planning

**Input:**
- Name, type (worker/pages), description, conversation history

**Output:**
```json
{
  "plan": {
    "modules": [...],
    "endpoints": [...],
    "bindings": [...],
    "d1_schema": "...",
    "crons": [...]
  },
  "questions": ["Does it need authentication?"],
  "confidence": 0.8
}
```

## Development Workflow

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers/Pages enabled
- GitHub Personal Access Token (for repo creation)
- Wrangler CLI (`npm install -g wrangler`)

### Setup

```bash
# Install dependencies
npm install

# Create D1 database
npm run db:create

# Update wrangler.toml with database ID

# Run migrations
npm run db:migrate

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development
npm run dev
```

### Environment Variables

Required in `.env` or Wrangler secrets:
- `CLOUDFLARE_API_TOKEN`: CF API token with Workers/Pages read/write
- `CLOUDFLARE_ACCOUNT_ID`: Your CF account ID
- `GITHUB_TOKEN`: GitHub PAT with repo creation permissions
- `WORKER_API_KEY`: Secret key for API authentication
- `DEV_MODE`: Set to "true" for mocked CF API
- `MOCK_CLOUDFLARE_API`: Set to "true" to use mock data

### Development Mode

The project includes mock clients for development:
- `MockCloudflareAPIClient`: Returns sample Workers/Pages data
- `MockGitHubClient`: Simulates repo creation without API calls

Set `DEV_MODE=true` and `MOCK_CLOUDFLARE_API=true` to use mocks.

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build

# Deploy to Cloudflare
npm run deploy
```

## Security

- **Authentication**: Bearer token (`WORKER_API_KEY`)
- **RBAC Ready**: Structure supports admin/read-only roles (future)
- **Rate Limiting**: Apply to create endpoints
- **Audit Logging**: All create/delete/link actions logged to D1
- **Input Validation**: Zod schemas on all endpoints
- **Safe AI Prompts**: Deterministic, JSON-only outputs

## Performance Optimizations

- **No Live CF API Calls on UI Render**: All GET endpoints read from D1
- **KV Caching**: Cache CF API responses during refresh workflows
- **Pagination**: All list endpoints paginated
- **Debounced Search**: 300ms debounce on search input
- **Virtualized Lists**: Large app lists use virtual scrolling
- **Skeleton States**: Immediate feedback during loading
- **Reduced Motion Support**: Respects `prefers-reduced-motion`

## Accessibility

- Full keyboard navigation
- ARIA labels on interactive elements
- Focus rings on all focusable elements
- Proper heading hierarchy
- Color contrast compliance
- Screen reader support
- Reduced motion support

## Deployment

```bash
# Deploy backend
cd src
wrangler deploy

# Deploy frontend
cd frontend
npm run build
# Upload dist/ to Cloudflare Pages or serve via Worker
```

### Post-Deployment

1. Create D1 database: `wrangler d1 create core-app-store-db`
2. Update `wrangler.toml` with database ID
3. Run migrations: `wrangler d1 migrations apply core-app-store-db`
4. Create KV namespace: `wrangler kv:namespace create CACHE`
5. Update `wrangler.toml` with KV ID
6. Set secrets: `wrangler secret put WORKER_API_KEY`
7. Trigger initial refresh: `POST /api/refresh` with API key

## Agent Development Notes

### When Working on This Project

1. **Always read before modifying**: Read existing files before making changes
2. **Maintain type safety**: Use Zod schemas for all API boundaries
3. **Test with mocks first**: Use `DEV_MODE=true` for local development
4. **Update AGENTS.md**: Document architectural changes
5. **Migration-first**: Always create D1 migrations for schema changes
6. **AI safety**: Ensure AI outputs are validated and safe
7. **Cache invalidation**: Invalidate TanStack Query cache on mutations
8. **Error handling**: Always handle errors gracefully with user feedback

### Common Patterns

**Adding a new API endpoint:**
1. Define Zod schema in `shared/src/schemas/api.ts`
2. Add route in `src/routes/api.ts`
3. Update API client in `frontend/src/lib/api.ts`
4. Create TanStack Query hook in component

**Adding a new app field:**
1. Create migration in `migrations/`
2. Update `apps` table schema
3. Update Zod schemas in `shared/`
4. Update DatabaseService methods
5. Update frontend components

**Adding a new workflow:**
1. Create file in `src/workflows/`
2. Add cron schedule in `wrangler.toml`
3. Update `src/workflows/cron.ts` handler
4. Test with local wrangler: `wrangler dev`

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [Hono Framework](https://hono.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query/)
- [Octokit REST API](https://octokit.github.io/rest.js/)

## License

MIT
