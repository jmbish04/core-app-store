# Core App Store

A production-ready multipage application store for managing Cloudflare Workers and Pages apps with health monitoring, AI-powered insights, and automated deployment workflows.

![Tech Stack](https://img.shields.io/badge/Cloudflare-Workers-orange)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### Core Functionality

- **Unified App Inventory**: Manage all your Cloudflare Workers and Pages projects in one place
- **Health Monitoring**: Automatic health scoring (0-100) based on deployments, activity, and errors
- **AI-Powered Insights**: Automated categorization, tagging, log analysis, and error detection
- **GitHub Integration**: Automatic repository linking and inference from deployment metadata
- **Smart Search & Filters**: Powerful filtering by type, category, health status, and more
- **Real-time Updates**: Cron-based background refresh every 15 minutes
- **AI-Assisted Creation**: Create new apps with AI-generated architecture plans and scaffolding

### Health Monitoring

Apps are continuously monitored and scored based on:
- Deployment frequency and recency
- Log activity and errors
- Deployment success rate
- Uptime and availability

Status indicators:
- ✅ **Working** (score ≥ 70): Healthy and active
- ⚠️ **Unknown** (score 40-69): Limited data or moderate issues
- ❌ **Broken** (score < 40): Critical issues detected

### AI Capabilities

**Categorization**:
- Automatically categorizes apps: prod, tooling, personal, infra, experiments
- Generates descriptive tags based on name, description, and repository
- Creates one-sentence summaries

**Log Insights**:
- Analyzes recent logs to identify top errors
- Suggests likely causes and remediation actions
- Severity classification (low, medium, high, critical)

**App Planning**:
- Generates implementation plans for new apps
- Recommends module architecture and bindings
- Suggests reusable components from existing apps

## Architecture

### Tech Stack

**Backend (Cloudflare Worker)**:
- Framework: [Hono](https://hono.dev/) (lightweight, fast routing)
- Database: D1 (SQLite)
- Cache: KV
- AI: Worker AI (Llama 3.1 8B)
- GitHub: Octokit REST API
- Type Safety: Zod schemas

**Frontend (React SPA)**:
- Framework: React 18 + Vite
- UI: shadcn/ui + Tailwind CSS
- State: TanStack Query
- Routing: React Router v7
- Accessibility: Full WCAG 2.1 AA compliance

**Shared**:
- TypeScript 5
- Zod for runtime type validation
- Monorepo structure

### Project Structure

```
core-app-store/
├── src/                      # Backend (Cloudflare Worker)
│   ├── index.ts             # Worker entry point
│   ├── routes/              # API routes (Hono)
│   ├── modules/             # Core services
│   │   ├── cloudflare-api.ts   # Cloudflare API client
│   │   ├── github.ts           # GitHub/Octokit client
│   │   ├── database.ts         # D1 service layer
│   │   └── ai-service.ts       # Worker AI operations
│   └── workflows/           # Background jobs & cron
├── frontend/                # React frontend
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable UI components
│       └── lib/           # API client & utilities
├── shared/                 # Shared TypeScript types & Zod schemas
├── migrations/             # D1 database migrations
└── wrangler.toml          # Cloudflare configuration
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Cloudflare account with Workers/Pages enabled
- GitHub Personal Access Token (for repository operations)
- Wrangler CLI

```bash
npm install -g wrangler
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/core-app-store.git
cd core-app-store
```

2. **Install dependencies**

```bash
npm install
```

3. **Create Cloudflare D1 database**

```bash
wrangler d1 create core-app-store-db
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "core-app-store-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

4. **Create KV namespace**

```bash
wrangler kv:namespace create CACHE
```

Update `wrangler.toml` with the KV namespace ID.

5. **Run database migrations**

```bash
npm run db:migrate
```

6. **Configure environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Cloudflare API credentials
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id

# GitHub credentials
GITHUB_TOKEN=your_github_personal_access_token

# Worker API security
WORKER_API_KEY=your_secure_api_key

# Development mode (uses mocked API responses)
DEV_MODE=true
MOCK_CLOUDFLARE_API=true
```

**Getting your tokens**:
- **Cloudflare API Token**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) → API Tokens → Create Token (with Workers and Pages permissions)
- **Account ID**: Found in Cloudflare Dashboard → Workers & Pages → Overview
- **GitHub Token**: Go to [GitHub Settings](https://github.com/settings/tokens) → Personal Access Tokens → Generate new token (with `repo` scope)

7. **Set Wrangler secrets** (for production)

```bash
wrangler secret put WORKER_API_KEY
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put GITHUB_TOKEN
```

### Development

Start the development servers:

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
npm run dev:backend  # Backend on http://localhost:8787
npm run dev:frontend # Frontend on http://localhost:3000
```

The frontend will proxy API requests to the backend automatically.

### Development with Mock Data

For faster development without hitting real APIs, enable mock mode in `.env`:

```env
DEV_MODE=true
MOCK_CLOUDFLARE_API=true
```

This will use mock data for Cloudflare API calls and GitHub operations.

## Usage

### Dashboard

The landing page (`/`) shows:
- Overview statistics (total apps, health distribution)
- Starred apps
- Recently active apps
- Broken apps that need attention

### All Apps

Navigate to `/apps` to:
- Search apps by name or description
- Filter by type (Worker/Pages), category, health status, starred, has repo
- Sort by updated date, deployment date, health score, or name
- View detailed information for each app

### App Details

Click on any app to view:
- Health status and score
- AI-generated summary and tags
- Recent deployments
- Log insights (errors, suggested actions)
- Linked GitHub repositories
- Activity timestamps

### Create New App

Use the `/new` wizard to:
1. **Provide basic info**: Name, type (Worker/Pages), description
2. **Review AI plan**: Modules, endpoints, bindings recommended by AI
3. **Create repository**: Automatically create a GitHub repo
4. **Bootstrap**: Generate scaffold files (wrangler.toml, package.json, AGENTS.md, etc.)
5. **Deploy**: Get instructions for deploying to Cloudflare

## API Reference

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Apps

- `GET /api/apps` - List apps (supports filtering, sorting, pagination)
- `GET /api/apps/starred` - Get starred apps and dashboard data
- `GET /api/apps/:id` - Get app details
- `POST /api/apps/:id/star` - Toggle starred status
- `POST /api/apps/:id/refresh` - Refresh single app data
- `GET /api/apps/:id/deployments` - Get deployment history
- `GET /api/apps/:id/logs/insights` - Get AI-generated log insights
- `POST /api/apps/:id/repo/link` - Link a GitHub repository

### System

- `GET /api/meta` - Get system metadata and statistics
- `POST /api/refresh` - Trigger full inventory refresh
- `POST /api/visit` - Record app visit (for analytics)

### Create New App

- `POST /api/new/plan` - Generate AI implementation plan
- `POST /api/new/create-repo` - Create GitHub repository
- `POST /api/new/bootstrap` - Bootstrap repository with files
- `POST /api/new/create-cloudflare` - Create Cloudflare app

## Deployment

### Deploy Backend

```bash
cd src
wrangler deploy
```

### Deploy Frontend

Build the frontend:

```bash
cd frontend
npm run build
```

Deploy to Cloudflare Pages:

```bash
wrangler pages deploy dist
```

Or serve via the Worker by configuring static asset handling.

### Post-Deployment Setup

1. **Run migrations on production D1**:

```bash
wrangler d1 migrations apply core-app-store-db --remote
```

2. **Trigger initial inventory refresh**:

```bash
curl -X POST https://your-worker.workers.dev/api/refresh \
  -H "Authorization: Bearer YOUR_API_KEY"
```

3. **Verify cron triggers are active**:

Check your Worker's settings in the Cloudflare dashboard to ensure cron triggers are enabled.

## Cron Schedules

The app runs three background jobs:

- **Every 15 minutes**: Lightweight health score updates
- **Hourly**: Log insights generation for broken/active apps
- **Daily at 2 AM**: Full inventory reconciliation (syncs all Workers and Pages)

## Database Schema

Key tables:
- `apps`: Main app registry
- `deployments`: Deployment history
- `log_events`: Sampled log entries
- `log_insights`: AI-generated insights
- `github_repos`: Linked repositories
- `app_repo_links`: App-to-repo mappings
- `refresh_jobs`: Background job tracking
- `app_visits`: User interaction analytics

See [migrations/0001_initial_schema.sql](migrations/0001_initial_schema.sql) for full schema.

## Configuration

### Cloudflare Bindings

Edit `wrangler.toml` to configure:
- D1 database binding
- KV namespace binding
- Worker AI binding
- Cron triggers
- Environment variables

### Frontend Configuration

Edit `frontend/vite.config.ts` to configure:
- API proxy settings
- Build options
- Path aliases

## Development Tips

### Testing API Endpoints

Use the included `.env` file with `DEV_MODE=true` to test with mock data:

```bash
curl http://localhost:8787/api/apps \
  -H "Authorization: Bearer dev-key"
```

### Adding New Features

1. **Backend**: Add route in `src/routes/api.ts`
2. **Database**: Create migration in `migrations/`
3. **Schemas**: Define types in `shared/src/schemas/`
4. **Frontend**: Add API call in `frontend/src/lib/api.ts`
5. **UI**: Create component in `frontend/src/components/`

### Debugging

- Backend logs: `wrangler tail` (in production) or check console in dev
- Frontend: React DevTools + Network tab
- Database: `wrangler d1 execute core-app-store-db --command "SELECT * FROM apps"`

## Accessibility

This app is built with accessibility in mind:
- Full keyboard navigation support
- ARIA labels on all interactive elements
- Focus rings with proper contrast
- Reduced motion support (`prefers-reduced-motion`)
- Semantic HTML
- Screen reader compatible

## Security

- Bearer token authentication on all API endpoints
- Input validation with Zod schemas
- SQL injection protection (parameterized queries)
- Rate limiting ready (configure as needed)
- Audit logging for sensitive operations
- CORS configured for production domains

## Performance

- No blocking API calls on UI render (all data from D1)
- KV caching for Cloudflare API responses
- TanStack Query for client-side caching
- Debounced search inputs
- Virtualized lists for large datasets
- Optimized indexes on D1 tables
- Reduced bundle size with tree-shaking

## Troubleshooting

### "Unauthorized" errors

- Verify `WORKER_API_KEY` is set correctly in `.env` and Wrangler secrets
- Check the `Authorization` header format: `Bearer YOUR_KEY`

### Database errors

- Ensure migrations have been run: `npm run db:migrate`
- Check D1 database exists: `wrangler d1 list`
- Verify database ID in `wrangler.toml` matches your D1 instance

### Frontend not connecting to backend

- Check proxy configuration in `vite.config.ts`
- Ensure backend is running on port 8787
- Verify API_KEY in frontend `.env` file

### Cron jobs not running

- Cron triggers only work in production, not in `wrangler dev`
- Deploy to Workers and check logs: `wrangler tail`

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## Roadmap

- [ ] Real-time log streaming
- [ ] Custom dashboards and widgets
- [ ] Slack/Discord notifications for broken apps
- [ ] Multi-account support
- [ ] Advanced analytics and insights
- [ ] Cost tracking and optimization
- [ ] Automated rollback on deployment failures
- [ ] Integration with other cloud providers

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](./AGENTS.md)
- 🐛 [Issue Tracker](https://github.com/yourusername/core-app-store/issues)
- 💬 [Discussions](https://github.com/yourusername/core-app-store/discussions)

## Acknowledgments

- Built with [Cloudflare Workers](https://workers.cloudflare.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Hono](https://hono.dev/) and [React](https://react.dev/)
- AI by [Cloudflare Workers AI](https://ai.cloudflare.com/)

---

Made with ❤️ for the Cloudflare community
