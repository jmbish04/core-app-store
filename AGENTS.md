# AGENTS.md

## Core App Store

This repository contains the Core App Store, a centralized dashboard for managing Cloudflare Workers and Pages.

### Structure
- `src/`: Cloudflare Worker backend (Hono)
- `frontend/`: React + Vite frontend (shadcn/ui)
- `src/db/schema.sql`: D1 Database schema

### Setup
1. `npm install`
2. `cd frontend && npm install`
3. Configure `wrangler.toml` with your Cloudflare Account ID and D1/KV/AI bindings.

### Development
- Backend: `npm run dev`
- Frontend: `cd frontend && npm run dev`

### Deployment
- `npm run deploy` (deploys both Worker and Frontend assets)

## AI Instructions
- Use `src/lib/ai.ts` for AI interactions.
- Always use `c.env.DB` for database access.
- Ensure all new API endpoints are protected or public as intended.
